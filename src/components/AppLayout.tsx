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

  const isBlocked = (subscription.plan === 'trial' && subscription.isTrialExpired) || subscription.plan === 'expired'
  const isOnSettings = location.pathname === '/settings'

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

  // Redirect to /settings when blocked and not already there
  useEffect(() => {
    if (isBlocked && !isOnSettings) {
      navigate('/settings', { replace: true })
    }
  }, [isBlocked, isOnSettings, navigate])

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
    : subscription.isTrialExpired || subscription.plan === 'expired'
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
                to={disabled ? '/settings' : to}
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
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>

      {/* Trial warning popup (J-2) */}
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
