import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, Calendar, DollarSign, LayoutDashboard, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

const features = [
  { icon: Users, label: 'Fiches clients', desc: 'Tout centralisé dans Tatboard' },
  { icon: Calendar, label: 'Agenda', desc: 'Planifiez via Tatboard' },
  { icon: DollarSign, label: 'Finances', desc: 'Suivez vos revenus sur Tatboard' },
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Tatboard en un coup d\'œil' },
]

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' }
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasDigit = /\d/.test(pw)
  const specialCount = (pw.match(/[^A-Za-z0-9]/g) || []).length
  if (pw.length >= 17 && hasUpper && hasLower && hasDigit && specialCount >= 2) return { level: 3, label: 'Fort', color: '#16a34a' }
  if (pw.length >= 12 && hasUpper && hasLower && hasDigit && specialCount >= 1) return { level: 2, label: 'Moyen', color: '#f59e0b' }
  return { level: 1, label: 'Faible', color: '#dc2626' }
}

function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect.',
    'Email not confirmed': 'Tu dois confirmer ton email avant de te connecter. Vérifie ta boîte mail.',
    'User already registered': 'Un compte existe déjà avec cet email.',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
    'Unable to validate email address: invalid format': 'Format d\'email invalide.',
    'Signup requires a valid password': 'Un mot de passe valide est requis.',
    'Rate limit exceeded': 'Trop de tentatives. Réessaie dans quelques minutes.',
    'For security purposes, you can only request this after 60 seconds.': 'Pour des raisons de sécurité, réessaie dans 60 secondes.',
    'New password should be different from the old password.': 'Le nouveau mot de passe doit être différent de l\'ancien.',
  }
  return translations[message] || message
}

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
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

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
      setError(translateAuthError(error.message))
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
      setError(translateAuthError(error.message))
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setSignupSuccess(true)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setSubmitting(false)
    if (error) {
      setResetError(translateAuthError(error.message))
    } else {
      setResetSent(true)
    }
  }

  const switchToSignup = () => { setActiveTab('signup'); setError(null); setSignupSuccess(false); setForgotPassword(false) }
  const switchToLogin = () => { setActiveTab('login'); setError(null); setSignupSuccess(false); setForgotPassword(false); setResetSent(false); setResetError(null) }

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
            {forgotPassword ? (
              /* === FORGOT PASSWORD === */
              resetSent ? (
                <div className="text-center py-4 space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle className="w-12 h-12 text-green" />
                  </div>
                  <h2 className="text-lg font-semibold text-navy">Email envoyé !</h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Un email de réinitialisation t'a été envoyé. Vérifie ta boîte mail.
                  </p>
                  <p className="text-sm text-text-muted">
                    Pense à vérifier tes spams si tu ne vois rien.
                  </p>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors text-sm mt-4"
                  >
                    Retour à la connexion →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-navy mb-1">Mot de passe oublié ?</h2>
                    <p className="text-sm text-text-muted">Entre ton email pour recevoir un lien de réinitialisation.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>

                  {resetError && <p className="text-sm text-red">{resetError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
                  >
                    {submitting ? '...' : 'Envoyer le lien de réinitialisation'}
                  </button>

                  <p className="text-center text-sm text-text-muted">
                    <button type="button" onClick={switchToLogin} className="text-accent font-medium hover:underline">
                      ← Retour à la connexion
                    </button>
                  </p>
                </form>
              )
            ) : activeTab === 'login' ? (
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
                      onClick={() => { setForgotPassword(true); setResetEmail(email); setResetError(null); setResetSent(false) }}
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
            ) : signupSuccess ? (
              /* === SIGNUP SUCCESS === */
              <div className="text-center py-4 space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-12 h-12 text-green" />
                </div>
                <h2 className="text-lg font-semibold text-navy">Inscription réussie ! 🎉</h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Tu vas recevoir un email de confirmation dans les prochaines minutes.
                  Clique sur le lien dans l'email pour activer ton compte.
                </p>
                <p className="text-sm text-text-muted">
                  Pense à vérifier tes spams si tu ne vois rien.
                </p>
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors text-sm mt-4"
                >
                  Aller à la connexion →
                </button>
              </div>
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
                  {password && (() => {
                    const strength = getPasswordStrength(password)
                    return (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-colors"
                              style={{ backgroundColor: i <= strength.level ? strength.color : '#e5e7eb' }}
                            />
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                      </div>
                    )
                  })()}
                </div>

                {error && <p className="text-sm text-red">{error}</p>}

                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => { setAcceptedTerms(e.target.checked); setTermsError(false) }}
                      className="mt-1 rounded border-border text-accent focus:ring-accent/30"
                    />
                    <span className="text-xs text-text-secondary leading-relaxed">
                      J'accepte les{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        conditions générales d'utilisation
                      </a>{' '}
                      et la{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        politique de confidentialité
                      </a>
                    </span>
                  </label>
                  {termsError && (
                    <p className="text-xs text-red mt-1">Tu dois accepter les conditions pour créer ton compte.</p>
                  )}
                </div>

                <div onClick={() => { if (!acceptedTerms) setTermsError(true) }}>
                  <button
                    type="submit"
                    disabled={submitting || !acceptedTerms}
                    className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
                  >
                    {submitting ? '...' : 'Créer mon compte →'}
                  </button>
                </div>

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
