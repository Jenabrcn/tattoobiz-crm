import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface SubscriptionInfo {
  plan: string
  trialEndsAt: string | null
  isTrialExpired: boolean
  daysLeft: number
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profileVersion: number
  subscription: SubscriptionInfo
  refreshProfile: () => void
  signOut: () => void
}

const defaultSubscription: SubscriptionInfo = {
  plan: 'trial',
  trialEndsAt: null,
  isTrialExpired: false,
  daysLeft: 7,
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profileVersion: 0,
  subscription: defaultSubscription,
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
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription)

  const fetchSubscription = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('plan, trial_ends_at')
      .eq('id', userId)
      .single()

    if (data) {
      const plan = data.plan || 'trial'
      const trialEndsAt = data.trial_ends_at || null
      let isTrialExpired = false
      let daysLeft = 7

      if (plan === 'trial' && trialEndsAt) {
        const now = new Date()
        const end = new Date(trialEndsAt)
        const diff = end.getTime() - now.getTime()
        daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
        isTrialExpired = diff <= 0
      } else if (plan === 'pro') {
        isTrialExpired = false
        daysLeft = 0
      } else if (plan === 'expired') {
        isTrialExpired = true
        daysLeft = 0
      }

      setSubscription({ plan, trialEndsAt, isTrialExpired, daysLeft })
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 10_000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchSubscription(session.user.id)
      setLoading(false)
      clearTimeout(timeout)
    }).catch(() => {
      setLoading(false)
      clearTimeout(timeout)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          const u = session.user
          const meta = u.user_metadata || {}
          // Create profile only if it doesn't exist
          supabase.from('users').select('id').eq('id', u.id).single().then(({ data: existing }) => {
            if (!existing) {
              const trialEnd = new Date()
              trialEnd.setDate(trialEnd.getDate() + 7)
              supabase.from('users').insert({
                id: u.id,
                email: u.email!,
                first_name: meta.first_name || null,
                last_name: meta.last_name || null,
                studio_name: meta.studio_name || null,
                plan: 'trial',
                trial_ends_at: trialEnd.toISOString(),
              }).then(() => {
                fetchSubscription(u.id)
              })
            } else {
              fetchSubscription(u.id)
            }
          })
        }
      }
    )

    return () => {
      authSub.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) fetchSubscription(user.id)
  }, [user, profileVersion, fetchSubscription])

  const refreshProfile = useCallback(() => {
    setProfileVersion(v => v + 1)
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setSession(null)
    setSubscription(defaultSubscription)
    supabase.auth.signOut().catch(() => {})
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, profileVersion, subscription, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
