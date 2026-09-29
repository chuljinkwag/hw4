"""Pydantic types shared by the API (main.py), the agent (agent.py) and its tools (tools.py)."""

from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["t-shirt", "hoodie", "crewneck", "quarter-zip", "jacket", "long-sleeve shirt", "mockneck"]


# ---------- Catalogue ----------


class SizeStock(BaseModel):
    size: str
    quantity: int


class Product(BaseModel):
    product_id: str
    name: str
    category: Category
    garment_type: str
    description: str
    details_available: bool = Field(description="False when the catalogue row only has a placeholder description")
    colors: list[str]
    search_tags: list[str]
    image_url: str
    price: float
    total_stock: int


class ProductDetail(Product):
    inventory: list[SizeStock]


class ProductCard(BaseModel):
    """A product shown as a card in the chat panel. Always built from the live database, never by the model."""

    product_id: str
    name: str
    garment_type: str
    description: str
    details_available: bool
    price: float
    image_url: str
    colors: list[str]
    inventory: list[SizeStock]
    total_stock: int


class ProductSearchResponse(BaseModel):
    """GET /api/search: ranked product_ids for the website's search box."""

    product_ids: list[str]
    spelling_corrections: dict[str, str]


# ---------- Tool results (what the agent sees) ----------


StockStatus = Literal["in_stock", "low_stock", "sold_out", "not_offered"]


class SearchHit(BaseModel):
    """One match from search_products: enough to list and pick products, not to describe them in detail."""

    product_id: str = Field(description="Pass this to get_product_info, get_price or check_stock")
    name: str
    category: Category
    garment_colour: str | None = Field(description="Main colour of the garment; None if the catalogue has no colour data")
    price: float = Field(description="Current price in USD")
    sizes_in_stock: list[str] = Field(description="Sizes with at least 1 unit. Use check_stock for quantities")
    sold_out_sizes: list[str] = Field(description="Sizes with 0 units")


class SearchResult(BaseModel):
    search_id: str = Field(
        description="Identifies this search. Put it in page_results.search_id to show ALL its matches on the page"
    )
    total_matches: int = Field(description="How many products matched before the limit was applied")
    price_min: float | None = Field(
        default=None, description="Lowest price across ALL matches (not just those listed). Use it for 'from $X'"
    )
    price_max: float | None = Field(default=None, description="Highest price across ALL matches")
    spelling_corrections: dict[str, str] = Field(
        default_factory=dict,
        description="Query words that matched nothing and were read as the closest catalogue word, e.g. hoddie -> hoodie",
    )
    products: list[SearchHit]
    sold_out_in_requested_size: list[SearchHit] = Field(
        default_factory=list,
        description=(
            "Products that match everything except that the requested size is SOLD OUT. They exist: if the shopper "
            "asked about one of these, tell them that size is sold out rather than saying you can't find it"
        ),
    )


class ProductInfo(BaseModel):
    """What a product is and what it looks like, from the catalogue table."""

    product_id: str
    name: str
    category: Category
    garment_type: str = Field(description="The catalogue's own garment label, e.g. 'quarter-zip pullover'")
    garment_colour: str | None = Field(description="Main colour of the garment")
    print_colours: list[str] = Field(
        description="Colours of the lettering, graphic or trim on this same item. NOT other colour options."
    )
    description: str | None = Field(description="Catalogue description; None when details_available is false")
    details_available: bool = Field(
        description="False for a few rows whose description is a placeholder: say you don't have their details"
    )
    price: float = Field(description="Current price in USD")


class PriceQuote(BaseModel):
    product_id: str
    name: str
    price: float = Field(description="Exact current price. Quote it exactly; never round or estimate")
    currency: Literal["USD"] = "USD"


class SizeAvailability(BaseModel):
    size: str
    quantity: int = Field(description="Units on hand right now")
    status: StockStatus = Field(
        description="in_stock: more than 5 units; low_stock: 1-5 units; sold_out: 0 units; not_offered: size not made"
    )


class StockReport(BaseModel):
    """Live stock for one product, straight from the inventory table."""

    product_id: str
    name: str
    sizes: list[SizeAvailability] = Field(description="Every size offered, XS to XXL")
    total_units: int
    sold_out_everywhere: bool
    requested_size: SizeAvailability | None = Field(
        description="The size the shopper asked about, if one was passed to check_stock"
    )
    summary: str = Field(description="Plain-language statement of the stock facts; safe to paraphrase")


class CategorySummary(BaseModel):
    category: Category
    product_count: int
    price_min: float
    price_max: float


class CatalogueOverview(BaseModel):
    product_count: int
    categories: list[CategorySummary]
    garment_colours: list[str] = Field(description="Every main garment colour carried; a colour not listed isn't sold")
    sizes: list[str]


class ShopperProfile(BaseModel):
    """Who is chatting. Only ever the signed-in shopper's own account; never other customers."""

    logged_in: bool
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = Field(default=None, description="The shopper's own login email")
    member_since: str | None = Field(default=None, description="Account creation date, YYYY-MM-DD")
    saved_messages: int = Field(default=0, description="Messages in their saved chat history before this one")
    history_saved: bool = Field(description="True if this conversation is saved to their account")


# ---------- Agent output ----------


class PageResultsRequest(BaseModel):
    """Asks the website to show every match of one search as product cards on the page."""

    search_id: str = Field(description="The search_id of the search_products call whose matches should be shown")
    title: str = Field(max_length=60, description="Short heading for the results, e.g. 'Hoodies' or 'Navy crewnecks'")


class ChatReply(BaseModel):
    """The agent's final answer for one shopper message."""

    reply: str = Field(
        description="Your message to the shopper. Plain sentences; **bold** and '- ' bullet lines are allowed."
    )
    product_ids: list[str] = Field(
        default_factory=list,
        description=(
            "product_id values to show as cards under your reply, most relevant first, at most 6. "
            "Only use IDs returned by your tools in this conversation turn. Empty if you are not showing products."
        ),
    )
    page_results: PageResultsRequest | None = Field(
        default=None,
        description=(
            "Set when the shopper is browsing a type of item ('what hoodies do you have', 'navy tees under $40'): "
            "the website then shows every match of that search as product cards. None for single-product questions."
        ),
    )


# ---------- Chat API ----------


PageType = Literal["home", "products", "product", "about", "login", "create_account", "other"]


class PageContext(BaseModel):
    """What the shopper is looking at when they send a message. Sent by the browser, so treated as untrusted."""

    page_type: PageType = "other"
    product_id: str | None = Field(default=None, max_length=120, description="Set on a product page")
    results_title: str | None = Field(
        default=None, max_length=60, description="Title of chat search results shown on the Products page, if any"
    )


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    page: PageContext | None = None


class PageResults(BaseModel):
    """Search matches the website renders as product cards on the page. Built by the server from the database."""

    title: str
    total: int = Field(description="Number of matching products; products holds at most MAX_PAGE_RESULTS of them")
    products: list[ProductCard]


class ChatResponse(BaseModel):
    reply: str
    products: list[ProductCard]
    page_results: PageResults | None = None
    user_message: str = Field(description="The shopper's message as stored, after sensitive data was masked")
    redactions: list[str] = Field(default_factory=list, description="Kinds of sensitive data removed, if any")


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list)


# ---------- Accounts ----------


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class User(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
