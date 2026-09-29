# Campus Customs — Yale Bulldog Blue storefront with an AI shopping assistant

MGT 409 Homework 4. This is a customer website for Campus Customs, with a React + Vite + TypeScript frontend and a FastAPI backend. The backend runs a PydanticAI agent (`gpt-5.6-terra` through Portkey) that answers honestly about price and stock from a local SQLite database. It can also put matching products on the page.

Shoppers can:
- browse and filter products;
- create an account and log in;
- chat about merchandise, and see matching items appear on the page.

## Repository layout

```
hw4/
├── AI_prompts.md            prompt log for every problem
├── requirements.txt         backend Python packages
├── .env.example             template for .env (placeholders only)
├── .gitignore               keeps .env, data/, .venv and node_modules out of git
├── README.md
├── frontend/                Vite + React + TypeScript app
├── backend/
│   ├── main.py              FastAPI app: products, search, auth, chat routes
│   ├── agent.py             PydanticAI agent wiring, reply checks, redaction, audit trail
│   ├── models.py            Pydantic types (tool results, chat replies, API)
│   ├── tools.py             read-only database tools the agent can call
│   └── prompts/prompt.md    system prompt: voice, answering rules, safety rules
├── output/
│   ├── harness.md           how the system works (models, tools, safety, specs)
│   ├── design.md            storefront design and why it helps buying
│   ├── usability.md         the four usability improvements
│   ├── audit_trail.json     append-only log of agent runs
│   ├── app_check.html       screenshot-based app check (open in a browser)
│   └── app_check_images/    screenshots used by app_check.html
└── data/                    NOT in git: place the data pack here
    ├── campus_customs.db
    └── products/            product images (paths match the catalogue table)
```

## Requirements

- Python 3.11 or newer (developed on 3.13).
- Node.js 20 or newer (developed on 24).
- A Portkey API key with access to `gpt-5.6-terra`.

## 1. Place the data pack

The database and images are not in the repository. Copy them into `data/` at the top of the project, so that these paths exist:

```
hw4/data/campus_customs.db
hw4/data/products/2025-yale-vs-harvard-t-shirt.jpg   (and the other product images)
```

## 2. Configure the environment

From the `hw4/` folder:

```bash
cp .env.example .env
```

Then edit `.env`:
- set `PORTKEY_API_KEY` to your key;
- set `SESSION_SECRET` to any long random string, e.g. the output of `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`;
- keep `PORTKEY_MODEL=gpt-5.6-terra`.

## 3. Run the backend (FastAPI, port 8000)

From the `hw4/` folder:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

The API is at http://127.0.0.1:8000. Interactive docs are at http://127.0.0.1:8000/docs, and `GET /api/health` should return `{"status":"ok","model":"gpt-5.6-terra"}`.

## 4. Run the frontend (Vite, port 5173)

In a second terminal, from the `hw4/` folder:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/media` to the backend on port 8000. To use a backend on another port, start the frontend with `API_URL=http://127.0.0.1:<port> npm run dev`.

**Test account:** `test@campuscustoms.yale.edu`, password `password`. You can also create your own account on the site.

## Things to try

- **Stock by size:** open a product and ask the chat "How many of these do you have left in size XL?". The answer comes from the live inventory.
- **Page results:** ask "What hoodies do you have?". The matching items appear as cards on the Products page, and each card opens its product page.
- **Filters:** on Products, use the search box (typos such as "hoddie" are corrected), category chips, colour, size and sort.
- **Chat history:** log in, chat, then log out and back in. Your conversation reloads.

## Troubleshooting

- **`address already in use` on port 8000:** another server is using the port. Stop it, or run the backend on another port and set `API_URL` for the frontend.
- **Chat says the assistant is having trouble:** check `PORTKEY_API_KEY` in `.env` and restart the backend.
- **Backend fails at startup looking for `data/products`:** the data pack isn't in `hw4/data/` (see step 1).

## Documentation

- **`output/harness.md`:** how the system works, including architecture, model fields and why they were chosen, tools, safety rules, loop limits and result caps, the audit trail, and verification.
- **`output/app_check.html`:** screenshots of the live app with database-checked captions.
- **`output/design.md`** and **`output/usability.md`:** the design and usability work.
