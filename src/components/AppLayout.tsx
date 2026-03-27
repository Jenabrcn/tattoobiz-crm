import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  Settings,
  LogOut,
  Lock,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/finances', label: 'Finances', icon: DollarSign },
  { to: '/settings', label: 'Réglages', icon: Settings },
]

export function AppLayout() {
  const { user, signOut, profileVersion, subscription } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; studio_name: string | null } | null>(null)
  const [showTrialWarning, setShowTrialWarning] = useState(false)
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [blockerDismissed, setBlockerDismissed] = useState(false)

  const isBlocked = (subscription.plan === 'trial' && subscription.isTrialExpired) || subscription.plan === 'expired'
  const isOnSettings = location.pathname === '/settings'
  const isExpiredPro = subscription.plan === 'expired'

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('first_name, last_name, studio_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data)
      })
  }, [user, profileVersion])

  // Re-show blocker when navigating away from settings
  useEffect(() => {
    if (isBlocked && !isOnSettings && blockerDismissed) {
      setBlockerDismissed(false)
    }
  }, [location.pathname, isBlocked, isOnSettings, blockerDismissed])

  // Show trial warning once per session when 2 days or less remain
  useEffect(() => {
    if (
      subscription.plan === 'trial' &&
      !subscription.isTrialExpired &&
      subscription.daysLeft <= 2 &&
      !warningDismissed
    ) {
      setShowTrialWarning(true)
    }
  }, [subscription, warningDismissed])

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'User'
  const initials = profile
    ? `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase() || 'U'
    : 'U'

  // Plan badge
  const planBadge = subscription.plan === 'pro'
    ? <span className="text-[10px] font-semibold bg-green/10 text-green px-1.5 py-0.5 rounded">Pro</span>
    : subscription.isTrialExpired
    ? <span className="text-[10px] font-semibold bg-red/10 text-red px-1.5 py-0.5 rounded">Expiré</span>
    : <span className="text-[10px] font-semibold bg-accent/10 text-accent px-1.5 py-0.5 rounded">Essai</span>

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col shrink-0">
        <div className="p-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center overflow-hidden p-1">
              <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-lg font-semibold text-navy">Tatboard</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isSettingsLink = to === '/settings'
            const disabled = isBlocked && !isSettingsLink
            return (
              <NavLink
                key={to}
                to={disabled ? '#' : to}
                onClick={e => { if (disabled) e.preventDefault() }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    disabled
                      ? 'text-text-muted cursor-not-allowed opacity-50'
                      : isActive
                      ? 'bg-accent-light text-accent'
                      : 'text-text-secondary hover:bg-gray-50 hover:text-navy'
                  }`
                }
              >
                <Icon size={18} />
                {label}
                {disabled && <Lock size={14} className="ml-auto text-text-muted" />}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy truncate">{displayName}</p>
              <div className="flex items-center gap-1.5">
                {planBadge}
                {profile?.studio_name && (
                  <span className="text-xs text-text-muted truncate">{profile.studio_name}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-navy transition-colors w-full"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto relative">
        <Outlet />
      </main>

      {/* Full-screen blocker when trial/subscription expired */}
      {isBlocked && !blockerDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center overflow-hidden p-2 mb-6">
              <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-3">
              {isExpiredPro
                ? "Ton abonnement Pro a expiré"
                : "Ton essai gratuit de 7 jours est terminé"}
            </h1>
            <p className="text-text-secondary mb-8">
              {isExpiredPro
                ? "Pour retrouver l'accès à Tatboard et toutes tes données, réactive ton abonnement."
                : "Pour continuer à utiliser Tatboard et retrouver toutes tes données, passe à Pro."}
            </p>
            <button
              onClick={async () => {
                if (!user?.email) return
                const res = await fetch('/api/create-checkout-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id, email: user.email }),
                })
                const data = await res.json()
                if (data.url) window.location.href = data.url
              }}
              className="px-8 py-3 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors mb-4"
            >
              Passer à Pro — 19,99€/mois
            </button>
            <button
              onClick={() => { setBlockerDismissed(true); navigate('/settings') }}
              className="text-sm text-text-muted hover:text-accent transition-colors mb-3"
            >
              Aller aux réglages
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* Trial warning popup */}
      {showTrialWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-8 text-center">
            <p className="text-3xl mb-4">⚠️</p>
            <h2 className="text-lg font-bold text-navy mb-3">
              Ton essai gratuit se termine dans {subscription.daysLeft} jour{subscription.daysLeft > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Passe à Pro pour ne pas perdre l'accès à tes données.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTrialWarning(false); setWarningDismissed(true) }}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
              >
                Plus tard
              </button>
              <button
                onClick={async () => {
                  if (!user?.email) return
                  const res = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, email: user.email }),
                  })
                  const data = await res.json()
                  if (data.url) window.location.href = data.url
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors"
              >
                Passer à Pro — 19,99€/mois
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
