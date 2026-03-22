import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, Calendar, DollarSign, LayoutDashboard, Lock, Eye, EyeOff } from 'lucide-react'

const features = [
  { icon: Users, label: 'Fiches clients', desc: 'Tout centralisé dans Tatboard' },
  { icon: Calendar, label: 'Agenda', desc: 'Planifiez via Tatboard' },
  { icon: DollarSign, label: 'Finances', desc: 'Suivez vos revenus sur Tatboard' },
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Tatboard en un coup d\'œil' },
]

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [studioName, setStudioName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else {
      navigate('/dashboard')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          studio_name: studioName || undefined,
        },
      },
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else {
      navigate('/dashboard')
    }
  }

  const switchToSignup = () => { setActiveTab('signup'); setError(null) }
  const switchToLogin = () => { setActiveTab('login'); setError(null) }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - 45% */}
      <div className="hidden lg:flex w-[45%] bg-white flex-col justify-between p-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center overflow-hidden p-1">
              <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-semibold text-navy">
              Tatboard
            </span>
          </div>

          {/* Hero Text */}
          <h1 className="font-display text-4xl leading-tight text-navy mb-6">
            Piloter son{' '}
            <span className="text-accent">Tattoo Biz</span>{' '}
            n'a jamais été aussi simple.
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-12 max-w-md">
            Clients, agenda, finances, tout centralisé. L'outil pensé par un tatoueur, pour les tatoueurs.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 p-4 rounded-xl bg-accent-light/60"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{f.label}</p>
                  <p className="text-xs text-text-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom security note */}
        <div className="flex items-center gap-2 text-text-muted text-sm mt-8">
          <Lock className="w-4 h-4" />
          <span>Données sécurisées · Hébergé en Europe</span>
        </div>
      </div>

      {/* Right Panel - 55% */}
      <div className="w-full lg:w-[55%] bg-[#F7F7F9] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center overflow-hidden p-1">
              <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-semibold text-navy">
              Tatboard
            </span>
          </div>

          {/* Tabs */}
          <div className="flex mb-8 bg-white rounded-xl p-1.5 shadow-sm">
            <button
              onClick={switchToLogin}
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-navy'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={switchToSignup}
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-navy'
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-border">
            {activeTab === 'login' ? (
              /* === LOGIN FORM === */
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-text-secondary">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      className="text-xs text-accent hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {submitting ? '...' : 'Se connecter →'}
                </button>

                <p className="text-center text-sm text-text-muted">
                  Pas encore de compte ?{' '}
                  <button type="button" onClick={switchToSignup} className="text-accent font-medium hover:underline">
                    Créer un compte
                  </button>
                </p>
              </form>
            ) : (
              /* === SIGNUP FORM === */
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Nom du studio <span className="text-text-muted font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    placeholder="Ink Studio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {submitting ? '...' : 'Créer mon compte →'}
                </button>

                <p className="text-center text-sm text-text-muted">
                  Déjà un compte ?{' '}
                  <button type="button" onClick={switchToLogin} className="text-accent font-medium hover:underline">
                    Se connecter
                  </button>
                </p>
              </form>
            )}
          </div>

          {/* Mobile security note */}
          <div className="flex items-center justify-center gap-2 text-text-muted text-xs mt-6 lg:hidden">
            <Lock className="w-3.5 h-3.5" />
            <span>Données sécurisées · Hébergé en Europe</span>
          </div>
        </div>
      </div>
    </div>
  )
}
