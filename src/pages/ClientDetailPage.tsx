import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ClientDetailPage() {
  const { id } = useParams()

  return (
    <div>
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft size={18} />
        Retour aux clients
      </Link>

      <div className="bg-card rounded-xl border border-border p-8">
        <h1 className="text-2xl font-bold text-navy mb-2">Fiche client</h1>
        <p className="text-text-muted">ID : {id}</p>
        <p className="text-text-secondary mt-4">
          Les détails du client seront affichés ici.
        </p>
      </div>
    </div>
  )
}
