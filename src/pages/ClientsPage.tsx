import { Users, Plus } from 'lucide-react'

export default function ClientsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Clients</h1>
          <p className="text-text-secondary mt-1">Gérez votre clientèle</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors">
          <Plus size={18} />
          Nouveau client
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Users size={48} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-lg font-semibold text-navy mb-2">Aucun client</h2>
        <p className="text-text-muted">
          Ajoutez votre premier client pour commencer.
        </p>
      </div>
    </div>
  )
}
