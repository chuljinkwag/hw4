"""Campus Customs API: products, images, shopper accounts and the shopping-assistant chat.

Run from backend/:  uvicorn main:app --reload --port 8000
API docs:           http://127.0.0.1:8000/docs
"""

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import sqlite3
import time
from collections import OrderedDict, defaultdict
from contextlib import closing
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")  # before importing the agent, which reads PORTKEY_* settings

from argon2 import PasswordHasher  # noqa: E402
from argon2.exceptions import InvalidHashError, VerificationError  # noqa: E402
from fastapi import FastAPI, HTTPException, Query, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic_ai.exceptions import AgentRunError, ContentFilterError, ModelAPIError, ModelHTTPError  # noqa: E402
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

import agent  # noqa: E402
from models import (  # noqa: E402
    ChatHistoryItem,
    ChatRequest,
    ChatResponse,
    LoginRequest,
    PageResults,
    ProductSearchResponse,
    ProductDetail,
    RegisterRequest,
    ShopperProfile,
    User,
)
from tools import DATA_DIR, connect, find_products, load_products, product_cards  # noqa: E402

log = logging.getLogger("campus_customs")

# Without a configured secret, sessions still work but reset whenever the server restarts.
SESSION_SECRET = os.getenv("SESSION_SECRET") or secrets.token_urlsafe(48)
SESSION_MAX_AGE = 7 * 24 * 3600

# Argon2id (RFC 9106 low-memory profile): 64 MiB and 3 passes per guess make GPU/ASIC cracking expensive.
hasher = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=4)
LEGACY_ITERATIONS = 120_000  # seed rows use pbkdf2_sha256$<salt>$<hex digest>
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(16))

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60
failed_logins: dict[str, list[float]] = defaultdict(list)

MAX_PAGE_RESULTS = 48  # cards the page shows for one chat search
CHAT_LIMIT = 20  # messages per shopper per window, to cap model spend
CHAT_WINDOW_SECONDS = 5 * 60
chat_times: dict[str, list[float]] = defaultdict(list)
# Guests have no users row, so their conversation lives in server memory for the session only.
MAX_GUESTS = 500
# Shown when the model provider's safety filter blocks a message (e.g. jailbreak attempts).
FILTERED_REPLY = (
    "Sorry, I can't help with that one. I'm here for Campus Customs gear: hoodies, tees, sizes, colours "
    "and what's in stock. What can I help you find?"
)
guest_histories: "OrderedDict[str, list[ChatHistoryItem]]" = OrderedDict()


app = FastAPI(title="Campus Customs API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="cc_session",
    max_age=SESSION_MAX_AGE,
    same_site="lax",
    https_only=False,  # set True when served over HTTPS
)
# Mount only the images folder so the database file itself is never served.
app.mount("/media/products", StaticFiles(directory=DATA_DIR / "products"), name="products")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": agent.model_name()}


# ---------- Products ----------


@app.get("/api/products", response_model=list[ProductDetail])
def list_products() -> list[ProductDetail]:
    return load_products()


@app.get("/api/search", response_model=ProductSearchResponse)
def search(q: str = Query(min_length=1, max_length=100)) -> ProductSearchResponse:
    """The website's search box: same typo-tolerant ranking as the agent's search_products tool."""
    matches, _, corrections = find_products(q)
    return ProductSearchResponse(product_ids=[p.product_id for p in matches], spelling_corrections=corrections)


@app.get("/api/products/{product_id}", response_model=ProductDetail)
def get_product(product_id: str) -> ProductDetail:
    found = load_products([product_id])
    if not found:
        raise HTTPException(status_code=404, detail="Product not found")
    return found[0]


# ---------- Accounts ----------


def password_problems(password: str) -> list[str]:
    checks = [
        (len(password) >= 8, "at least 8 characters"),
        (len(password) <= 128, "no more than 128 characters"),
        (re.search(r"[a-z]", password), "a lowercase letter"),
        (re.search(r"[A-Z]", password), "an uppercase letter"),
        (re.search(r"\d", password), "a number"),
        (re.search(r"[^A-Za-z0-9]", password), "a symbol"),
    ]
    return [msg for ok, msg in checks if not ok]


def verify_password(stored: str, password: str) -> bool:
    if stored.startswith("pbkdf2_sha256$"):
        _, salt, digest = stored.split("$", 2)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), LEGACY_ITERATIONS).hex()
        return hmac.compare_digest(candidate, digest)
    try:
        return hasher.verify(stored, password)
    except (VerificationError, InvalidHashError):
        return False


def public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "first_name": row["first_name"], "last_name": row["last_name"], "email": row["email"]}


def current_user(request: Request) -> sqlite3.Row | None:
    user_id = request.session.get("user_id")
    if user_id is None:
        return None
    with closing(connect()) as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def throttle_key(request: Request, email: str) -> str:
    return f"{request.client.host if request.client else '-'}|{email}"


def recent(times: dict[str, list[float]], key: str, window: float) -> list[float]:
    cutoff = time.time() - window
    times[key] = [t for t in times[key] if t > cutoff]
    return times[key]


@app.post("/api/auth/register", response_model=User, status_code=201)
def register(body: RegisterRequest, request: Request) -> dict:
    first, last = body.first_name.strip(), body.last_name.strip()
    email = body.email.strip().lower()
    if not first or not last:
        raise HTTPException(400, "Please enter your first and last name.")
    if len(first) > 60 or len(last) > 60:
        raise HTTPException(400, "Names must be 60 characters or fewer.")
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise HTTPException(400, "Please enter a valid email address.")
    if problems := password_problems(body.password):
        raise HTTPException(400, "Password must contain " + ", ".join(problems) + ".")
    if body.password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")

    with closing(connect(write=True)) as conn:
        taken = HTTPException(409, "An account with this email already exists. Try logging in.")
        if conn.execute("SELECT 1 FROM users WHERE lower(email) = ?", (email,)).fetchone():
            raise taken
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
                (f"{first} {last}", email, hasher.hash(body.password), first, last),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            raise taken from None
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()

    request.session.clear()
    request.session["user_id"] = row["id"]
    return public_user(row)


@app.post("/api/auth/login", response_model=User)
def login(body: LoginRequest, request: Request) -> dict:
    email = body.email.strip().lower()
    key = throttle_key(request, email)
    if len(recent(failed_logins, key, LOCKOUT_SECONDS)) >= MAX_FAILED_LOGINS:
        raise HTTPException(429, "Too many failed attempts. Please wait 15 minutes and try again.")

    with closing(connect(write=True)) as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
        if row is None:
            verify_password(DUMMY_HASH, body.password)  # same work as a real check, so timing doesn't reveal emails
            ok = False
        else:
            ok = verify_password(row["password_hash"], body.password)
        if not ok:
            failed_logins[key].append(time.time())
            raise HTTPException(401, "Incorrect email or password.")
        if not row["password_hash"].startswith("$argon2id$") or hasher.check_needs_rehash(row["password_hash"]):
            conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hasher.hash(body.password), row["id"]))
            conn.commit()

    failed_logins.pop(key, None)
    request.session.clear()
    request.session["user_id"] = row["id"]
    return public_user(row)


@app.post("/api/auth/logout", status_code=204)
def logout(request: Request) -> None:
    request.session.clear()


@app.get("/api/auth/me", response_model=User)
def me(request: Request) -> dict:
    row = current_user(request)
    if row is None:
        request.session.pop("user_id", None)  # keep guest_id so a guest's chat survives
        raise HTTPException(401, "Not logged in.")
    return public_user(row)


# ---------- Chat ----------


def load_user_history(user_id: int) -> list[ChatHistoryItem]:
    with closing(connect()) as conn:
        rows = conn.execute(
            "SELECT role, content, products_json FROM chat_messages WHERE user_id = ? ORDER BY id", (user_id,)
        ).fetchall()
    items = []
    for r in rows:
        # Cards are rebuilt from live data so reopened chats never show stale prices or stock.
        ids = [p["product_id"] for p in json.loads(r["products_json"])] if r["products_json"] else []
        items.append(ChatHistoryItem(role=r["role"], content=r["content"], products=product_cards(ids)))
    return items


def shopper_profile(user: sqlite3.Row | None, history: list[ChatHistoryItem]) -> ShopperProfile:
    """What the agent may know about the person chatting. Built from the session's own users row, never from
    anything the model or browser supplies, so it can't be pointed at another customer."""
    if user is None:
        return ShopperProfile(logged_in=False, history_saved=False)
    return ShopperProfile(
        logged_in=True,
        first_name=user["first_name"],
        last_name=user["last_name"],
        email=user["email"],
        member_since=user["created_at"][:10],
        saved_messages=len(history),
        history_saved=True,
    )


def save_user_turn(user_id: int, message: str, response: ChatResponse) -> None:
    products_json = json.dumps([p.model_dump() for p in response.products]) if response.products else None
    with closing(connect(write=True)) as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)", (user_id, message)
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'assistant', ?, ?)",
            (user_id, response.reply, products_json),
        )
        conn.commit()


def guest_history(request: Request) -> list[ChatHistoryItem]:
    guest_id = request.session.setdefault("guest_id", secrets.token_urlsafe(16))
    history = guest_histories.setdefault(guest_id, [])
    guest_histories.move_to_end(guest_id)
    while len(guest_histories) > MAX_GUESTS:
        guest_histories.popitem(last=False)
    return history


@app.get("/api/chat/history", response_model=list[ChatHistoryItem])
def chat_history(request: Request) -> list[ChatHistoryItem]:
    user = current_user(request)
    if user:
        return load_user_history(user["id"])
    # Guests get no persistence: loading the page starts a fresh conversation (their old one is discarded).
    guest_history(request).clear()
    return []


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    user = current_user(request)
    # Mask cards, passwords, phone numbers etc. before the text reaches the model, the database or guest memory.
    message, redactions = agent.redact_sensitive(body.message.strip(), user["email"] if user else None)
    if not message:
        raise HTTPException(400, "Please type a message.")
    history = load_user_history(user["id"]) if user else guest_history(request)

    rate_key = f"user:{user['id']}" if user else f"guest:{request.session['guest_id']}"
    if len(recent(chat_times, rate_key, CHAT_WINDOW_SECONDS)) >= CHAT_LIMIT:
        raise HTTPException(429, "You're sending messages quickly. Please wait a few minutes and try again.")
    chat_times[rate_key].append(time.time())

    try:
        reply, tools_used, page_ids = await agent.run_chat(
            message, history, shopper_profile(user, history), body.page, redactions
        )
    except (ContentFilterError, ModelHTTPError) as exc:
        if not isinstance(exc, ContentFilterError) and "content_filter" not in str(exc.body):
            log.exception("Chat agent failed")
            raise HTTPException(502, "Our assistant is having trouble right now. Please try again in a moment.")
        log.warning("chat message blocked by the provider's content filter")
        return ChatResponse(reply=FILTERED_REPLY, products=[], user_message=message, redactions=redactions)
    except (AgentRunError, ModelAPIError, RuntimeError):
        log.exception("Chat agent failed")
        raise HTTPException(502, "Our assistant is having trouble right now. Please try again in a moment.")
    log.info("chat turn tools=%s cards=%s page=%s redacted=%s", tools_used, reply.product_ids, len(page_ids), redactions)

    page_results = None
    if reply.page_results and page_ids:
        page_results = PageResults(
            title=reply.page_results.title,
            total=len(page_ids),
            products=product_cards(page_ids[:MAX_PAGE_RESULTS]),
        )
    response = ChatResponse(
        reply=reply.reply,
        products=product_cards(reply.product_ids),
        page_results=page_results,
        user_message=message,
        redactions=redactions,
    )
    if user:
        save_user_turn(user["id"], message, response)
    else:
        history += [
            ChatHistoryItem(role="user", content=message),
            ChatHistoryItem(role="assistant", content=response.reply, products=response.products),
        ]
        del history[: -agent.HISTORY_MESSAGES]
    return response
