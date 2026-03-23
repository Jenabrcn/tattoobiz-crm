import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Crown, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const { user, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
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
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-text-secondary">Plan actuel :</span>
          <span className="text-xs font-semibold bg-gray-100 text-text-secondary px-3 py-1 rounded-lg">
            Free
          </span>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Tu es sur le plan Free. Passe à Pro pour débloquer toutes les fonctionnalités.
        </p>
        <button
          disabled
          className="px-6 py-2.5 bg-accent/40 text-white text-sm font-medium rounded-xl cursor-not-allowed"
        >
          Passer à Pro — Bientôt disponible
        </button>
      </div>

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
