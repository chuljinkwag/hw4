import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from './api.ts'

interface AuthState {
  user: api.User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: api.RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (email: string, password: string) => setUser(await api.login(email, password)), [])
  const register = useCallback(async (input: api.RegisterInput) => setUser(await api.register(input)), [])
  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- hook lives beside its provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
