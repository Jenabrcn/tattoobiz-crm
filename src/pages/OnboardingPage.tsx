import { Play } from 'lucide-react'

const tutorials = [
  {
    title: 'Ton premier client',
    description: 'Apprends à ajouter et gérer tes fiches clients',
    duration: '3 min',
  },
  {
    title: 'Gérer ton agenda',
    description: 'Planifie tes rendez-vous comme un pro',
    duration: '3 min',
  },
  {
    title: 'Suivre tes finances',
    description: 'Rentre tes revenus et dépenses facilement',
    duration: '3 min',
  },
  {
    title: 'Ton dashboard',
    description: 'Comprends tes stats en un coup d\'oeil',
    duration: '2 min',
  },
  {
    title: 'Les réglages',
    description: 'Personnalise ton espace Tatboard',
    duration: '2 min',
  },
]

export default function OnboardingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Bienvenue sur Tatboard 🎉</h1>
        <p className="text-text-secondary mt-1">
          Ces vidéos t'aident à prendre en main chaque fonctionnalité en quelques minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {tutorials.map((tuto) => (
          <div key={tuto.title} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/10 flex items-center justify-center mb-3">
                <Play size={24} className="text-text-muted ml-0.5" />
              </div>
              <p className="text-sm text-text-muted">Vidéo à venir</p>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-navy">{tuto.title}</h3>
              <p className="text-xs text-text-muted mt-1">{tuto.description}</p>
              <p className="text-xs text-text-muted mt-2">{tuto.duration}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-4">
        <p className="text-sm text-text-muted">
          Une question ? Envoie-moi un DM sur Instagram →{' '}
          <a
            href="https://instagram.com/jeanbruchlen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium hover:underline"
          >
            @jeanbruchlen
          </a>
        </p>
      </div>
    </div>
  )
}
