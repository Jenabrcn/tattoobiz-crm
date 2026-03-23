import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash
    // and creates a session via onAuthStateChange RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if there's already a session (page refresh after recovery)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
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
              <h2 className="text-lg font-semibold text-navy">Mot de passe modifié !</h2>
              <p className="text-sm text-text-secondary">
                Ton mot de passe a été mis à jour avec succès.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors text-sm mt-4"
              >
                Aller au dashboard →
              </button>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-8 space-y-4">
              <Lock className="w-10 h-10 text-text-muted mx-auto" />
              <p className="text-sm text-text-muted">Chargement...</p>
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
