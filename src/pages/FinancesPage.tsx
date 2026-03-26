import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
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
import { useFinancesData } from '../hooks/useFinancesData'
import type { TypeFilter, PeriodFilter } from '../hooks/useFinancesData'
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
  { label: 'Arrhes', value: 'arrhes' },
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
  const [showModal, setShowModal] = useState(false)
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
          label="Revenus du mois"
          value={formatCurrency(data.curRevenue)}
          valueColor="text-green"
          evo={data.revenueEvo}
        />
        <StatCard
          emoji="📉"
          label="Dépenses du mois"
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
                </tr>
              </thead>
              <tbody>
                {data.entries.map(entry => (
                  <tr key={entry.id} className="border-b border-border last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{formatDateFr(entry.date)}</td>
                    <td className="px-5 py-3.5 text-sm text-navy">{entry.description || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{entry.client_name || '—'}</td>
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
          <h3 className="text-sm font-semibold text-navy mb-4">Revenus vs Dépenses — 6 derniers mois</h3>
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
          <h3 className="text-sm font-semibold text-navy mb-4">Top dépenses ce mois</h3>
          {data.topExpenses.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Aucune dépense ce mois</p>
          ) : (
            <div className="space-y-3">
              {data.topExpenses.map(cat => {
                const color = CAT_COLORS[cat.category] || CAT_COLORS['Divers']
                const pct = data.totalExpensesThisMonth > 0
                  ? Math.round((cat.amount / data.totalExpensesThisMonth) * 100)
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
                    Total : {formatCurrency(data.totalExpensesThisMonth)}
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

      {/* Modal */}
      <AddFinanceModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={data.refresh}
      />
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

function TypeBadge({ type }: { type: 'revenu' | 'depense' | 'arrhes' }) {
  const styles = {
    revenu: 'bg-green/10 text-green',
    depense: 'bg-red/10 text-red',
    arrhes: 'bg-accent-light text-accent',
  }
  const labels = {
    revenu: 'Revenu',
    depense: 'Dépense',
    arrhes: 'Arrhes',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}
