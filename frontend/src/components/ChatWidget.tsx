import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ASK_EVENT,
  fetchChatHistory,
  formatPrice,
  sendChat,
  type ChatMessage,
  type PageContext,
  type PageResults,
  type ProductCard,
} from '../api.ts'
import { useAuth } from '../auth.tsx'
import ProductImage from './ProductImage.tsx'

type UiMessage = ChatMessage & { pageResults?: PageResults; redactions?: string[] }

const GREETING: UiMessage = {
  role: 'assistant',
  content: "Hi, I'm the Bulldog Blue shopping assistant. Ask me about hoodies, sizes, colours or what's in stock.",
  products: [],
}

const STARTERS_GENERAL = ['What hoodies do you have?', "What's in stock in size XL?", 'Harvard–Yale game gear', 'Gifts under $40']
const STARTERS_PRODUCT = ['Which sizes is this in stock in?', 'What colour is this exactly?', 'Show me similar items']

// Renders **bold** and "- " bullet lines as React elements (no raw HTML is ever injected).
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? <strong key={i}>{chunk.slice(2, -2)}</strong> : chunk,
  )
}

function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length) {
      blocks.push(<ul key={blocks.length}>{bullets.map((b, i) => <li key={i}>{renderInline(b)}</li>)}</ul>)
      bullets = []
    }
  }
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      bullets.push(bullet[1])
    } else {
      flush()
      if (line.trim()) blocks.push(<p key={blocks.length}>{renderInline(line)}</p>)
    }
  }
  flush()
  return <>{blocks}</>
}

function stockLabel(card: ProductCard) {
  const sizes = card.inventory.filter((s) => s.quantity > 0).map((s) => s.size)
  return sizes.length ? `In stock: ${sizes.join(', ')}` : 'Sold out'
}

function ChatCard({ card }: { card: ProductCard }) {
  return (
    <Link to={`/products/${card.product_id}`} className="chat-card">
      <ProductImage src={card.image_url} alt="" className="chat-card-image" />
      <span className="chat-card-body">
        <span className="chat-card-name">{card.name}</span>
        <span className="chat-card-price">{formatPrice(card.price)}</span>
        <span className="chat-card-stock">{stockLabel(card)}</span>
      </span>
      <span className="chat-card-arrow" aria-hidden="true">→</span>
    </Link>
  )
}

const STATIC_PAGES: Record<string, PageContext['page_type']> = {
  '/': 'home',
  '/about': 'about',
  '/login': 'login',
  '/create-account': 'create_account',
}

// Tells the agent what the shopper is looking at, so "do you have this in pink?" resolves to the right item.
function pageContext(pathname: string, resultsTitle: string | undefined): PageContext {
  const product = pathname.match(/^\/products\/([^/]+)$/)
  if (product) return { page_type: 'product', product_id: decodeURIComponent(product[1]) }
  if (pathname === '/products') return { page_type: 'products', results_title: resultsTitle }
  return { page_type: STATIC_PAGES[pathname] ?? 'other' }
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"
        fill="currentColor"
      />
      <circle cx="8.5" cy="9.5" r="1.2" fill="#00356b" />
      <circle cx="12" cy="9.5" r="1.2" fill="#00356b" />
      <circle cx="15.5" cy="9.5" r="1.2" fill="#00356b" />
    </svg>
  )
}

interface Props {
  onPageResults: (results: PageResults) => void
  resultsTitle?: string
}

export default function ChatWidget({ onPageResults, resultsTitle }: Props) {
  const { user, ready } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<UiMessage[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)

  // Reload the saved conversation whenever the signed-in shopper changes.
  useEffect(() => {
    if (!ready) return
    let active = true
    fetchChatHistory()
      .then((history) => active && setMessages([GREETING, ...history]))
      .catch(() => active && setMessages([GREETING]))
    return () => {
      active = false
    }
  }, [ready, user?.id])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])

  const sendText = useCallback(
    async (raw: string, retry = false) => {
      const text = raw.trim()
      if (!text || sendingRef.current) return
      sendingRef.current = true
      setError('')
      setFailed(null)
      if (!retry) setMessages((m) => [...m, { role: 'user', content: text, products: [] }])
      setSending(true)
      try {
        const res = await sendChat(text, pageContext(pathname, resultsTitle))
        const pageResults = res.page_results ?? undefined
        setMessages((m) => {
          // Show the shopper's message as the server stored it (sensitive data masked).
          const copy = [...m]
          const last = copy.length - 1
          if (copy[last]?.role === 'user') copy[last] = { ...copy[last], content: res.user_message, redactions: res.redactions }
          return [...copy, { role: 'assistant', content: res.reply, products: res.products, pageResults }]
        })
        if (pageResults) onPageResults(pageResults)
      } catch (err) {
        setError((err as Error).message)
        setFailed(text)
      } finally {
        sendingRef.current = false
        setSending(false)
        inputRef.current?.focus()
      }
    },
    [pathname, resultsTitle, onPageResults],
  )

  // Buttons elsewhere on the site ("Ask our assistant", "Ask about this size") open the chat and send a question.
  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true)
      void sendText((e as CustomEvent<string>).detail)
    }
    window.addEventListener(ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASK_EVENT, onAsk)
  }, [sendText])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft
    setDraft('')
    void sendText(text)
  }

  const onProductPage = /^\/products\/[^/]+$/.test(pathname)
  const starters = onProductPage ? STARTERS_PRODUCT : STARTERS_GENERAL
  const lastIsAssistant = messages.at(-1)?.role === 'assistant'

  return (
    <div className={open ? 'chat is-open' : 'chat'} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      {open && (
        <section id="chat-panel" className="chat-panel" aria-label="Shopping assistant">
          <header className="chat-header">
            <span className="chat-avatar" aria-hidden="true">CC</span>
            <div className="chat-header-text">
              <p className="chat-title">Bulldog Blue Assistant</p>
              <p className="chat-status">
                <span className="status-dot" aria-hidden="true" />
                Checks live inventory at 57 Broadway
              </p>
              <p className="chat-subtitle">
                {user ? `Chatting as ${user.first_name} · history saved` : 'Guest chat · not saved · log in to keep it'}
              </p>
            </div>
            <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="chat-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((m, i) => (
              <Fragment key={i}>
                <div className={`chat-row chat-row-${m.role}`}>
                  {m.role === 'assistant' && <span className="chat-mini-avatar" aria-hidden="true">CC</span>}
                  <div className={`chat-msg chat-msg-${m.role}`}>
                    {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
                  </div>
                </div>
                {m.redactions && m.redactions.length > 0 && (
                  <p className="chat-redacted">
                    For your safety we removed your {m.redactions.join(', ')} before sending. It was not saved.
                  </p>
                )}
                {m.pageResults && (
                  <button type="button" className="chat-page-link" onClick={() => onPageResults(m.pageResults!)}>
                    View all {m.pageResults.total} on the page: {m.pageResults.title} →
                  </button>
                )}
                {m.products.length > 0 && (
                  <div className="chat-cards">
                    {m.products.map((p) => <ChatCard key={p.product_id} card={p} />)}
                  </div>
                )}
              </Fragment>
            ))}
            {sending && (
              <div className="chat-row chat-row-assistant">
                <span className="chat-mini-avatar" aria-hidden="true">CC</span>
                <div className="chat-msg chat-msg-assistant chat-typing" aria-label="Assistant is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            {error && (
              <div className="chat-error" role="alert">
                <span>{error}</span>
                {failed && (
                  <button type="button" className="chat-retry" onClick={() => void sendText(failed, true)}>
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
          {!sending && lastIsAssistant && (
            <div className="chat-starters" aria-label="Suggested questions">
              {starters.map((s) => (
                <button key={s} type="button" className="starter-chip" onClick={() => void sendText(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <form className="chat-form" onSubmit={submit}>
            <label htmlFor="chat-input" className="visually-hidden">Message</label>
            <input
              id="chat-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={onProductPage ? 'Ask about this item…' : 'Ask about a hoodie, size or colour…'}
              maxLength={1000}
              autoComplete="off"
            />
            <button type="submit" className="chat-send" disabled={!draft.trim() || sending} aria-label="Send">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="chat-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="chat-panel"
      >
        {open ? (
          <span className="chat-toggle-close" aria-hidden="true">×</span>
        ) : (
          <>
            <span className="chat-toggle-icon"><ChatIcon /></span>
            <span className="chat-toggle-label">
              <strong>Ask the shop</strong>
              <small>Sizes, stock &amp; colours</small>
            </span>
          </>
        )}
        <span className="visually-hidden">{open ? 'Close chat' : ''}</span>
      </button>
    </div>
  )
}
