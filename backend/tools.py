"""Catalogue access for the API and the read-only tools the shopping agent can call."""

import difflib
import json
import re
import sqlite3
from contextlib import closing
from dataclasses import dataclass, field
from pathlib import Path

from pydantic_ai import ModelRetry, RunContext

from models import (
    CatalogueOverview,
    Category,
    CategorySummary,
    PriceQuote,
    ProductCard,
    ProductDetail,
    ProductInfo,
    SearchHit,
    SearchResult,
    ShopperProfile,
    SizeAvailability,
    StockReport,
    StockStatus,
)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "campus_customs.db"
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
MAX_RESULTS = 10
MAX_LOOKUP = 10  # product_ids per get_product_info / get_price / check_stock call
LOW_STOCK_MAX = 5
STUB_MARKER = "filename-based stub"


def connect(write: bool = False) -> sqlite3.Connection:
    uri = DB_PATH.as_uri() if write else f"{DB_PATH.as_uri()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


# ---------- Catalogue loading ----------


def category_of(garment_type: str) -> Category:
    g = garment_type.lower()
    if "t-shirt" in g:
        return "t-shirt"
    if "quarter-zip" in g:
        return "quarter-zip"
    if "jacket" in g:
        return "jacket"
    if "hood" in g:
        return "hoodie"
    if "crewneck" in g:
        return "crewneck"
    if "mockneck" in g:
        return "mockneck"
    return "long-sleeve shirt"


def load_products(product_ids: list[str] | None = None) -> list[ProductDetail]:
    """Products with live per-size stock, in catalogue name order (or in the order of product_ids)."""
    where, params = "", ()
    if product_ids is not None:
        if not product_ids:
            return []
        where, params = f"WHERE product_id IN ({','.join('?' * len(product_ids))})", tuple(product_ids)
    with closing(connect()) as conn:
        rows = conn.execute(f"SELECT * FROM catalogue {where} ORDER BY name", params).fetchall()
        stock_rows = conn.execute(
            f"SELECT product_id, size, quantity FROM inventory {where}", params
        ).fetchall()
    stock: dict[str, list[dict]] = {}
    for s in stock_rows:
        stock.setdefault(s["product_id"], []).append({"size": s["size"], "quantity": s["quantity"]})
    products = []
    for r in rows:
        inventory = sorted(
            stock.get(r["product_id"], []),
            key=lambda s: SIZE_ORDER.index(s["size"]) if s["size"] in SIZE_ORDER else len(SIZE_ORDER),
        )
        products.append(
            ProductDetail(
                product_id=r["product_id"],
                name=r["name"],
                category=category_of(r["garment_type"]),
                garment_type=r["garment_type"],
                description=r["description"],
                details_available=bool(json.loads(r["colors"])) and STUB_MARKER not in r["description"],
                colors=json.loads(r["colors"]),
                search_tags=json.loads(r["search_tags"]),
                image_url=f"/media/{r['image_file_path']}",
                price=r["price"],
                inventory=inventory,
                total_stock=sum(s["quantity"] for s in inventory),
            )
        )
    if product_ids is not None:
        by_id = {p.product_id: p for p in products}
        products = [by_id[i] for i in product_ids if i in by_id]
    return products


def product_cards(product_ids: list[str]) -> list[ProductCard]:
    return [ProductCard(**p.model_dump()) for p in load_products(product_ids)]


def garment_colour(p: ProductDetail) -> str | None:
    return p.colors[0] if p.colors else None


def stock_status(quantity: int) -> StockStatus:
    if quantity == 0:
        return "sold_out"
    return "low_stock" if quantity <= LOW_STOCK_MAX else "in_stock"


def search_hit(p: ProductDetail) -> SearchHit:
    return SearchHit(
        product_id=p.product_id,
        name=p.name,
        category=category_of(p.garment_type),
        garment_colour=garment_colour(p),
        price=p.price,
        sizes_in_stock=[s.size for s in p.inventory if s.quantity > 0],
        sold_out_sizes=[s.size for s in p.inventory if s.quantity == 0],
    )


def product_info(p: ProductDetail) -> ProductInfo:
    details = p.details_available
    return ProductInfo(
        product_id=p.product_id,
        name=p.name,
        category=category_of(p.garment_type),
        garment_type=p.garment_type,
        garment_colour=garment_colour(p),
        print_colours=p.colors[1:],
        description=p.description if details else None,
        details_available=details,
        price=p.price,
    )


def stock_report(p: ProductDetail, size: str | None) -> StockReport:
    sizes = [SizeAvailability(size=s.size, quantity=s.quantity, status=stock_status(s.quantity)) for s in p.inventory]
    total = sum(s.quantity for s in sizes)
    requested = None
    if total == 0:
        summary = f"{p.name} is SOLD OUT in every size."
    else:
        in_stock = ", ".join(f"{s.size} ({s.quantity})" for s in sizes if s.quantity > 0)
        sold_out = [s.size for s in sizes if s.quantity == 0]
        summary = f"{p.name}: in stock in {in_stock}." + (f" SOLD OUT in {', '.join(sold_out)}." if sold_out else "")
    if size:
        key = size.upper().strip()
        requested = next((s for s in sizes if s.size == key), None)
        if requested is None:
            requested = SizeAvailability(size=key, quantity=0, status="not_offered")
            summary = f"{p.name} is not made in size {key}; sizes offered are {', '.join(SIZE_ORDER)}. " + summary
        elif requested.status == "sold_out":
            summary = f"Size {key} of {p.name} is SOLD OUT (0 units). " + summary
        else:
            summary = f"Size {key} of {p.name}: {requested.quantity} units in stock. " + summary
    return StockReport(
        product_id=p.product_id,
        name=p.name,
        sizes=sizes,
        total_units=total,
        sold_out_everywhere=total == 0,
        requested_size=requested,
        summary=summary,
    )


def lookup(product_ids: list[str]) -> list[ProductDetail]:
    """Load products by id, or make the model retry with ids from search_products."""
    ids = list(dict.fromkeys(i.strip() for i in product_ids if i.strip()))[:MAX_LOOKUP]
    if not ids:
        raise ModelRetry("Pass at least one product_id from search_products.")
    found = load_products(ids)
    missing = sorted(set(ids) - {p.product_id for p in found})
    if missing:
        raise ModelRetry(f"Unknown product_id(s): {', '.join(missing)}. Use search_products to find the right ids.")
    return found


# ---------- Agent tools ----------


@dataclass
class AgentDeps:
    """Per-request context. Records every product, price and stock number the tools returned in this turn,
    so the final reply can be checked against them."""

    shopper: ShopperProfile
    user_message: str
    page_note: str | None = None  # server-verified description of the page the shopper is on
    redactions: list[str] = field(default_factory=list)  # kinds of sensitive data masked out of this message
    seen: dict[str, float] = field(default_factory=dict)
    prices: set[float] = field(default_factory=set)
    quantities: set[int] = field(default_factory=set)
    searches: dict[str, list[str]] = field(default_factory=dict)  # search_id -> every matching product_id, in order

    def remember(self, products: list[ProductDetail], with_stock: bool = False) -> None:
        self.seen.update({p.product_id: p.price for p in products})
        self.prices.update(p.price for p in products)
        if with_stock:
            for p in products:
                self.quantities.update(s.quantity for s in p.inventory)
                self.quantities.add(p.total_stock)


SYNONYMS = {"tee": "t-shirt", "tees": "t-shirt", "tshirt": "t-shirt", "tshirts": "t-shirt", "hoody": "hoodie",
            "hoodies": "hoodie", "grey": "gray", "sweater": "sweatshirt", "sweaters": "sweatshirt",
            "jumper": "sweatshirt", "crew-neck": "crewneck", "zipup": "full-zip", "1/4": "quarter-zip",
            "quarterzip": "quarter-zip", "bulldogs": "bulldog", "longsleeve": "long-sleeve"}
# Multi-word phrases rewritten before splitting into words.
PHRASES = {"the game": "harvard", "harvard yale game": "harvard", "harvard-yale": "harvard", "zip up": "full-zip",
           "zip-up": "full-zip", "full zip": "full-zip", "quarter zip": "quarter-zip", "1/4 zip": "quarter-zip",
           "half zip": "quarter-zip", "long sleeve": "long-sleeve", "t shirt": "t-shirt", "crew neck": "crewneck",
           "mock neck": "mockneck"}
STOPWORDS = {"a", "an", "and", "the", "for", "in", "of", "on", "with", "any", "do", "you", "have", "i", "me",
             "my", "some", "something", "want", "looking", "show", "is", "are", "it", "this", "that", "or", "to"}
# Words on (nearly) every product: they don't narrow a search, so they neither filter nor score.
LOW_SIGNAL = {"yale", "campus", "customs", "merch", "merchandise", "apparel", "clothing", "gear", "university"}
FUZZY_CUTOFF = 0.75


def _terms(text: str) -> list[str]:
    text = " " + text.lower() + " "
    for phrase, replacement in PHRASES.items():
        text = text.replace(f" {phrase} ", f" {replacement} ")
    words = re.findall(r"[a-z0-9/'-]+", text)
    return list(dict.fromkeys(SYNONYMS.get(w, w) for w in words if w not in STOPWORDS))


def _term_hits(term: str, haystack: str) -> bool:
    return term in haystack or (len(term) > 3 and term.endswith("s") and term[:-1] in haystack)


def _vocab(haystacks: list[str]) -> list[str]:
    return sorted({w for h in haystacks for w in re.findall(r"[a-z][a-z'-]{2,}", h)})


def _correct_spelling(terms: list[str], haystacks: list[str]) -> tuple[list[str], dict[str, str]]:
    """Swap any term that appears in no product for the closest catalogue word ('hoddie' -> 'hoodie'). When the
    other terms already match some products, look in those products first ('timothy dwite' -> 'dwight', not
    'white'), with a slightly looser cutoff because the context makes a wrong guess unlikely."""
    unknown = {t for t in terms if len(t) > 3 and not any(_term_hits(t, h) for h in haystacks)}
    known = [t for t in terms if t not in unknown]
    context = [h for h in haystacks if any(_term_hits(t, h) for t in known)] if known else []
    fixed, corrections = [], {}
    for t in terms:
        if t in unknown:
            match = (difflib.get_close_matches(t, _vocab(context), n=1, cutoff=FUZZY_CUTOFF - 0.05) if context else [])
            match = match or difflib.get_close_matches(t, _vocab(haystacks), n=1, cutoff=FUZZY_CUTOFF)
            if match:
                corrections[t] = match[0]
                t = match[0]
        fixed.append(t)
    return fixed, corrections


def _relevance(terms: list[str], p: ProductDetail) -> tuple[int, int]:
    """(how many query terms the product matches, weighted score): name 3, tags 2, anything else 1."""
    name, tags = p.name.lower(), " ".join(p.search_tags).lower()
    rest = " ".join([p.garment_type, p.description, *p.colors]).lower()
    covered, score = 0, 0
    for t in terms:
        weight = 3 if _term_hits(t, name) else 2 if _term_hits(t, tags) else 1 if _term_hits(t, rest) else 0
        covered += weight > 0
        score += weight
    if len(terms) > 1 and " ".join(terms) in name:
        score += 3  # the whole query appears in the product name, e.g. "brooks brothers"
    return covered, score


def find_products(
    query: str | None = None,
    category: Category | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
    min_price: float | None = None,
) -> tuple[list[ProductDetail], list[ProductDetail], dict[str, str]]:
    """Typo-tolerant catalogue search shared by the agent tool and the website's search box.
    Returns (ranked matches, matches sold out only in the requested size, spelling corrections)."""
    catalogue = load_products()
    terms = [t for t in _terms(query) if t not in LOW_SIGNAL] if query else []
    corrections: dict[str, str] = {}
    if terms:
        haystacks = [" ".join([p.name, p.garment_type, p.description, *p.colors, *p.search_tags]).lower()
                     for p in catalogue]
        terms, corrections = _correct_spelling(terms, haystacks)
    min_cover = (len(terms) + 1) // 2  # a product must match at least half the query terms
    color_term = SYNONYMS.get(color.lower().strip(), color.lower().strip()) if color else None
    size_key = size.upper().strip() if size else None
    scored, sold_out_in_size = [], []
    for p in catalogue:
        if category and p.category != category:
            continue
        # colors[0] is the garment colour; later entries are print/trim, which don't make an item "that colour".
        if color_term and not (p.colors and color_term in p.colors[0].lower()):
            continue
        size_sold_out = bool(size_key) and not any(s.size == size_key and s.quantity > 0 for s in p.inventory)
        if max_price is not None and p.price > max_price:
            continue
        if min_price is not None and p.price < min_price:
            continue
        rank = (0, 0)
        if terms:
            rank = _relevance(terms, p)
            if rank[0] < min_cover:
                continue
        (sold_out_in_size if size_sold_out else scored).append((rank, p))
    if terms:
        # Prefer products matching every term; fall back to partial matches only when nothing matches them all.
        best_cover = max((r[0] for r, _ in scored + sold_out_in_size), default=0)
        scored = [(r, p) for r, p in scored if r[0] == best_cover]
        sold_out_in_size = [(r, p) for r, p in sold_out_in_size if r[0] == best_cover]
    # Best coverage first, then score, then items with stock before sold-out ones, then name.
    scored.sort(key=lambda rp: (-rp[0][0], -rp[0][1], rp[1].total_stock == 0, rp[1].name))
    sold_out_in_size.sort(key=lambda rp: (-rp[0][0], -rp[0][1], rp[1].name))
    # Only keep near-exact matches so a size filter can't hide the item the shopper named.
    best = scored[0][0] if scored else (0, 0)
    hidden = [p for r, p in sold_out_in_size if r >= best][:5]
    return [p for _, p in scored], hidden, corrections


def search_products(
    ctx: RunContext[AgentDeps],
    query: str | None = None,
    category: Category | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
    min_price: float | None = None,
) -> SearchResult:
    """Find products and their product_ids. Returns name, category, garment colour, price and which sizes are in
    stock or sold out (no quantities), plus a search_id. Tolerates typos and common synonyms. Use get_product_info,
    get_price or check_stock on the ids for details. To show every match of this search on the website, put its
    search_id in page_results.

    Args:
        query: Free-text keywords, e.g. "hockey", "bulldog", "harvard yale game", "champion". Leave empty to browse.
        category: Restrict to one kind of garment.
        color: A colour word, e.g. "gray", "navy", "white". Matches the garment colour, not print colours.
        size: One of XS, S, M, L, XL, XXL. `products` then holds only items with that size in stock; matches that
            are sold out in that size are listed separately in `sold_out_in_requested_size`.
        max_price: Highest price in USD.
        min_price: Lowest price in USD.
    """
    matches, hidden, corrections = find_products(query, category, color, size, max_price, min_price)
    top = matches[:MAX_RESULTS]
    search_id = f"s{len(ctx.deps.searches) + 1}"
    ctx.deps.searches[search_id] = [p.product_id for p in matches]
    ctx.deps.remember(top)
    ctx.deps.remember(hidden, with_stock=True)
    ctx.deps.quantities.add(len(matches))  # "we have 20 matching tees" is a count the tool returned, not invented
    prices = [p.price for p in matches]
    ctx.deps.prices.update(prices)
    return SearchResult(
        search_id=search_id,
        spelling_corrections=corrections,
        total_matches=len(matches),
        price_min=min(prices, default=None),
        price_max=max(prices, default=None),
        products=[search_hit(p) for p in top],
        sold_out_in_requested_size=[search_hit(p) for p in hidden],
    )


def get_product_info(ctx: RunContext[AgentDeps], product_ids: list[str]) -> list[ProductInfo]:
    """Product descriptions: what each item is, its garment colour, print colours, catalogue description and price.
    Use it before describing a product's look, design or features.

    Args:
        product_ids: One or more product_id values from search_products (up to 10).
    """
    products = lookup(product_ids)
    ctx.deps.remember(products)
    return [product_info(p) for p in products]


def get_price(ctx: RunContext[AgentDeps], product_ids: list[str]) -> list[PriceQuote]:
    """Exact current prices in USD. Use it for any question about price, cost or comparing prices.

    Args:
        product_ids: One or more product_id values from search_products (up to 10).
    """
    products = lookup(product_ids)
    ctx.deps.remember(products)
    return [PriceQuote(product_id=p.product_id, name=p.name, price=p.price) for p in products]


def check_stock(ctx: RunContext[AgentDeps], product_ids: list[str], size: str | None = None) -> list[StockReport]:
    """Live stock from the inventory table: units on hand for every size, with a status of in_stock, low_stock,
    sold_out or not_offered. Call it before stating whether anything is available, and always when the shopper asks
    about a specific size.

    Args:
        product_ids: One or more product_id values from search_products (up to 10).
        size: The size the shopper asked about (XS, S, M, L, XL or XXL), if any.
    """
    products = lookup(product_ids)
    ctx.deps.remember(products, with_stock=True)
    return [stock_report(p, size) for p in products]


def catalogue_overview(ctx: RunContext[AgentDeps]) -> CatalogueOverview:
    """What the shop carries overall: product categories with counts and price ranges, every garment colour, and the
    sizes offered. Use it for broad questions and to confirm whether a colour exists at all."""
    products = load_products()
    by_cat: dict[str, list[float]] = {}
    for p in products:
        by_cat.setdefault(category_of(p.garment_type), []).append(p.price)
    ctx.deps.prices.update(p.price for p in products)
    return CatalogueOverview(
        product_count=len(products),
        categories=[
            CategorySummary(category=c, product_count=len(v), price_min=min(v), price_max=max(v))
            for c, v in sorted(by_cat.items(), key=lambda kv: -len(kv[1]))
        ],
        garment_colours=sorted({p.colors[0].lower() for p in products if p.colors}),
        sizes=SIZE_ORDER,
    )


def get_shopper_profile(ctx: RunContext[AgentDeps]) -> ShopperProfile:
    """Who is chatting: whether they're logged in, and if so their first and last name, email, member-since date
    and how many messages are in their saved chat history. Use it when the shopper asks who they are, which account
    they're using, or whether you remember them. It only ever returns the current shopper's own account."""
    return ctx.deps.shopper


AGENT_TOOLS = [search_products, get_product_info, get_price, check_stock, catalogue_overview, get_shopper_profile]
