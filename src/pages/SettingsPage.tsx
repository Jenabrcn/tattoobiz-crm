import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Crown, Trash2, ExternalLink } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

async function handleCheckout(email: string, userId: string) {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email }),
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
}

async function handleManageSubscription(email: string) {
  const res = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
}

export default function SettingsPage() {
  const { user, signOut, refreshProfile, subscription } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDebug = searchParams.get('debug') === 'true'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    studio_name: '',
    studio_address: '',
    siret: '',
  })

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            studio_name: data.studio_name || '',
            studio_address: data.studio_address || '',
            siret: data.siret || '',
          })
        }
        setLoading(false)
      })
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          studio_name: form.studio_name.trim() || null,
          studio_address: form.studio_address.trim() || null,
          siret: form.siret.trim() || null,
        })
        .eq('id', user.id)

      setSaving(false)
      if (error) {
        setSaveError('Erreur lors de la sauvegarde.')
      } else {
        setSaved(true)
        refreshProfile()
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setSaving(false)
      setSaveError('Erreur réseau, réessaie.')
    }
  }

  const handleDelete = async () => {
    if (!user) return
    setDeleting(true)

    try {
      // Delete user data (cascade will handle related tables)
      await supabase.from('users').delete().eq('id', user.id)
    } catch {
      // Continue with sign-out even if delete fails server-side
    }

    signOut()
    navigate('/login')
  }

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Réglages</h1>
        <p className="text-text-secondary mt-1">Gère ton profil et ton abonnement</p>
      </div>

      {/* Mon profil */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-navy flex items-center gap-2 mb-5">
          <User size={18} className="text-accent" />
          Mon profil
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Prénom</label>
              <input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Ton prénom"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Nom</label>
              <input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Ton nom"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-background text-text-muted cursor-not-allowed"
            />
            <p className="text-xs text-text-muted mt-1">L'email ne peut pas être modifié</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Nom du studio</label>
            <input
              value={form.studio_name}
              onChange={e => set('studio_name', e.target.value)}
              placeholder="Mon studio"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Adresse du studio</label>
            <input
              value={form.studio_address}
              onChange={e => set('studio_address', e.target.value)}
              placeholder="12 rue de la Paix, 75002 Paris"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Numéro SIRET</label>
            <input
              value={form.siret}
              onChange={e => set('siret', e.target.value)}
              placeholder="123 456 789 00012"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {saved && (
              <span className="text-sm text-green font-medium">Profil mis à jour !</span>
            )}
            {saveError && (
              <span className="text-sm text-red font-medium">{saveError}</span>
            )}
          </div>
        </form>
      </div>

      {/* Mon abonnement */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-navy flex items-center gap-2 mb-5">
          <Crown size={18} className="text-accent" />
          Mon abonnement
        </h2>

        {subscription.plan === 'pro' ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-text-secondary">Plan actuel :</span>
              <span className="text-xs font-semibold bg-green/10 text-green px-3 py-1 rounded-lg">
                Pro ✓
              </span>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Tu es sur le plan Pro. Merci pour ta confiance !
            </p>
            <button
              onClick={() => user?.email && handleManageSubscription(user.email)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
            >
              <ExternalLink size={16} />
              Gérer mon abonnement
            </button>
          </>
        ) : subscription.isTrialExpired ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-text-secondary">Plan actuel :</span>
              <span className="text-xs font-semibold bg-red/10 text-red px-3 py-1 rounded-lg">
                Essai terminé
              </span>
            </div>
            <p className="text-sm text-navy font-medium mb-4">
              Ton essai gratuit est terminé.
            </p>
            <button
              onClick={() => user && handleCheckout(user.email!, user.id)}
              className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors"
            >
              Passer à Pro — 19,99€/mois
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-text-secondary">Plan actuel :</span>
              <span className="text-xs font-semibold bg-accent-light text-accent px-3 py-1 rounded-lg">
                Essai gratuit
              </span>
            </div>
            <p className="text-sm text-navy mb-3">
              Tu es en essai gratuit. Il te reste <strong>{subscription.daysLeft} jour{subscription.daysLeft > 1 ? 's' : ''}</strong> pour découvrir Tatboard.
            </p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.round(((7 - subscription.daysLeft) / 7) * 100)}%` }}
              />
            </div>
            <button
              onClick={() => user && handleCheckout(user.email!, user.id)}
              className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors"
            >
              Passer à Pro — 19,99€/mois
            </button>
          </>
        )}
      </div>

      {/* Debug trial (only with ?debug=true) */}
      {isDebug && user && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-amber-800 mb-3">Debug — Essai gratuit</h2>
          <p className="text-sm text-amber-700 mb-4">
            Plan : <strong>{subscription.plan}</strong> — Jours restants : <strong>{subscription.daysLeft}</strong> — Expiré : <strong>{subscription.isTrialExpired ? 'Oui' : 'Non'}</strong>
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                await supabase.from('users').update({
                  plan: 'trial',
                  trial_ends_at: yesterday.toISOString(),
                }).eq('id', user.id)
                refreshProfile()
                window.location.reload()
              }}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-red text-white hover:bg-red/90 transition-colors"
            >
              Simuler fin d'essai
            </button>
            <button
              onClick={async () => {
                const inSevenDays = new Date()
                inSevenDays.setDate(inSevenDays.getDate() + 7)
                await supabase.from('users').update({
                  plan: 'trial',
                  trial_ends_at: inSevenDays.toISOString(),
                }).eq('id', user.id)
                refreshProfile()
                window.location.reload()
              }}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-green text-white hover:bg-green/90 transition-colors"
            >
              Remettre essai +7 jours
            </button>
          </div>
        </div>
      )}

      {/* Supprimer mon compte */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-navy flex items-center gap-2 mb-3">
          <Trash2 size={18} className="text-red" />
          Zone dangereuse
        </h2>
        <p className="text-sm text-text-muted mb-4">
          La suppression de ton compte est irréversible. Toutes tes données seront définitivement effacées.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-red/30 text-red hover:bg-red/5 transition-colors"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-red/5 border border-red/20 rounded-xl">
            <p className="text-sm text-red flex-1">
              Es-tu sûr ? Cette action est irréversible.
            </p>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-red text-white hover:bg-red/90 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Suppression...' : 'Confirmer la suppression'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
