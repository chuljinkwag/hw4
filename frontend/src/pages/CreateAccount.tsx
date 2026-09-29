import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PASSWORD_RULES, type RegisterInput } from '../api.ts'
import { useAuth } from '../auth.tsx'
import { Awning, Seal } from '../components/Decor.tsx'
import ProductImage from '../components/ProductImage.tsx'

const EMPTY: RegisterInput = { first_name: '', last_name: '', email: '', password: '', confirm_password: '' }

export default function CreateAccount() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterInput>(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const passwordOk = PASSWORD_RULES.every((r) => r.test(form.password))
  const mismatch = form.confirm_password.length > 0 && form.confirm_password !== form.password

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!passwordOk) return setError('Please choose a password that meets every requirement below.')
    if (form.password !== form.confirm_password) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await register(form)
      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <section className="page auth">
        <p className="eyebrow">Signed in</p>
        <h1>You're already logged in, {user.first_name}.</h1>
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
          <p className="auth-panel-title">Join Bulldog Blue</p>
          <p>Save your conversations with our assistant, so it remembers what you were looking for next time.</p>
          <ProductImage src="/media/products/champion-reverse-weave-hoodie-1.jpg" alt="" className="auth-panel-image" />
        </div>
      </aside>
      <div className="auth">
      <p className="eyebrow">Join Bulldog Blue</p>
      <h1>Create account</h1>
      <form className="form" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            First name
            <input name="first_name" autoComplete="given-name" value={form.first_name} onChange={update} maxLength={60} required />
          </label>
          <label>
            Last name
            <input name="last_name" autoComplete="family-name" value={form.last_name} onChange={update} maxLength={60} required />
          </label>
        </div>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" value={form.email} onChange={update} required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update}
            maxLength={128}
            aria-describedby="password-rules"
            required
          />
        </label>
        <ul id="password-rules" className="password-rules">
          {PASSWORD_RULES.map((r) => {
            const met = r.test(form.password)
            return (
              <li key={r.label} className={met ? 'met' : undefined}>
                <span aria-hidden="true">{met ? '✓' : '·'}</span> {r.label}
                <span className="visually-hidden">{met ? ' (met)' : ' (not yet met)'}</span>
              </li>
            )
          })}
        </ul>
        <label>
          Confirm password
          <input
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={update}
            maxLength={128}
            aria-invalid={mismatch}
            required
          />
          {mismatch && <span className="hint hint-error">Passwords do not match.</span>}
        </label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button type="submit" className="button" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      </div>
    </section>
  )
}
