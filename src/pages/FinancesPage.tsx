import { DollarSign, Plus } from 'lucide-react'

export default function FinancesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Finances</h1>
          <p className="text-text-secondary mt-1">Suivi de vos revenus et dépenses</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors">
          <Plus size={18} />
          Nouvelle opération
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <DollarSign size={48} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-lg font-semibold text-navy mb-2">Aucune opération</h2>
        <p className="text-text-muted">
          Enregistrez votre première opération financière.
        </p>
      </div>
    </div>
  )
}
