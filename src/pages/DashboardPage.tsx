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
import type { PeriodFilter } from '../hooks/useDashboardData'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const periodLabels: Record<PeriodFilter, string> = {
  month: 'Ce mois',
  '30d': '30j',
  '3m': '3 mois',
  '12m': '12 mois',
}

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

function formatDateFr(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

const AVATAR_COLORS = ['#F26522', '#1A1F3D', '#16a34a', '#6366f1', '#ec4899', '#f59e0b']

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function DashboardPage() {
  const data = useDashboardData()
  const now = new Date()
  const monthLabel = `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`

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

  // Period revenue total
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
        <span className="flex items-center gap-2 text-sm font-medium text-text-secondary bg-white border border-border px-4 py-2 rounded-xl">
          <Calendar size={16} className="text-accent" />
          {monthLabel}
        </span>
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
        {/* Revenue */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green/10">
              <DollarSign size={18} className="text-green" />
            </div>
            <EvoBadge value={revenueEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{formatCurrency(data.currentMonth.revenue)}</p>
          <p className="text-sm text-text-muted mt-1">Revenus du mois</p>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red/10">
              <CreditCard size={18} className="text-red" />
            </div>
            <EvoBadge value={expenseEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{formatCurrency(data.currentMonth.expenses)}</p>
          <p className="text-sm text-text-muted mt-1">Dépenses du mois</p>
        </div>

        {/* Net */}
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

        {/* Clients this month */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-accent-light">
              <Users size={18} className="text-accent" />
            </div>
            <EvoBadge value={clientsEvo} />
          </div>
          <p className="text-2xl font-bold text-navy">{data.clientsThisMonth}</p>
          <p className="text-sm text-text-muted mt-1">Clients ce mois</p>
        </div>
      </div>

      {/* Pie chart + Total clients */}
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

        {/* Total clients */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Clients</h3>
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <p className="text-6xl font-bold text-navy">{data.totalClients}</p>
              <p className="text-sm text-text-muted mt-2">clients au total</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold text-navy">{data.regularClients}</p>
              <p className="text-xs text-text-muted">Réguliers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy">{data.activeProjects}</p>
              <p className="text-xs text-text-muted">Projets en cours</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy">{data.newClients}</p>
              <p className="text-xs text-text-muted">Nouveaux</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts: Revenue + Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-navy">Évolution du CA</h3>
            <div className="flex gap-1">
              {(Object.keys(periodLabels) as PeriodFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => data.setPeriodFilter(f)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    data.periodFilter === f
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:bg-gray-100'
                  }`}
                >
                  {periodLabels[f]}
                </button>
              ))}
            </div>
          </div>
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

        {/* Clients chart */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-navy">Clients sur la période</h3>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xl font-bold text-navy">{periodClients}</p>
            <EvoBadge value={clientsEvo} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.clientsSeries}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#8C90A0' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid rgba(26,31,61,0.07)', fontSize: 12 }}
                formatter={(v) => [Number(v), 'Clients']}
              />
              <Bar dataKey="value" fill="#F26522" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming appointments + Recent clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming appointments */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Prochains rendez-vous</h3>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">Aucun rendez-vous à venir</p>
          ) : (
            <div className="space-y-4">
              {data.upcomingAppointments.map(appt => (
                <div key={appt.id} className="flex items-start gap-4">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-xs font-bold text-accent uppercase">
                      {formatDateFr(appt.date)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy">
                      {appt.client_first_name} {appt.client_last_name}
                    </p>
                    {appt.description && (
                      <p className="text-xs text-text-muted truncate">{appt.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary font-medium bg-background px-2.5 py-1 rounded-lg">
                    {formatTime(appt.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Clients récents</h3>
          {data.recentClients.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">Aucun client pour le moment</p>
          ) : (
            <div className="space-y-4">
              {data.recentClients.map(client => {
                const fullName = `${client.first_name} ${client.last_name}`
                const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
                const color = getAvatarColor(fullName)
                const detail = client.instagram || client.email || ''
                return (
                  <div key={client.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy">{fullName}</p>
                      {detail && <p className="text-xs text-text-muted truncate">{detail}</p>}
                    </div>
                    {client.tag && (
                      <span className="text-xs font-medium text-accent bg-accent-light px-2.5 py-1 rounded-lg">
                        {client.tag}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
