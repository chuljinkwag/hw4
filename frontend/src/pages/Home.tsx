import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  askAssistant,
  CATEGORY_LABELS,
  fetchProducts,
  formatPrice,
  LOW_STOCK_MAX,
  type Category,
  type ProductDetail,
} from '../api.ts'
import { Awning, Pennant } from '../components/Decor.tsx'
import ProductCard from '../components/ProductCard.tsx'
import ProductImage from '../components/ProductImage.tsx'
import Reveal from '../components/Reveal.tsx'

// White-background studio shots read as cut-outs in the shop window.
const WINDOW_IDS = [
  'champion-reverse-weave-hoodie-1',
  '2025-yale-vs-harvard-t-shirt',
  'district-vit-hoodie-vintage-bulldog',
  'super-heavyweight-crewneck-arched-yale-crest',
]
const GAME_ID = '2025-yale-vs-harvard-t-shirt'
// Preferred category covers (white-background shots read best on the tiles); other categories use their first item.
const CATEGORY_COVERS: Partial<Record<Category, string>> = {
  crewneck: 'hype-and-vice-yale-university-premium-crewneck',
  hoodie: 'district-vit-hoodie-vintage-sailor-bulldog',
  't-shirt': 'yale-bowl-t-shirt',
  'long-sleeve shirt': 'ua-mens-tech-l-s-2-0',
}
const TRY_ASKING = ['Navy hoodies in size L', 'A shirt for the Harvard–Yale game', 'Crewnecks under $60']

export default function Home() {
  const [products, setProducts] = useState<ProductDetail[]>([])
  const windowRef = useRef<HTMLDivElement>(null)
  const shelfRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetchProducts()
      .then((all) => active && setProducts(all))
      .catch(() => active && setProducts([]))
    return () => {
      active = false
    }
  }, [])

  const byId = useMemo(() => new Map(products.map((p) => [p.product_id, p])), [products])
  const windowItems = WINDOW_IDS.map((id) => byId.get(id)).filter((p): p is ProductDetail => !!p)
  const game = byId.get(GAME_ID)

  const categories = useMemo(() => {
    const groups = new Map<Category, ProductDetail[]>()
    for (const p of products) groups.set(p.category, [...(groups.get(p.category) ?? []), p])
    return [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([category, items]) => ({
        category,
        count: items.length,
        cover: items.find((i) => i.product_id === CATEGORY_COVERS[category]) ?? items[0],
        from: Math.min(...items.map((i) => i.price)),
      }))
  }, [products])

  // Honest urgency: real items with 1-5 units left in at least one size.
  const sellingFast = useMemo(
    () => products.filter((p) => p.total_stock > 0 && p.inventory.some((s) => s.quantity > 0 && s.quantity <= LOW_STOCK_MAX)).slice(0, 10),
    [products],
  )

  const onWindowMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = windowRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5))
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5))
  }

  const scrollShelf = (dir: number) => shelfRef.current?.scrollBy({ left: dir * shelfRef.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <>
      <section className="hero">
        <Awning />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="kicker"><span className="kicker-dot" />Yale Bulldog Blue by Campus Customs</p>
            <h1>
              Bulldog pride you can wear <em>every day.</em>
            </h1>
            <p className="lede">
              We have long believed that the best Yale gear is the kind you actually live in, whether it is a hoodie
              for a late night in the library or a crewneck for the walk to the Bowl on game day. It is our hope that
              everything we carry, from our shelves at 57 Broadway to your doorstep, lets you bring a little bit of
              New Haven with you wherever you go.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="button button-light button-large">Shop Bulldog Blue</Link>
              <button type="button" className="button button-outline-light button-large" onClick={() => askAssistant('What hoodies do you have?')}>
                Ask our assistant
              </button>
            </div>
            <div className="try-asking">
              <span>Try asking:</span>
              {TRY_ASKING.map((q) => (
                <button key={q} type="button" className="try-chip" onClick={() => askAssistant(q)}>
                  “{q}”
                </button>
              ))}
            </div>
          </div>

          <div className="shop-window" ref={windowRef} onMouseMove={onWindowMove} aria-label="In the window this week">
            <p className="window-label">In the window</p>
            {windowItems.map((p, i) => (
              <Link
                key={p.product_id}
                to={`/products/${p.product_id}`}
                className={`window-item window-item-${i}`}
                style={{ '--i': i } as CSSProperties}
              >
                <ProductImage src={p.image_url} alt={p.name} eager />
                <span className="hang-tag">
                  <span className="hang-tag-name">{p.name}</span>
                  <span className="hang-tag-price">{formatPrice(p.price)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="stats-strip" aria-label="The shop at a glance">
          <div className="stats-inner">
            <div><strong>{products.length}</strong><span>styles in the shop</span></div>
            <div><strong>{categories.length}</strong><span>ways to wear Bulldog Blue</span></div>
            <div><strong>XS–XXL</strong><span>every style, six sizes</span></div>
            <div><strong>100%</strong><span>officially licensed Yale</span></div>
          </div>
        </section>
      )}

      <section className="page">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>Find your fit</h2>
          </div>
          <Link to="/products" className="text-link">View all products →</Link>
        </Reveal>
        <div className="category-grid">
          {categories.map((c, i) => (
            <Reveal key={c.category} delay={i * 60}>
              <Link to={`/products?category=${encodeURIComponent(c.category)}`} className="category-tile">
                <ProductImage src={c.cover.image_url} alt="" />
                <span className="category-info">
                  <span className="category-name">{CATEGORY_LABELS[c.category]}</span>
                  <span className="category-meta">{c.count} {c.count === 1 ? 'style' : 'styles'} · from {formatPrice(c.from).replace('.00', '')}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {sellingFast.length > 0 && (
        <section className="shelf-section">
          <div className="page shelf-page">
            <Reveal className="section-head">
              <div>
                <p className="eyebrow">Selling fast</p>
                <h2>Only a few left in some sizes</h2>
              </div>
              <div className="shelf-controls">
                <button type="button" className="round-button" onClick={() => scrollShelf(-1)} aria-label="Scroll left">←</button>
                <button type="button" className="round-button" onClick={() => scrollShelf(1)} aria-label="Scroll right">→</button>
              </div>
            </Reveal>
            <div className="shelf" ref={shelfRef}>
              {sellingFast.map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {game && (
        <section className="game-band">
          <div className="game-inner">
            <Reveal className="scoreboard">
              <p className="scoreboard-title">The Game</p>
              <div className="scoreboard-row">
                <span className="team team-home">YALE</span>
                <span className="vs">vs</span>
                <span className="team team-away">HARVARD</span>
              </div>
              <p className="scoreboard-note">Tailgate season · Dress for the stands</p>
            </Reveal>
            <Reveal className="game-copy" delay={120}>
              <h2>Dress for The Game.</h2>
              <p>
                Indeed, there is no better time to show your colours than the weeks leading up to Harvard–Yale. Our
                Game-day tees, heavyweight crewnecks and quarter-zips are made for a cold afternoon in the stands, and
                hopefully they will keep you warm even when the scoreboard does not.
              </p>
              <div className="game-actions">
                <Link to={`/products/${game.product_id}`} className="button button-light">Shop the {game.name.replace(' T Shirt', ' tee')} · {formatPrice(game.price)}</Link>
                <button type="button" className="text-link text-link-light" onClick={() => askAssistant('What should I wear to the Harvard–Yale game?')}>
                  Ask what to wear →
                </button>
              </div>
            </Reveal>
            <Reveal className="game-product" delay={200}>
              <Link to={`/products/${game.product_id}`}>
                <ProductImage src={game.image_url} alt={game.name} />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      <section className="page assistant-promo">
        <Reveal className="promo-copy">
          <p className="eyebrow">Your personal shopper</p>
          <h2>Ask like you would at the counter.</h2>
          <p>
            Our assistant checks the same live inventory as the shop floor, so it can tell you honestly what's in your
            size, what colour an item really is, and what's close to selling out. Ask about a type of item and the
            matching pieces appear right on the page.
          </p>
          <button type="button" className="button" onClick={() => askAssistant('What do you have in size XL?')}>
            Start a conversation
          </button>
        </Reveal>
        <Reveal className="promo-chat" delay={120}>
          <div className="promo-bubble promo-user">Do you have navy hoodies in L?</div>
          <div className="promo-bubble promo-bot">
            Yes! These are in stock in L. I've put them all on the page for you.
          </div>
          <div className="promo-bubble promo-user">Is this one available in XL?</div>
          <div className="promo-bubble promo-bot">Size XL is sold out, but we have it in S, M, L and XXL.</div>
          <p className="promo-caption">An example conversation. Real answers come straight from our live inventory, so nothing is guessed.</p>
        </Reveal>
      </section>

      <section className="visit-band">
        <div className="page visit">
          <Reveal className="storefront" as="figure">
            <svg viewBox="0 0 420 300" role="img" aria-label="Illustration of the Campus Customs storefront at 57 Broadway">
              <rect x="20" y="30" width="380" height="260" fill="#efe8da" stroke="#00224a" strokeWidth="3" />
              <rect x="20" y="30" width="380" height="54" fill="#00356b" />
              <text x="210" y="66" textAnchor="middle" fontFamily="Graduate, Georgia, serif" fontSize="26" fill="#faf7f1" letterSpacing="3">CAMPUS CUSTOMS</text>
              {Array.from({ length: 12 }, (_, i) => (
                <path key={i} d={`M${20 + i * 31.67} 84 h31.67 v18 q-15.8 14 -31.67 0 z`} fill={i % 2 ? '#faf7f1' : '#00356b'} stroke="#00224a" strokeWidth="1" />
              ))}
              <rect x="44" y="124" width="200" height="130" fill="#dfe8f3" stroke="#00224a" strokeWidth="3" />
              <path d="M70 250 v-60 q30 -26 60 0 v60 z" fill="#00356b" opacity="0.85" />
              <text x="100" y="228" textAnchor="middle" fontFamily="Graduate, Georgia, serif" fontSize="18" fill="#faf7f1">Y</text>
              <path d="M150 250 v-50 h70 v50 z" fill="#8f99a8" opacity="0.8" />
              <rect x="266" y="124" width="110" height="166" fill="#00224a" />
              <rect x="276" y="136" width="90" height="100" fill="#dfe8f3" opacity="0.35" />
              <circle cx="354" cy="212" r="4" fill="#faf7f1" />
              <text x="321" y="272" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="#faf7f1">57</text>
              <rect x="0" y="286" width="420" height="14" fill="#c9c1b1" />
            </svg>
          </Reveal>
          <Reveal className="visit-copy" delay={120}>
            <p className="eyebrow">Visit the shop</p>
            <h2>57 Broadway, New Haven</h2>
            <p>
              Come and see us in person, seven days a week. All in all, there is no substitute for trying on a
              sweatshirt before you commit to it for the next four years.
            </p>
            <ul className="visit-list">
              <li><strong>Open</strong> seven days a week</li>
              <li><strong>In store</strong> screen printing, embroidery and digital printing</li>
              <li><strong>Custom orders</strong> for clubs, teams, events and family reunions</li>
            </ul>
            <Pennant label="BULLDOG BLUE" className="visit-pennant" />
          </Reveal>
        </div>
      </section>
    </>
  )
}
