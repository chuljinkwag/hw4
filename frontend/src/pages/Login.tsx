import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'
import { Awning, Seal } from '../components/Decor.tsx'
import ProductImage from '../components/ProductImage.tsx'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <section className="page auth">
        <p className="eyebrow">Signed in</p>
        <h1>Welcome back, {user.first_name}.</h1>
        <p className="muted">You're logged in as {user.email}.</p>
        <Link to="/products" className="button">Continue shopping</Link>
      </section>
    )
  }

  return (
    <section className="page auth-split">
      <aside className="auth-panel" aria-hidden="true">
        <Awning />
        <div className="auth-panel-inner">
          <Seal size={84} />
          <p className="auth-panel-title">Welcome back to Bulldog Blue</p>
          <p>Your saved chats, sizes and questions pick up right where you left off.</p>
          <ProductImage src="/media/products/champion-reverse-weave-hoodie-1.jpg" alt="" className="auth-panel-image" />
        </div>
      </aside>
      <div className="auth">
      <p className="eyebrow">Welcome back</p>
      <h1>Log in</h1>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button type="submit" className="button" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="muted">
        New to Campus Customs? <Link to="/create-account">Create an account</Link>
      </p>
      </div>
    </section>
  )
}
