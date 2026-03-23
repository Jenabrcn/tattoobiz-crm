import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  ShoppingBag,
} from 'lucide-react'
import { useClientsData } from '../hooks/useClientsData'
import type { TagFilter, ClientWithStats } from '../hooks/useClientsData'
import AddClientModal from '../components/AddClientModal'
import EditClientModal from '../components/EditClientModal'

const AVATAR_COLORS = ['#F26522', '#1A1F3D', '#16a34a', '#6366f1', '#ec4899', '#f59e0b']

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatCurrency(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDateFr(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TagBadge({ tag }: { tag: string | null }) {
  if (!tag) return <span className="text-xs text-text-muted">—</span>
  const colors: Record<string, string> = {
    'Nouveau': 'bg-blue-50 text-blue-600',
    'Régulier': 'bg-green/10 text-green',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${colors[tag] || 'bg-gray-100 text-text-muted'}`}>
      {tag}
    </span>
  )
}

export default function ClientsPage() {
  const data = useClientsData()
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editClient, setEditClient] = useState<ClientWithStats | null>(null)

  const tags: { label: string; value: TagFilter; count: number }[] = [
    { label: 'Tous', value: 'all', count: data.totalCount },
    { label: 'Régulier', value: 'Régulier', count: data.regulierCount },
    { label: 'Nouveau', value: 'Nouveau', count: data.nouveauCount },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Clients</h1>
          <p className="text-text-secondary mt-1">{data.totalCount} clients dans ta base</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
        >
          <Plus size={18} />
          Ajouter un client
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={data.search}
            onChange={e => data.setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap">
        {tags.map(t => (
          <button
            key={t.value}
            onClick={() => data.setTagFilter(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              data.tagFilter === t.value
                ? 'bg-accent text-white'
                : 'bg-white border border-border text-text-secondary hover:bg-gray-50'
            }`}
          >
            {t.label} <span className="ml-1 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-light">
            <Users size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold text-navy">{data.totalCount}</p>
            <p className="text-xs text-text-muted">Total clients</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green/10">
            <UserPlus size={18} className="text-green" />
          </div>
          <div>
            <p className="text-lg font-bold text-navy">{data.clientsThisMonth}</p>
            <p className="text-xs text-text-muted">Clients ce mois</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <ShoppingBag size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-navy">{formatCurrency(data.avgBasket)}</p>
            <p className="text-xs text-text-muted">Panier moyen</p>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      {data.loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : data.clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Users size={48} className="mx-auto text-text-muted mb-4" />
          <h2 className="text-lg font-semibold text-navy mb-2">Aucun client</h2>
          <p className="text-text-muted">Ajoutez votre premier client pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Client</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Dernier RDV</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Total dépensé</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Tag</th>
                  <th className="text-right text-xs font-medium text-text-muted px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map(client => {
                  const fullName = `${client.first_name} ${client.last_name}`
                  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
                  const color = getAvatarColor(fullName)
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-border last:border-b-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-navy">{fullName}</p>
                            <p className="text-xs text-text-muted">
                              {client.email || '—'}
                              {client.city && <span className="ml-2">· {client.city}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">
                        {formatDateFr(client.last_appointment)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-navy">
                        {formatCurrency(client.total_spent)}
                      </td>
                      <td className="px-5 py-3.5">
                        <TagBadge tag={client.tag} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`) }}
                            className="p-2 rounded-lg text-text-muted hover:bg-gray-100 hover:text-accent transition-colors"
                            title="Voir"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditClient(client) }}
                            className="p-2 rounded-lg text-text-muted hover:bg-gray-100 hover:text-accent transition-colors"
                            title="Modifier"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
              <p className="text-sm text-text-muted">
                Page {data.page} sur {data.totalPages} ({data.allClients.length} résultats)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => data.setPage(data.page - 1)}
                  disabled={data.page === 1}
                  className="p-2 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => data.setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === data.page
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => data.setPage(data.page + 1)}
                  disabled={data.page === data.totalPages}
                  className="p-2 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddClientModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={data.refresh}
      />
      <EditClientModal
        open={!!editClient}
        client={editClient}
        onClose={() => setEditClient(null)}
        onUpdated={data.refresh}
      />
    </div>
  )
}
