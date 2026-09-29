import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchProducts,
  searchProducts,
  type Category,
  type PageResults,
  type ProductDetail,
  type SearchResponse,
} from '../api.ts'
import ProductCard from '../components/ProductCard.tsx'

interface Props {
  chatResults: PageResults | null
  onClearChatResults: () => void
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 't-shirt', label: 'T-shirts' },
  { value: 'hoodie', label: 'Hoodies' },
  { value: 'crewneck', label: 'Crewnecks' },
  { value: 'quarter-zip', label: 'Quarter-zips' },
  { value: 'jacket', label: 'Jackets' },
  { value: 'long-sleeve shirt', label: 'Long-sleeve' },
  { value: 'mockneck', label: 'Mocknecks' },
]
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SORTS = [
  { value: '', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
]

// Garment colour families; colors[0] is the garment itself, not the print.
function colourFamily(colors: string[]): string | null {
  const c = colors[0]?.toLowerCase()
  if (!c) return null
  if (c.includes('navy')) return 'Navy'
  if (c.includes('gray') || c.includes('grey') || c.includes('charcoal')) return 'Gray'
  if (c.includes('white') || c.includes('cream') || c.includes('ivory')) return 'White & cream'
  if (c.includes('coral')) return 'Coral'
  return 'Other'
}

export default function Products({ chatResults, onClearChatResults }: Props) {
  const [products, setProducts] = useState<ProductDetail[] | null>(null)
  const [error, setError] = useState(false)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const colour = params.get('colour') ?? ''
  const size = params.get('size') ?? ''
  const sort = params.get('sort') ?? ''
  const [draft, setDraft] = useState(q)
  const [search, setSearch] = useState<{ q: string; result: SearchResponse } | null>(null)

  useEffect(() => {
    let active = true
    fetchProducts()
      .then((data) => active && setProducts(data))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  // Keyword search uses the same typo-tolerant ranking as the chat assistant (GET /api/search).
  useEffect(() => {
    if (!q) return
    let active = true
    searchProducts(q)
      .then((result) => active && setSearch({ q, result }))
      .catch(() => active && setSearch({ q, result: { product_ids: [], spelling_corrections: {} } }))
    return () => {
      active = false
    }
  }, [q])

  // Debounce typing into the URL so Back/Forward and product-page round trips keep the filters.
  useEffect(() => {
    const id = setTimeout(() => {
      if (draft.trim() !== q) update('q', draft.trim())
    }, 300)
    return () => clearTimeout(id)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps -- only typing should trigger this

  function update(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const clearAll = () => {
    setDraft('')
    setParams({}, { replace: true })
  }

  const families = useMemo(
    () => [...new Set((products ?? []).map((p) => colourFamily(p.colors)).filter((f): f is string => !!f))].sort(),
    [products],
  )

  const searchReady = !q || search?.q === q
  const visible = useMemo(() => {
    if (!products || !searchReady) return null
    let list = products
    if (q && search) {
      const rank = new Map(search.result.product_ids.map((id, i) => [id, i]))
      list = list.filter((p) => rank.has(p.product_id)).sort((a, b) => rank.get(a.product_id)! - rank.get(b.product_id)!)
    }
    if (category) list = list.filter((p) => p.category === category)
    if (colour) list = list.filter((p) => colourFamily(p.colors) === colour)
    if (size) list = list.filter((p) => p.inventory.some((s) => s.size === size && s.quantity > 0))
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, searchReady, q, search, category, colour, size, sort])

  if (chatResults) {
    const shown = chatResults.products.length
    return (
      <section className="page" aria-live="polite">
        <div className="section-head chat-results-head">
          <div>
            <p className="eyebrow">From your chat with our assistant</p>
            <h1>{chatResults.title}</h1>
          </div>
          <div className="chat-results-meta">
            <p className="muted">
              {shown < chatResults.total ? `Showing ${shown} of ${chatResults.total}` : `${chatResults.total} items`}
            </p>
            <button type="button" className="button button-small button-outline" onClick={onClearChatResults}>
              Show all products
            </button>
          </div>
        </div>
        {/* key re-mounts the grid so each new chat search animates in */}
        <div className="product-grid chat-results-grid" key={chatResults.title + chatResults.total}>
          {chatResults.products.map((p) => <ProductCard key={p.product_id} product={p} />)}
        </div>
      </section>
    )
  }

  const corrections = q && search?.q === q ? Object.entries(search.result.spelling_corrections) : []
  const filtered = Boolean(q || category || colour || size || sort)

  return (
    <section className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Shop Bulldog Blue</p>
          <h1>All products</h1>
        </div>
        {visible && products && (
          <p className="muted" aria-live="polite">
            {visible.length === products.length ? `${products.length} items` : `Showing ${visible.length} of ${products.length}`}
          </p>
        )}
      </div>

      <div className="filters" role="search" aria-label="Filter products">
        <label className="filter-search">
          <span className="visually-hidden">Search products</span>
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search: hoodie, hockey, Davenport, Champion…"
            maxLength={100}
          />
        </label>
        <div className="filter-chips" role="group" aria-label="Category">
          <button type="button" className={!category ? 'chip active' : 'chip'} aria-pressed={!category} onClick={() => update('category', '')}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={category === c.value ? 'chip active' : 'chip'}
              aria-pressed={category === c.value}
              onClick={() => update('category', category === c.value ? '' : c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="filter-selects">
          <label>
            Colour
            <select value={colour} onChange={(e) => update('colour', e.target.value)}>
              <option value="">Any colour</option>
              {families.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>
            In stock in size
            <select value={size} onChange={(e) => update('size', e.target.value)}>
              <option value="">Any size</option>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Sort by
            <select value={sort} onChange={(e) => update('sort', e.target.value)}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          {filtered && (
            <button type="button" className="text-button" onClick={clearAll}>Clear filters</button>
          )}
        </div>
        {corrections.length > 0 && (
          <p className="filter-note" role="status">
            Showing results for {corrections.map(([from, to], i) => (
              <span key={from}>{i > 0 && ', '}<strong>{to}</strong> <span className="muted">(you typed “{from}”)</span></span>
            ))}
          </p>
        )}
      </div>

      {error && <p className="notice">We couldn't load the catalogue right now. Please try again shortly.</p>}
      {!visible && !error && <p className="muted">Loading the catalogue…</p>}
      {visible && visible.length === 0 && (
        <div className="empty-state">
          <p>No products match these filters.</p>
          <button type="button" className="button button-small" onClick={clearAll}>Clear filters</button>
          <p className="muted">Or ask our assistant in the chat. It can suggest the closest match.</p>
        </div>
      )}
      {visible && visible.length > 0 && (
        <div className="product-grid">
          {visible.map((p) => <ProductCard key={p.product_id} product={p} />)}
        </div>
      )}
    </section>
  )
}
