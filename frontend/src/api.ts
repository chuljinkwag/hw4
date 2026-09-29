export interface SizeStock {
  size: string
  quantity: number
}

export type Category = 't-shirt' | 'hoodie' | 'crewneck' | 'quarter-zip' | 'jacket' | 'long-sleeve shirt' | 'mockneck'

export interface Product {
  product_id: string
  name: string
  category: Category
  garment_type: string
  description: string
  details_available: boolean
  colors: string[]
  search_tags: string[]
  image_url: string
  price: number
  total_stock: number
}

export interface ProductDetail extends Product {
  inventory: SizeStock[]
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const fetchProducts = () => getJson<ProductDetail[]>('/api/products')

export interface SearchResponse {
  product_ids: string[]
  spelling_corrections: Record<string, string>
}

export const searchProducts = (q: string) => getJson<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)

export const fetchProduct = (id: string) =>
  getJson<ProductDetail>(`/api/products/${encodeURIComponent(id)}`)

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

export interface RegisterInput {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'Something went wrong. Please try again.')
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const fetchMe = () => getJson<User>('/api/auth/me')
export const login = (email: string, password: string) => postJson<User>('/api/auth/login', { email, password })
export const register = (input: RegisterInput) => postJson<User>('/api/auth/register', input)
export const logout = () => postJson<void>('/api/auth/logout')

export interface ProductCard {
  product_id: string
  name: string
  garment_type: string
  description: string
  details_available: boolean
  price: number
  image_url: string
  colors: string[]
  inventory: SizeStock[]
  total_stock: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  products: ProductCard[]
}

export interface PageResults {
  title: string
  total: number
  products: ProductCard[]
}

export interface ChatResponse {
  reply: string
  products: ProductCard[]
  page_results: PageResults | null
  user_message: string
  redactions: string[]
}

export const fetchChatHistory = () => getJson<ChatMessage[]>('/api/chat/history')
export interface PageContext {
  page_type: 'home' | 'products' | 'product' | 'about' | 'login' | 'create_account' | 'other'
  product_id?: string
  results_title?: string
}

export const sendChat = (message: string, page: PageContext) =>
  postJson<ChatResponse>('/api/chat', { message, page })

export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 && p.length <= 128 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A symbol (e.g. ! ? # @)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export const CATEGORY_LABELS: Record<Category, string> = {
  't-shirt': 'T-shirts',
  hoodie: 'Hoodies',
  crewneck: 'Crewnecks',
  'quarter-zip': 'Quarter-zips',
  jacket: 'Jackets',
  'long-sleeve shirt': 'Long-sleeve',
  mockneck: 'Mocknecks',
}

// Opens the chat panel and sends `text` as the shopper's message (used by buttons around the site).
export const ASK_EVENT = 'cc:ask'
export const askAssistant = (text: string) => window.dispatchEvent(new CustomEvent<string>(ASK_EVENT, { detail: text }))

export const LOW_STOCK_MAX = 5

export interface StockBadge {
  label: string
  tone: 'out' | 'limited' | 'low'
}

// One short, honest stock label for a product card (null when every size is comfortably in stock).
export function stockBadge(inventory: SizeStock[]): StockBadge | null {
  const soldOut = inventory.filter((s) => s.quantity === 0).map((s) => s.size)
  if (inventory.length > 0 && soldOut.length === inventory.length) return { label: 'Sold out', tone: 'out' }
  if (soldOut.length > 0) {
    return { label: soldOut.length <= 2 ? `Sold out in ${soldOut.join(', ')}` : 'Limited sizes', tone: 'limited' }
  }
  if (inventory.some((s) => s.quantity <= LOW_STOCK_MAX)) return { label: 'Low stock', tone: 'low' }
  return null
}

// "Navy blue with white print" — colors[0] is the garment colour, the rest are print/trim on the same item.
export function colourLine(colors: string[]): string | null {
  if (colors.length === 0) return null
  const [base, ...print] = colors
  const sentence = base.charAt(0).toUpperCase() + base.slice(1)
  if (print.length === 0) return sentence
  const list = print.length === 1 ? print[0] : `${print.slice(0, -1).join(', ')} and ${print.at(-1)}`
  return `${sentence} with ${list} print`
}

export const PLACEHOLDER_DESCRIPTION = "We don't have a written description for this item yet. The photo shows the design."

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const formatPrice = (price: number) => usd.format(price)
