import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  askAssistant,
  CATEGORY_LABELS,
  colourLine,
  fetchProduct,
  fetchProducts,
  formatPrice,
  LOW_STOCK_MAX,
  PLACEHOLDER_DESCRIPTION,
  stockBadge,
  type ProductDetail,
} from '../api.ts'
import ProductCard from '../components/ProductCard.tsx'
import ProductImage from '../components/ProductImage.tsx'

type Result = { id: string; product: ProductDetail | null }

export default function ProductPage() {
  const { productId = '' } = useParams()
  const [result, setResult] = useState<Result | null>(null)
  const [catalogue, setCatalogue] = useState<ProductDetail[]>([])
  const [picked, setPicked] = useState<{ id: string; size: string } | null>(null)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let active = true
    fetchProduct(productId)
      .then((product) => active && setResult({ id: productId, product }))
      .catch(() => active && setResult({ id: productId, product: null }))
    return () => {
      active = false
    }
  }, [productId])

  useEffect(() => {
    let active = true
    fetchProducts()
      .then((all) => active && setCatalogue(all))
      .catch(() => active && setCatalogue([]))
    return () => {
      active = false
    }
  }, [])

  const product = result?.id === productId ? result.product : undefined
  const related = useMemo(() => {
    if (!product) return []
    return catalogue
      .filter((p) => p.category === product.category && p.product_id !== product.product_id && p.total_stock > 0)
      .slice(0, 4)
  }, [catalogue, product])

  if (product === undefined) return <section className="page"><p className="muted">Loading…</p></section>
  if (product === null) {
    return (
      <section className="page narrow center">
        <h1>We couldn't find that product.</h1>
        <Link to="/products" className="button">Back to all products</Link>
      </section>
    )
  }

  const inStock = product.inventory.filter((s) => s.quantity > 0)
  const colour = colourLine(product.colors)
  const badge = stockBadge(product.inventory)
  const size = picked?.id === product.product_id ? product.inventory.find((s) => s.size === picked.size) : undefined

  const onZoomMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  return (
    <>
      <section className="page product-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/products">Products</Link> <span aria-hidden="true">/</span>{' '}
          <Link to={`/products?category=${encodeURIComponent(product.category)}`}>{CATEGORY_LABELS[product.category]}</Link>{' '}
          <span aria-hidden="true">/</span> <span>{product.name}</span>
        </nav>
        <div className="product-detail">
          <div
            className={zoom ? 'product-detail-image is-zoomed' : 'product-detail-image'}
            onMouseMove={onZoomMove}
            onMouseLeave={() => setZoom(null)}
            style={zoom ? { ['--zx' as string]: `${zoom.x}%`, ['--zy' as string]: `${zoom.y}%` } : undefined}
          >
            <ProductImage src={product.image_url} alt={product.name} eager />
            {badge && <span className={`stock-badge stock-badge-${badge.tone}`}>{badge.label}</span>}
            <span className="zoom-hint" aria-hidden="true">Hover to zoom</span>
          </div>
          <div className="product-detail-info">
            <p className="eyebrow">{product.garment_type}</p>
            <h1>{product.name}</h1>
            <p className="price price-large">{formatPrice(product.price)}</p>
            <p className={product.details_available ? 'product-description' : 'product-description muted-italic'}>
              {product.details_available ? product.description : PLACEHOLDER_DESCRIPTION}
            </p>

            <dl className="product-meta">
              <dt>Colour</dt>
              <dd>{colour ?? 'Not listed. See the photo.'}</dd>
              <dt>Availability</dt>
              <dd>{badge ? badge.label : 'In stock in every size'}</dd>
              <dt>Licensing</dt>
              <dd>Officially licensed Yale merchandise</dd>
            </dl>

            <h2 className="sizes-heading">Choose a size</h2>
            {inStock.length === 0 ? (
              <p className="notice">This item is currently sold out in every size.</p>
            ) : (
              <ul className="sizes" role="radiogroup" aria-label="Size">
                {product.inventory.map((s) => {
                  const state = s.quantity === 0 ? 'size-out' : s.quantity <= LOW_STOCK_MAX ? 'size-low' : ''
                  const selected = size?.size === s.size
                  return (
                    <li key={s.size}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`size ${state} ${selected ? 'size-selected' : ''}`}
                        onClick={() => setPicked({ id: product.product_id, size: s.size })}
                      >
                        <span className="size-label">{s.size}</span>
                        <span className="size-stock">
                          {s.quantity === 0 ? 'Sold out' : s.quantity <= LOW_STOCK_MAX ? `Only ${s.quantity} left` : `${s.quantity} in stock`}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {size && (
              <div className={size.quantity > 0 ? 'size-verdict' : 'size-verdict size-verdict-out'} role="status">
                <p>
                  {size.quantity === 0
                    ? `Size ${size.size} is sold out.`
                    : size.quantity <= LOW_STOCK_MAX
                      ? `Size ${size.size}: only ${size.quantity} left. Visit 57 Broadway soon.`
                      : `Size ${size.size} is in stock (${size.quantity} available).`}
                </p>
                <button
                  type="button"
                  className="button button-small"
                  onClick={() =>
                    askAssistant(
                      size.quantity === 0
                        ? `The ${product.name} is sold out in ${size.size}. What similar items do you have in ${size.size}?`
                        : `Is the ${product.name} available in ${size.size}?`,
                    )
                  }
                >
                  {size.quantity === 0 ? `Find similar in ${size.size}` : `Ask about size ${size.size}`}
                </button>
              </div>
            )}

            <div className="ask-row">
              <p className="ask-title">Questions? Ask our assistant</p>
              <div className="ask-chips">
                {['Which sizes is this in stock in?', 'What colour is this exactly?', 'Show me similar items'].map((q) => (
                  <button key={q} type="button" className="starter-chip" onClick={() => askAssistant(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <p className="buy-note">
              <strong>How to buy:</strong> visit us at 57 Broadway, New Haven. We're open seven days a week.
            </p>
            <Link to="/products" className="text-link">← Back to all products</Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="page related">
          <div className="section-head">
            <div>
              <p className="eyebrow">You might also like</p>
              <h2>More {CATEGORY_LABELS[product.category].toLowerCase()}</h2>
            </div>
            <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="text-link">
              See all {CATEGORY_LABELS[product.category].toLowerCase()} →
            </Link>
          </div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.product_id} product={p} />)}
          </div>
        </section>
      )}
    </>
  )
}
