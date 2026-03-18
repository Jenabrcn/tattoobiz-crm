import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Réglages</h1>
        <p className="text-text-secondary mt-1">Gérez votre profil et préférences</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-navy mb-4">Profil</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-muted"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Prénom
              </label>
              <input
                type="text"
                placeholder="Votre prénom"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Nom
              </label>
              <input
                type="text"
                placeholder="Votre nom"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nom du studio
            </label>
            <input
              type="text"
              placeholder="Mon studio"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>
          <button className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
