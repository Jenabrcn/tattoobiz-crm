import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)

  useEffect(() => {
    // Supabase PKCE flow: the recovery token arrives as query params
    // (e.g. ?code=...) or as a hash fragment (#access_token=...).
    // Calling getSession() after Supabase's JS client has processed
    // the URL will give us the recovery session.

    // Listen for the PASSWORD_RECOVERY event which fires when
    // Supabase processes the recovery token from the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    // Give Supabase client time to process the URL tokens,
    // then check for an existing session as fallback
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        // No session and no recovery event after timeout = invalid link
        setInvalidLink(true)
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.auth.updateUser({ password })

    setSubmitting(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F7F9] p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center overflow-hidden p-1">
            <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-semibold text-navy">Tatboard</span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-green" />
              </div>
              <h2 className="text-lg font-semibold text-navy">Mot de passe modifié avec succès !</h2>
              <p className="text-sm text-text-secondary">
                Tu vas être redirigé vers la page de connexion...
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors text-sm mt-4"
              >
                Aller à la connexion →
              </button>
            </div>
          ) : invalidLink ? (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-red" />
              </div>
              <h2 className="text-lg font-semibold text-navy">Lien expiré ou invalide</h2>
              <p className="text-sm text-text-secondary">
                Ce lien de réinitialisation n'est plus valide. Demande un nouveau lien depuis la page de connexion.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors text-sm mt-4"
              >
                Retour à la connexion →
              </button>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-8 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
              <p className="text-sm text-text-muted">Vérification du lien...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-navy mb-1">Nouveau mot de passe</h2>
                <p className="text-sm text-text-muted">Choisis un nouveau mot de passe pour ton compte.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Nouveau mot de passe
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

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-[#F7F7F9] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-sm text-red">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
              >
                {submitting ? '...' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
