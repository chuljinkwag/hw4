# Usability Improvements

Four improvements were added to the running Campus Customs site: **two frontend** (F1, F3) and **two backend** (B2, B4). They were chosen from ten proposals. Each section below says what was added, why it helps shoppers or Campus Customs, and exactly where to see it in the app.

| # | Improvement | Type | Where to see it |
|---|---|---|---|
| F1 | Filter, sort and search bar on Products | Frontend | `/products` |
| F3 | Stock badges and clearer product information | Frontend | Every product card, and every product page |
| B2 | Typo-tolerant, smarter catalogue search | Backend | Chat ("do you have any hoddies?") and the Products search box |
| B4 | Sensitive-data redaction before the model and the database | Backend | Chat (type a test card number, e.g. `4111 1111 1111 1111`) |

Run the app with `uvicorn main:app --reload --port 8000` (from `backend/`, venv active) and `npm run dev` (from `frontend/`), then open http://localhost:5173.

---

## F1: Filter, sort and search bar on the Products page

**What was added** (`frontend/src/pages/Products.tsx`)

- **Search box.** Type a keyword and the grid narrows as you type. It calls a new `GET /api/search?q=` endpoint, which uses the same typo-tolerant search as the chatbot (B2). When a word is corrected, a note says so, e.g. "Showing results for **champion** (you typed 'champoin')".
- **Category chips.** All, T-shirts, Hoodies, Crewnecks, Quarter-zips, Jackets, Long-sleeve and Mocknecks. The categories are normalised on the server from 22 inconsistent `garment_type` labels.
- **Colour filter.** Navy, Gray, White & cream, Coral. It matches the **garment** colour, so a navy hoodie with white lettering is not listed under "White".
- **In stock in size.** XS to XXL. It shows only items with at least one unit in that size.
- **Sort.** Featured, Price low→high, Price high→low, Name A→Z.
- **Live result count** ("Showing 12 of 102"), a **Clear filters** link, and a friendly **empty state** that also suggests asking the chat assistant.
- **Filters are kept in the URL** (e.g. `/products?category=hoodie&size=L&colour=Navy&sort=price-desc`). Opening a product and pressing Back returns you to exactly the same filtered grid, and a filtered view can be bookmarked or shared.
- **Works on phones.** Chips wrap, and the dropdowns sit two per row at phone width.

**Why it helps**

- **Shoppers:** with 102 items, the only way to narrow the catalogue before was the chat. Many shoppers just want to click "Hoodies, size L, navy" and see what's there, which now takes three clicks. The size filter is especially useful because stock is spread thin: 24% of size rows are sold out, so "in stock in my size" saves opening product after product.
- **Campus Customs:** shoppers find a product they can actually buy faster, and fewer of them leave after hitting sold-out sizes.

**Verified in the browser**

| Filter applied | Result | Database check |
|---|---|---|
| Hoodies | 27 of 102 | 27 hoodies ✓ |
| + In stock in L | 20 of 102 | 20 hoodies have L in stock ✓ |
| + Colour: Navy | 12 of 102 | 12 navy hoodies with L in stock ✓ |
| + Price high→low | $88 first, then $68 | ✓ |
| Search "champoin hoddie" | 2 Champion hoodies, with the correction note | ✓ |

Back from a product page restored `?category=hoodie&size=L&colour=Navy&sort=price-desc`, with the Hoodies chip active.

---

## F3: Stock badges and clearer product information

**What was added** (`frontend/src/components/ProductCard.tsx`, `frontend/src/pages/ProductPage.tsx`, helpers in `frontend/src/api.ts`)

- **Stock badge on every product card**, on the Products grid, the Home page and the grids the chat puts on the page:
  - **Sold out**: every size is at 0.
  - **Sold out in XS, XL**: one or two sizes are gone.
  - **Limited sizes**: three or more sizes are sold out.
  - **Low stock**: every size is available, but at least one has 5 or fewer units left.
  - No badge when everything is comfortably in stock, which keeps the grid uncluttered.
- **Low-stock sizes highlighted on the product page.** Sizes with 1–5 units get an amber tile reading "Only 2 left", in-stock sizes show their count, and sold-out sizes are struck through.
- **"Availability" line** on the product page, e.g. "Low stock" or "In stock in every size".
- **Honest colour line.** The page used to say "Colours: Navy Blue, White", which reads like a choice of two colours. It now says **"Colour: Navy blue with white print"**. The first catalogue colour is the garment, and the rest are the lettering or graphic on the same item.
- **Placeholder descriptions hidden.** Three catalogue rows have a leftover description ("Campus Customs product photo (…). Vision blocked; filename-based stub."). They now show "We don't have a written description for this item yet. The photo shows the design." in muted italics, and "Colour: Not listed. See the photo." The server flags these rows with a new `details_available` field.

**Why it helps**

- **Shoppers:**
  - They see scarcity and sold-out sizes before clicking, which saves time and disappointment.
  - "Only 2 left" helps them decide quickly.
  - The colour line no longer suggests a choice of colours that doesn't exist, so fewer people expect a colour they can't get.
  - The broken "Vision blocked…" text no longer appears anywhere on the site.
- **Campus Customs:**
  - Low-stock cues encourage timely purchases.
  - Accurate colour wording prevents returns and complaints, and looks professional.
  - The site's wording now matches the chatbot's rules (Problems 5–6), so the website and the assistant never contradict each other.

**Verified in the browser**

- Hoodie cards show "Sold out in XS", "Low stock" and "Sold out in XS, XL".
- The Basic Hoodie Big Yale page reads "Colour: Navy blue with white print · Availability: Low stock", with amber tiles for S (5), M (5) and XL ("Only 2 left"). This matches the database.
- The Benjamin Franklin T-shirt card and page show the placeholder message.
- A text search of the whole page for "Vision blocked" found nothing.

---

## B2: Typo-tolerant, smarter catalogue search

**What was added** (`backend/tools.py`: `find_products()`, used by the agent's `search_products` tool and by `GET /api/search`)

- **Spelling correction against the catalogue's own vocabulary.** A query word that matches no product is swapped for the closest word in the catalogue (Python `difflib`, similarity cutoff 0.75). Corrections are context-aware: when other words in the query already match some products, the closest word from **those** products wins. That way "timothy **dwite**" becomes "dwight", not the colour "white".
- **Corrections are reported, not hidden.** `SearchResult.spelling_corrections` (e.g. `{"hoddie": "hoodie"}`) goes to the agent, which says how it read the request ("we read that as hoodies"). The search box shows the same note.
- **More synonyms and phrases.**
  - Word synonyms: "sweater" or "jumper" → sweatshirt; "tee" → t-shirt.
  - Phrases: "zip up" or "full zip" → full-zip; "quarter zip", "1/4 zip" or "half zip" → quarter-zip; "crew neck" → crewneck; "the game" or "harvard yale game" → the Harvard–Yale shirt.
- **Better ranking.**
  - Words found on almost every product ("yale", "merch", "campus", "apparel"…) no longer count as matches. "Harvard yale" used to return 98 items; it now returns the one Harvard–Yale tee.
  - Products matching **every** query word are preferred, with partial matches used only as a fallback. "Champion hoodie" returns the 2 Champion hoodies instead of every hoodie plus every Champion item.
  - Matches in the name count most (×3), then tags (×2), then description and colour (×1). There's a bonus when the whole query appears in the name ("brooks brothers"), and in-stock items rank above sold-out ones.
- **The search logic is shared.** It lives in `find_products()`, so the chatbot and the website search box always return the same results.

**Why it helps**

- **Shoppers:**
  - Misspellings and unfamiliar names no longer produce "we don't carry that". This matters most for residential colleges, brands and nicknames the model doesn't know how to spell.
  - The results that come back are the relevant ones, not 98 loosely related items.
- **Campus Customs:**
  - Fewer false "we don't have it" answers means fewer lost sales.
  - The agent often gets what it needs in one search call instead of retrying, which keeps turns fast and cheap.

**Before and after** (same search tool, no model involved; the "before" figures were measured on 2026-09-28, before the change)

| Query | Before | After |
|---|---|---|
| `hoddie` | 0 | 27 hoodies (`hoddie → hoodie`) |
| `sweatsirt` | 0 | 59 sweatshirt-style items (`→ sweatshirt`) |
| `harvrd` | 0 | 1: 2025 Yale vs Harvard T-shirt |
| `harvard yale` | 98 (almost everything) | 1: 2025 Yale vs Harvard T-shirt |
| `the game` | 2, with the UA *Gameday* hood first | 1: 2025 Yale vs Harvard T-shirt |
| `champoin hoodie` | not measured | 2 Champion hoodies (`champoin → champion`) |
| `timothy dwite` | 1 | 1: Timothy Dwight College Crewneck (`dwite → dwight`) |
| `davenprot college` | not measured | 1: Davenport College Crewneck (`davenprot → davenport`) |
| `brookes brothers` | 3 | 6, with the 2 Brooks Brothers items ranked first |

**Live test with the chatbot** (`gpt-5.6-terra`)

| Shopper typed | Assistant |
|---|---|
| "do you have any hoddies?" | "we read that as hoodies. We have 27 Yale hoodies…"; all 27 put on the page |
| "anything from champoin?" | "Yes—Champion. We have 4 pieces…"; all 4 on the page (the catalogue has 4 Champion items ✓) |
| "I'm in Timothy Dwite college, anything for me?" | Found the Timothy Dwight College Crewneck, $58, in stock in M (12) and XXL (20) ✓ |
| "a shirt for the game against harvrd?" | 2025 Yale vs Harvard T-shirt, $32, "only 2 left in L" ✓ |

---

## B4: Sensitive-data redaction

**What was added** (`backend/agent.py`: `redact_sensitive()`; wired in `backend/main.py`'s `/api/chat`)

- **Masking before anything else happens.** Every chat message is scanned **before** it reaches the model, the database or the guest's session memory. Matches are replaced with placeholders:

  | Detected | Becomes |
  |---|---|
  | Payment card numbers, 13–19 digits with spaces or dashes allowed, confirmed with the **Luhn checksum** so product or order numbers aren't caught | `[card number removed]` |
  | Card security codes ("cvv 123", "security code 1234") | `cvv [removed]` |
  | Passwords and PINs stated in a message ("my password is …", "pin: …") | `password [removed]` |
  | US phone numbers, e.g. `(203) 555-0142`, `203.555.0142`, `+1 203 555 0142` | `[phone number removed]` |
  | Social Security numbers | `[SSN removed]` |
  | Email addresses **other than the shopper's own login email** | `[email removed]` |

- **The agent is told.** A per-turn instruction lists what was removed. The assistant briefly explains that it was removed for the shopper's safety, reminds them never to share it in chat, and still answers the rest of the message.
- **The shopper sees what was stored.** The API returns the masked `user_message` and a `redactions` list. The chat bubble is replaced with the masked text, and a small note underneath says "For your safety we removed your card number before sending. It was not saved."
- **No false alarms on normal shopping text.** Prices ("under $68"), sizes, quantities, "password rules", order numbers and 13-digit numbers that fail the Luhn check are all left alone.

**Why it helps**

- **Shoppers:** the site has no checkout, so shoppers try to buy through the chat ("my card is…"), ask for password resets ("my password is…") or leave contact details. Before this change, the agent answered politely, but the card number or password had already been sent to the model provider as plain text and, for logged-in shoppers, saved permanently in `chat_messages`. Now it never leaves the server.
- **Campus Customs:**
  - It is no longer storing card numbers or passwords in plaintext, which is a real liability. PCI DSS forbids storing card data like this.
  - Less personal data goes to a third-party AI provider.
  - Other customers' emails and phone numbers pasted into a chat aren't stored either.

**Live test** (`gpt-5.6-terra`, logged in as the test user)

| Shopper typed | Stored in `chat_messages` as | Assistant |
|---|---|---|
| "My card is 4111 1111 1111 1111, cvv 123. Please order the Basic Hoodie Big Yale in M." | "My card is [card number removed], cvv [removed]. Please order…" | "For your safety, we removed the card details—please never share card numbers or security codes in chat… size M has only 5 left. We can't place orders or take payment here…" |
| "…my password is Bulldog#2026. Can you reset it?" | "…my password [removed] Can you reset it?" | "your password was removed—please never share it in chat. We can't reset passwords…" |
| "Text me at 203-555-0142 when… back in XL. Also email my friend at friend.hw4@example.com" | "Text me at [phone number removed]… email my friend at [email removed]" | Explained the removal, that it can't send texts or emails, and that XL is sold out |

- A search of every row written during the test found **none** of the sensitive values (`4111`, `Bulldog#2026`, `555-0142`, `friend.hw4`, `cvv 123`).
- In the browser, a guest on the Basic Hoodie page typed "I'll take this in M, my card is 5555 5555 5555 4444". The bubble showed "[card number removed]", with the safety note underneath.
- The test rows were deleted afterwards.

**Limits (stated plainly)**

- This is pattern-based. It won't catch everything: a password typed without "password is", a street address, or unusual formats get through.
- Anything a shopper typed **before** this feature existed is not retroactively cleaned.
- Masking happens on the server, so the text does travel from the browser to our own backend over the site's connection. It stops there.

---

## How this was checked

- **Frontend (F1, F3):** the preview browser was used at desktop and phone width (375 px, no horizontal overflow). Counts were checked against direct database queries. The console showed no errors apart from the expected `401` from logged-out session checks.
- **Backend (B2, B4):** the search function was tested directly, without the model, with before-and-after queries. The redaction function was unit-tested, including false-alarm cases. Both were then tested live through the FastAPI app with `gpt-5.6-terra`.
- **Caveat:** the live chat results are single runs. The model's wording varies between runs, but the search results and the masking are deterministic code and behave the same every time.
