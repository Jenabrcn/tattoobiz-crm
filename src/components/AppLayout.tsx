import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  Settings,
  LogOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearDashboardCache } from '../hooks/useDashboardData'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/finances', label: 'Finances', icon: DollarSign },
  { to: '/settings', label: 'Réglages', icon: Settings },
]

export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; studio_name: string | null } | null>(null)

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
  }, [user])

  const handleSignOut = () => {
    clearDashboardCache()
    signOut()
    navigate('/login')
  }

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'User'
  const initials = profile
    ? `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase() || 'U'
    : 'U'

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - White */}
      <aside className="w-64 bg-white border-r border-border flex flex-col shrink-0">
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-light text-accent'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-navy'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Profile + Sign out */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy truncate">{displayName}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold bg-accent/10 text-accent px-1.5 py-0.5 rounded">Pro</span>
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
    </div>
  )
}
