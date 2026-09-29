import { Link } from 'react-router-dom'
import { formatPrice, PLACEHOLDER_DESCRIPTION, stockBadge, type Product, type SizeStock } from '../api.ts'
import ProductImage from './ProductImage.tsx'

// Accepts catalogue products and the cards the chat puts on the page (same fields, same link).
type CardFields = Pick<
  Product,
  'product_id' | 'name' | 'garment_type' | 'description' | 'details_available' | 'price' | 'image_url'
> & { inventory?: SizeStock[] }

export default function ProductCard({ product }: { product: CardFields }) {
  const badge = product.inventory ? stockBadge(product.inventory) : null
  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-card-image">
        <ProductImage src={product.image_url} alt={product.name} />
        {badge && <span className={`stock-badge stock-badge-${badge.tone}`}>{badge.label}</span>}
        <span className="price-tag" aria-hidden="true">{formatPrice(product.price).replace('.00', '')}</span>
        {product.inventory && (
          <span className="card-sizes" aria-hidden="true">
            {product.inventory.map((s) => (
              <span key={s.size} className={s.quantity > 0 ? 'card-size' : 'card-size out'}>{s.size}</span>
            ))}
          </span>
        )}
      </div>
      <div className="product-card-body">
        <p className="eyebrow">{product.garment_type}</p>
        <h3>{product.name}</h3>
        <p className={product.details_available ? 'product-card-desc' : 'product-card-desc muted-italic'}>
          {product.details_available ? product.description : PLACEHOLDER_DESCRIPTION}
        </p>
        <p className="product-card-foot">
          <span className="price">{formatPrice(product.price)}</span>
          <span className="card-cta">View details →</span>
        </p>
      </div>
    </Link>
  )
}
