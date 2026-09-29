# Design: "The shop window at 57 Broadway"

**Concept:** the site should feel like walking up to the real Campus Customs storefront. It has a striped awning, a shop window with price-tagged products, a seal and varsity lettering, and a friendly clerk you can ask anything. The palette stays **Yale navy and warm white**. Varsity type (*Graduate*) is used only for accents, over an editorial serif (*Source Serif 4*) and a clean sans (*Inter*).

## What changed, and why it helps attention and buying

| Area | What changed | Why it helps |
|---|---|---|
| **Brand frame** | A scrolling **ticker** (licensed, 57 Broadway, open 7 days, "ask our assistant"). A **"CC" seal** plus varsity **CAMPUS CUSTOMS** wordmark. The header blurs and gains a shadow on scroll. A **pennant and wordmark footer** under a flipped awning. | Instantly reads as an official Yale shop, not a template. Trust cues (licensed, a physical address) sit on every page. |
| **Hero: the shop window** | A striped **awning** over a navy pinstripe hero. An **arched shop window** shows 4 real products as floating cut-outs, each with a hanging **price tag** (live name and price), a gentle float and mouse **parallax**. Below it sit "Ask our assistant" and **"Try asking…" chips**. | Products and prices are visible in the first second. Every item in the window is one click from its page. The chips teach shoppers what the chat can do. |
| **Product photography** | The site samples each photo's background as it loads. **White studio shots melt into the warm paper** (a multiply blend), so products look cut out. **Black studio shots sit in dark "display cases"** with a spotlight vignette. | 73 of 102 photos are on black and 29 on white. Before, the grids looked patchy; now they look curated. |
| **Stats strip** | 102 styles · 7 categories · XS–XXL · 100% officially licensed, all computed from the live catalogue. | Breadth at a glance, stated only from real numbers. |
| **Shop by category** | Editorial tiles (the biggest category featured large), each with a cover photo, style count and "from $" price. Each links to the Products filters. | A shortcut to the right shelf, with the entry price shown up front. |
| **"Selling fast" shelf** | A horizontal, snap-scrolling shelf of real items with **1–5 units left** in some size, with arrow controls. | Honest urgency: only true low-stock items appear. |
| **The Game band** | A **YALE vs HARVARD scoreboard** (the only use of crimson), Game-day copy, a button to the 2025 Yale vs Harvard tee, and "Ask what to wear". | Ties the merchandise to the biggest buying moment of the year. |
| **Product cards** | **Hang-tag price**, stock badge, a lift and zoom on hover, **sizes sliding in on hover** (sold-out sizes struck through), and "View details →". | Price, availability and sizes are readable without opening the item, which means fewer wasted clicks. |
| **Product page** | **Hover-to-zoom** photo. **Selectable size tiles** with a verdict ("Size XL is sold out", "Only 2 left, visit soon") and a button that asks the assistant ("Find similar in XL"). **Quick-question chips**. A "How to buy" line. A **"More hoodies"** related row. A breadcrumb that includes the category. | Moves the shopper from "does it come in my size?" to an answer or an alternative in one click, and cross-sells when a size is gone. |
| **Chat feel** | The launcher is now a pill ("**Ask the shop** · Sizes, stock & colours") with a 3× attention ring. The panel opens with a spring. The navy header carries a "CC" avatar and a green **"Checks live inventory at 57 Broadway"** status, over an awning scallop edge. Avatars appear beside replies. Context-aware **starter chips** change on product pages. Chat product cards show thumbnail, price, stock and →. A round send button, and **Try again** when a message fails. Any "Ask…" button on the site opens the chat and sends the question. | The chat looks like a shop assistant rather than a support widget. It is visible and inviting, but not pushy. |
| **Assistant promo** | "Ask like you would at the counter", with an example conversation (clearly labelled as an example). | Explains the site's unique feature, honest answers from live inventory, in plain terms. |
| **Visit band** | An illustrated **storefront** (awning, window, door No. 57), hours and in-store services, and a pennant. | Pushes foot traffic to 57 Broadway, where buying actually happens (the site has no checkout). |
| **About and accounts** | About gets a varsity **drop cap**, a pull quote, a seal fact card and a product mosaic. Log in and Create account get a **split layout** with a navy awning panel that says why to join (saved chats). | Brand story and a reason to sign up, and signed-up shoppers get memory. |
| **Motion and access** | Sections **fade up on scroll**, the hero text rises, cards lift. Everything is disabled under `prefers-reduced-motion`. The phone layout gets a **hamburger menu**, an almost full-screen chat and compact filters. Focus outlines are visible, and decorative art is hidden from screen readers. | Motion guides the eye without hurting readability or accessibility. |

## Everything still works

The redesign was checked in the browser at 1440 px, 800 px and 375 px wide, against the live backend and `gpt-5.6-terra`:
- **Navigation and filters:** all pages and the phone menu work. The Products filters still give "Hoodies" = 27 of 102.
- **Product page:** it opens from any card. Size selection works: Champion Reverse Weave XL showed "Size XL is sold out", which matches the database.
- **Chat, live:** "Find similar in XL" opened the chat and the agent answered with correct counts (Basic 2, Brooks Brothers 12, Crew 20 in XL). **Chat page results** replaced the grid with "Hoodies in size XL" (21 items, which matches the database).
- **Accounts:** logging in loaded the 6 saved messages and showed "history saved"; logging out returned the site to guest mode.
- **Earlier features:** stock badges, the colour line, redaction notices and typo-tolerant search are unchanged.
- **Health:** no console errors apart from the expected `401` from logged-out session checks, and no horizontal overflow on phones.

## Files

- **New components** in `frontend/src/components/`:
  - `Decor.tsx`: awning, seal, pennant.
  - `ProductImage.tsx`: photo background detection.
  - `Reveal.tsx`: scroll-in motion.
- **Rewritten:** `index.css` (design system), `Home.tsx`, `NavBar.tsx`, `Footer.tsx`, `ChatWidget.tsx`, `ProductPage.tsx`, `ProductCard.tsx`.
- **Restyled:** About, Log in, Create account.
- **Updated:** `api.ts` (the `askAssistant` helper), and `index.html` (fonts, theme colour).
