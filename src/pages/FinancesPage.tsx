import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Upload,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useFinancesData } from '../hooks/useFinancesData'
import type { TypeFilter, PeriodFilter, FinanceEntry } from '../hooks/useFinancesData'
import AddFinanceModal from '../components/AddFinanceModal'

function formatCurrency(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDateFr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EvoBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-text-muted">—</span>
  const positive = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-green' : 'text-red'}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positive ? '+' : ''}{value}%
    </span>
  )
}

const TYPE_TABS: { label: string; value: TypeFilter }[] = [
  { label: 'Tout', value: 'all' },
  { label: 'Revenus', value: 'revenu' },
  { label: 'Dépenses', value: 'depense' },
]

const PERIOD_TABS: { label: string; value: PeriodFilter }[] = [
  { label: 'Ce mois', value: 'month' },
  { label: '30 derniers jours', value: '30d' },
  { label: 'Mois dernier', value: 'last_month' },
  { label: 'Depuis le début', value: 'all' },
]

function getPeriodSubtitle(filter: PeriodFilter, customFrom: string, customTo: string): string {
  switch (filter) {
    case 'month': return 'Ce mois'
    case '30d': return '30 derniers jours'
    case 'last_month': return 'Mois dernier'
    case 'all': return 'Depuis le début'
    case 'custom': {
      const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      return customFrom && customTo ? `${fmt(customFrom)} — ${fmt(customTo)}` : 'Période personnalisée'
    }
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  carte: 'Carte',
  especes: 'Espèces',
  virement: 'Virement',
}

const CAT_COLORS: Record<string, string> = {
  'Loyer': '#dc2626',
  'Pub': '#f59e0b',
  'Matériel': '#6366f1',
  'Abonnements': '#ec4899',
  'Divers': '#8C90A0',
}

export default function FinancesPage() {
  const data = useFinancesData()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FinanceEntry | null>(null)
  const [editEntry, setEditEntry] = useState<FinanceEntry | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [tempFrom, setTempFrom] = useState('')
  const [tempTo, setTempTo] = useState('')
  const customDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showCustomDates) return
    const handler = (e: MouseEvent) => {
      if (customDropdownRef.current && !customDropdownRef.current.contains(e.target as Node)) {
        setShowCustomDates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCustomDates])

  const periodSubtitle = getPeriodSubtitle(data.periodFilter, data.customFrom, data.customTo)

  const handleExport = () => {
    const rows = data.allFilteredEntries.map(e => ({
      Date: e.date,
      Description: e.description || '',
      Client: e.client_name || '',
      Type: e.type,
      Montant: e.amount,
      Paiement: PAYMENT_LABELS[e.payment_method] || e.payment_method,
      Catégorie: e.category || '',
    }))

    const headers = Object.keys(rows[0] || {})
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(';')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finances-${data.periodFilter}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Finances</h1>
          <p className="text-text-secondary mt-1">Ta compta simplifiée — {periodSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Exporter
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
          >
            <Plus size={18} />
            Ajouter une entrée
          </button>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          emoji="💰"
          label="Revenus"
          value={formatCurrency(data.curRevenue)}
          valueColor="text-green"
          evo={data.revenueEvo}
        />
        <StatCard
          emoji="📉"
          label="Dépenses"
          value={formatCurrency(data.curExpenses)}
          valueColor="text-red"
          evo={data.expenseEvo}
        />
        <StatCard
          emoji="✨"
          label="Bénéfice net"
          value={formatCurrency(data.curNet)}
          valueColor="text-accent"
          evo={data.netEvo}
        />
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type tabs */}
          <div className="flex gap-1">
            {TYPE_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => data.setTypeFilter(t.value)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                  data.typeFilter === t.value
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Period */}
            <div className="flex gap-1">
              {PERIOD_TABS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { data.setPeriodFilter(p.value); setShowCustomDates(false) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    data.periodFilter === p.value
                      ? 'bg-navy text-white'
                      : 'text-text-muted hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="relative" ref={customDropdownRef}>
                <button
                  onClick={() => setShowCustomDates(!showCustomDates)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                    data.periodFilter === 'custom'
                      ? 'bg-navy text-white'
                      : 'text-text-muted hover:bg-gray-100'
                  }`}
                >
                  <Calendar size={12} />
                  Personnalisée
                </button>
                {showCustomDates && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-border shadow-lg p-4 z-50 w-72">
                    <div className="space-y-2 mb-4">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Date de début</label>
                        <input
                          type="date"
                          value={tempFrom}
                          onChange={e => setTempFrom(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Date de fin</label>
                        <input
                          type="date"
                          value={tempTo}
                          onChange={e => setTempTo(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTempFrom('')
                          setTempTo('')
                          data.setPeriodFilter('month')
                          setShowCustomDates(false)
                        }}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-gray-50 transition-colors"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => {
                          if (tempFrom && tempTo && tempFrom <= tempTo) {
                            data.setCustomRange(tempFrom, tempTo)
                            setShowCustomDates(false)
                          }
                        }}
                        disabled={!tempFrom || !tempTo || tempFrom > tempTo}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={data.search}
                onChange={e => data.setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2 rounded-xl border border-border text-sm w-48 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {data.loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : data.entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-text-muted">Aucune entrée pour cette période.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Date</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Description</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Client</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Paiement</th>
                  <th className="text-right text-xs font-medium text-text-muted px-5 py-3.5">Montant</th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3.5">Type</th>
                  <th className="text-right text-xs font-medium text-text-muted px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map(entry => (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-b-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{formatDateFr(entry.date)}</td>
                    <td className="px-5 py-3.5 text-sm text-navy">{entry.description || '—'}</td>
                    <td className="px-5 py-3.5 text-sm">
                      {entry.client_id ? (
                        <button
                          onClick={() => navigate(`/clients/${entry.client_id}`)}
                          className="text-accent hover:underline"
                        >
                          {entry.client_name}
                        </button>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {PAYMENT_LABELS[entry.payment_method] || entry.payment_method}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-medium text-right ${
                      entry.type === 'depense' ? 'text-red' : 'text-green'
                    }`}>
                      {entry.type === 'depense' ? '-' : '+'}{formatCurrency(entry.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <TypeBadge type={entry.type} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedEntry(entry); setConfirmDeleteId(null) }}
                          className="p-2 rounded-lg text-text-muted hover:bg-gray-100 hover:text-accent transition-colors"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setEditEntry(entry)}
                          className="p-2 rounded-lg text-text-muted hover:bg-gray-100 hover:text-accent transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stacked bar chart */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Revenus vs Dépenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthBars}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#8C90A0' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid rgba(26,31,61,0.07)', fontSize: 12 }}
                formatter={(v, name) => [
                  formatCurrency(Number(v)),
                  name === 'revenue' ? 'Revenus' : 'Dépenses',
                ]}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-text-secondary">
                    {value === 'revenue' ? 'Revenus' : 'Dépenses'}
                  </span>
                )}
              />
              <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="expenses" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top expenses */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Top dépenses</h3>
          {data.topExpenses.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Aucune dépense sur cette période</p>
          ) : (
            <div className="space-y-3">
              {data.topExpenses.map(cat => {
                const color = CAT_COLORS[cat.category] || CAT_COLORS['Divers']
                const pct = data.totalExpenses > 0
                  ? Math.round((cat.amount / data.totalExpenses) * 100)
                  : 0
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm text-navy">{cat.category}</span>
                      </div>
                      <span className="text-sm font-medium text-red">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="pt-3 mt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy">
                    Total : {formatCurrency(data.totalExpenses)}
                  </span>
                  <span className="text-sm text-text-muted">
                    Budget restant :{' '}
                    <span className="font-medium text-navy">
                      {data.curRevenue > 0
                        ? Math.round(((data.curRevenue - data.curExpenses) / data.curRevenue) * 100)
                        : 0}% marge
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-green rounded-full transition-all"
                    style={{
                      width: `${data.curRevenue > 0
                        ? Math.min(100, Math.round(((data.curRevenue - data.curExpenses) / data.curRevenue) * 100))
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AddFinanceModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={data.refresh}
      />

      {/* Detail popup */}
      {selectedEntry && !editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-navy">Détails de l'entrée</h2>
              <button onClick={() => setSelectedEntry(null)} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <DetailRow label="Date" value={formatDateFr(selectedEntry.date)} />
              <DetailRow label="Type" value={
                selectedEntry.type === 'depense' ? 'Dépense' :
                selectedEntry.type === 'arrhes' ? 'Revenu — Arrhes' : 'Revenu — Solde'
              } />
              <DetailRow label="Montant" value={`${selectedEntry.type === 'depense' ? '-' : '+'}${formatCurrency(selectedEntry.amount)}`} />
              <DetailRow label="Paiement" value={PAYMENT_LABELS[selectedEntry.payment_method] || selectedEntry.payment_method} />
              {selectedEntry.client_name && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Client</span>
                  <button
                    onClick={() => { setSelectedEntry(null); navigate(`/clients/${selectedEntry.client_id}`) }}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    {selectedEntry.client_name}
                  </button>
                </div>
              )}
              {selectedEntry.category && <DetailRow label="Catégorie" value={selectedEntry.category} />}
              {selectedEntry.description && (
                <div className="py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Description</span>
                  <p className="text-sm text-navy mt-1">{selectedEntry.description}</p>
                </div>
              )}
              {selectedEntry.invoice_url && (
                <div className="py-2">
                  <a
                    href={selectedEntry.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                  >
                    <FileText size={16} />
                    Voir la facture
                  </a>
                </div>
              )}
            </div>
            {confirmDeleteId === selectedEntry.id ? (
              <div className="bg-red/5 border border-red/20 rounded-xl p-4">
                <p className="text-sm text-navy mb-3">Es-tu sûr de vouloir supprimer cette entrée ?</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors">
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      setDeleting(true)
                      await supabase.from('finances').delete().eq('id', selectedEntry.id)
                      setDeleting(false)
                      setSelectedEntry(null)
                      setConfirmDeleteId(null)
                      data.refresh()
                    }}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-red text-white hover:bg-red/90 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditEntry(selectedEntry); setSelectedEntry(null) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={16} />
                  Modifier
                </button>
                <button
                  onClick={() => setConfirmDeleteId(selectedEntry.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-red/30 text-red hover:bg-red/5 transition-colors"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editEntry && (
        <EditFinanceModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onUpdated={() => { setEditEntry(null); data.refresh() }}
        />
      )}
    </div>
  )
}

function StatCard({
  emoji,
  label,
  value,
  valueColor,
  evo,
}: {
  emoji: string
  label: string
  value: string
  valueColor: string
  evo: number
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{emoji}</span>
        <EvoBadge value={evo} />
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-navy">{value}</span>
    </div>
  )
}

const EDIT_PAYMENT_METHODS = [
  { value: 'carte', label: 'Carte' },
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
]

const EDIT_EXPENSE_CATEGORIES = ['Loyer', 'Matériel', 'Pub', 'Abonnements', 'Divers']

function EditFinanceModal({ entry, onClose, onUpdated }: { entry: FinanceEntry; onClose: () => void; onUpdated: () => void }) {
  const isRevenue = entry.type === 'revenu' || entry.type === 'arrhes'
  const [saving, setSaving] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    type: isRevenue ? 'revenu' : 'depense',
    subtype: entry.type === 'arrhes' ? 'arrhes' : 'solde',
    amount: String(entry.amount),
    description: entry.description || '',
    date: entry.date,
    payment_method: entry.payment_method,
    category: entry.category || '',
  })
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const dbType: 'revenu' | 'depense' | 'arrhes' = form.type === 'revenu' && form.subtype === 'arrhes' ? 'arrhes' : form.type as 'revenu' | 'depense'

    let invoiceUrl = entry.invoice_url
    if (invoiceFile && form.type !== 'depense') {
      const ext = invoiceFile.name.split('.').pop()
      const path = `${entry.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('invoices').upload(path, invoiceFile)
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path)
        invoiceUrl = urlData.publicUrl
      }
    }

    await supabase.from('finances').update({
      type: dbType,
      amount: parseFloat(form.amount),
      description: form.description.trim() || null,
      date: form.date,
      payment_method: form.payment_method,
      category: form.type === 'depense' ? (form.category || 'Divers') : null,
      invoice_url: form.type === 'depense' ? null : invoiceUrl,
    }).eq('id', entry.id)
    setSaving(false)
    onUpdated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-navy">Modifier l'entrée</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Type *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => set('type', 'revenu')}
                className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${form.type === 'revenu' ? 'bg-green/10 text-green border-green/30' : 'border-border text-text-muted hover:bg-gray-50'}`}>
                Revenu
              </button>
              <button type="button" onClick={() => set('type', 'depense')}
                className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${form.type === 'depense' ? 'bg-red/10 text-red border-red/30' : 'border-border text-text-muted hover:bg-gray-50'}`}>
                Dépense
              </button>
            </div>
          </div>
          {form.type === 'revenu' && (
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Sous-type</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => set('subtype', 'solde')}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${form.subtype === 'solde' ? 'bg-green/10 text-green border-green/30' : 'border-border text-text-muted hover:bg-gray-50'}`}>
                  Solde
                </button>
                <button type="button" onClick={() => set('subtype', 'arrhes')}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${form.subtype === 'arrhes' ? 'bg-accent-light text-accent border-accent/30' : 'border-border text-text-muted hover:bg-gray-50'}`}>
                  Arrhes
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Montant (€) *</label>
              <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Date *</label>
              <input required type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder={form.type === 'depense' ? 'Ex: Loyer studio, Encre...' : form.subtype === 'arrhes' ? 'Ex: Acompte tatouage bras...' : 'Ex: Reste tatouage bras...'}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Mode de paiement</label>
              <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                {EDIT_PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {form.type === 'depense' && (
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Catégorie</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                  <option value="">Sélectionner...</option>
                  {EDIT_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
          {form.type !== 'depense' && (
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Facture (optionnel)</label>
              {entry.invoice_url && !invoiceFile && (
                <a href={entry.invoice_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mb-2">
                  <FileText size={14} />
                  Facture existante
                </a>
              )}
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-text-muted cursor-pointer hover:border-accent hover:bg-accent-light/50 transition-colors">
                <Upload size={16} />
                {invoiceFile ? invoiceFile.name : 'Remplacer ou ajouter un fichier'}
                <input type="file" accept=".pdf,image/*" className="hidden"
                  onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: 'revenu' | 'depense' | 'arrhes' }) {
  if (type === 'depense') {
    return <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red/10 text-red">Dépense</span>
  }
  if (type === 'arrhes') {
    return <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600">Revenu — Arrhes</span>
  }
  return <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-green/10 text-green">Revenu — Solde</span>
}
