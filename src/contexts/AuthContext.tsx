import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profileVersion: number
  refreshProfile: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profileVersion: 0,
  refreshProfile: () => {},
  signOut: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileVersion, setProfileVersion] = useState(0)

  useEffect(() => {
    // Timeout: never stay loading for more than 10s
    const timeout = setTimeout(() => setLoading(false), 10_000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      clearTimeout(timeout)
    }).catch(() => {
      setLoading(false)
      clearTimeout(timeout)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Ensure user profile exists in users table on first sign-in
        // Fire-and-forget: don't await to avoid blocking auth state updates
        if (event === 'SIGNED_IN' && session?.user) {
          const u = session.user
          const meta = u.user_metadata || {}
          supabase.from('users').upsert({
            id: u.id,
            email: u.email!,
            first_name: meta.first_name || null,
            last_name: meta.last_name || null,
            studio_name: meta.studio_name || null,
          }, { onConflict: 'id', ignoreDuplicates: false }).then(() => {
            // Silently ignore result — profile will be created on next sign-in if this fails
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const refreshProfile = useCallback(() => {
    setProfileVersion(v => v + 1)
  }, [])

  const signOut = useCallback(() => {
    // Clear state immediately so UI responds instantly
    setUser(null)
    setSession(null)
    // Then tell Supabase (fire-and-forget, don't block on network)
    supabase.auth.signOut().catch(() => {
      // Ignore errors — we've already cleared local state
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, profileVersion, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
