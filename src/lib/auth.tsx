import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, generateCustomerId, type Profile } from './supabase'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        (async () => { await loadProfile(session.user.id) })()
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message || null }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        customer_id: generateCustomerId(),
        username,
        email,
        referral_code: username.toUpperCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000),
      })
      if (profileErr) return { error: profileErr.message }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
