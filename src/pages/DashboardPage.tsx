import { useState, useRef, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Bell,
  Calendar,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDashboardData, getEvolution } from '../hooks/useDashboardData'
import type { PeriodPreset, DateRange } from '../hooks/useDashboardData'

function formatCurrency(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function EvoBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-gray-100">—</span>
  const positive = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${positive ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positive ? '+' : ''}{value}%
    </span>
  )
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function getPeriodLabel(dateRange: DateRange): string {
  switch (dateRange.preset) {
    case 'this_month': return 'Ce mois'
    case 'last_30_days': return '30 derniers jours'
    case 'last_month': return 'Mois dernier'
    case 'all_time': return 'Depuis le début'
    case 'custom': {
      const fmtShort = (d: string) =>
        new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      return `${fmtShort(dateRange.from)} — ${fmtShort(dateRange.to)}`
    }
  }
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_month', label: 'Ce mois' },
  { value: 'last_30_days', label: '30 derniers jours' },
  { value: 'last_month', label: 'Mois dernier' },
  { value: 'all_time', label: 'Depuis le début' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClientsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-lg p-3" style={{ border: '1px solid rgba(26,31,61,0.07)' }}>
      <p className="text-xs font-semibold text-navy mb-1.5">{label}</p>
      <p className="text-sm font-bold text-navy">{d.value} client{d.value !== 1 ? 's' : ''} ajouté{d.value !== 1 ? 's' : ''}</p>
      <div className="flex gap-3 mt-1 text-xs text-text-muted">
        <span>Nouveaux : {d.nouveaux}</span>
        <span>Réguliers : {d.reguliers}</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const data = useDashboardData()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const periodLabel = getPeriodLabel(data.dateRange)

  const handlePreset = (preset: PeriodPreset) => {
    data.setPreset(preset)
    setCustomFrom('')
    setCustomTo('')
    setDropdownOpen(false)
  }

  const handleApply = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      data.setCustomRange(customFrom, customTo)
      setDropdownOpen(false)
    }
  }

  const handleClear = () => {
    data.setPreset('this_month')
    setCustomFrom('')
    setCustomTo('')
    setDropdownOpen(false)
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-text-secondary">{data.error}</p>
        <button
          onClick={data.retry}
          className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors"
        >
          Rafraîchir
        </button>
      </div>
    )
  }

  const revenueEvo = getEvolution(data.currentMonth.revenue, data.previousMonth.revenue)
  const expenseEvo = getEvolution(data.currentMonth.expenses, data.previousMonth.expenses)
  const netEvo = getEvolution(data.currentMonth.net, data.previousMonth.net)
  const clientsEvo = getEvolution(data.clientsThisMonth, data.clientsLastMonth)

  // Pie chart data
  const marginPct = data.currentMonth.revenue > 0
    ? Math.round((data.currentMonth.net / data.currentMonth.revenue) * 100)
    : 0
  const pieData = [
    { name: 'Bénéfice', value: Math.max(data.currentMonth.net, 0), color: '#16a34a' },
    { name: 'Dépenses', value: data.currentMonth.expenses, color: '#dc2626' },
  ]

  // Today alert text
  const todayAlertText = data.todayAppointments.length > 0
    ? data.todayAppointments.map(a => `${a.client_first_name} à ${formatTime(a.time)}`).join(', ')
    : null

  // Period totals for charts
  const periodRevenue = data.revenueSeries.reduce((s, p) => s + p.value, 0)
  const periodClients = data.clientsSeries.reduce((s, p) => s + p.value, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Bonjour {data.firstName} 👋
          </h1>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-sm font-medium text-text-secondary bg-white border border-border px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Calendar size={16} className="text-accent" />
            {periodLabel}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-border shadow-lg p-4 z-50 w-80">
              <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">Période</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => handlePreset(p.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      data.dateRange.preset === p.value
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">Dates personnalisées</p>
              <div className="space-y-2 mb-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Date de début</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-gray-50 transition-colors"
                >
                  Effacer
                </button>
                <button
                  onClick={handleApply}
                  disabled={!customFrom || !customTo || customFrom > customTo}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today's appointments banner */}
      {data.todayAppointments.length > 0 && (
        <div className="bg-accent-light border border-accent/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <Bell size={18} className="text-accent shrink-0" />
          <p className="text-sm text-navy">
            <span className="font-semibold">Tu as {data.todayAppointments.length} rendez-vous aujourd'hui</span>
            {' — '}{todayAlertText}
          </p>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green/10">
              <DollarSign size={18} className="text-green" />
            </div>
            <EvoBadge value={revenueEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{formatCurrency(data.currentMonth.revenue)}</p>
          <p className="text-sm text-text-muted mt-1">Revenus</p>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red/10">
              <CreditCard size={18} className="text-red" />
            </div>
            <EvoBadge value={expenseEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{formatCurrency(data.currentMonth.expenses)}</p>
          <p className="text-sm text-text-muted mt-1">Dépenses</p>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green/10">
              <TrendingUp size={18} className="text-green" />
            </div>
            <EvoBadge value={netEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{formatCurrency(data.currentMonth.net)}</p>
          <p className="text-sm text-text-muted mt-1">Bénéfice net</p>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-accent-light">
              <Users size={18} className="text-accent" />
            </div>
            <EvoBadge value={clientsEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{data.clientsThisMonth}</p>
          <p className="text-sm text-text-muted mt-1">Clients</p>
        </div>
      </div>

      {/* Pie chart + Revenue chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Répartition revenus / dépenses</h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-navy">{marginPct}%</p>
                  <p className="text-xs text-text-muted">Marge</p>
                </div>
              </div>
            </div>
            <div className="ml-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green" />
                <div>
                  <p className="text-sm font-medium text-navy">Bénéfice</p>
                  <p className="text-xs text-text-muted">{formatCurrency(Math.max(data.currentMonth.net, 0))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red" />
                <div>
                  <p className="text-sm font-medium text-navy">Dépenses</p>
                  <p className="text-xs text-text-muted">{formatCurrency(data.currentMonth.expenses)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-1">Évolution du CA</h3>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xl font-bold text-navy">{formatCurrency(periodRevenue)}</p>
            <EvoBadge value={revenueEvo} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.revenueSeries}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F26522" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F26522" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#8C90A0' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid rgba(26,31,61,0.07)', fontSize: 12 }}
                formatter={(v) => [formatCurrency(Number(v)), 'CA']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#F26522"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clients chart — full width */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-navy mb-1">Clients sur la période</h3>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xl font-bold text-navy">{periodClients}</p>
          <EvoBadge value={clientsEvo} />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.clientsSeries}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#8C90A0' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<ClientsTooltip />} cursor={{ fill: 'rgba(242,101,34,0.06)' }} />
            <Bar dataKey="value" fill="#F26522" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
