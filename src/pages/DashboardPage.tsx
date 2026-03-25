import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Bell,
  Calendar,
  X,
  Pencil,
  Trash2,
  Clock,
  ArrowRight,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useDashboardData, getEvolution } from '../hooks/useDashboardData'
import type { PeriodPreset, DateRange, UpcomingAppointment } from '../hooks/useDashboardData'

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

function getEndTime(time: string, durationMinutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMin = h * 60 + m + durationMinutes
  const eh = Math.floor(totalMin / 60) % 24
  const em = totalMin % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

const TYPE_LABELS: Record<string, string> = {
  tattoo: 'Séance tattoo',
  consultation: 'Consultation',
  retouche: 'Retouche',
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  tattoo:       { bg: 'bg-accent-light', text: 'text-accent', dot: 'bg-accent' },
  consultation: { bg: 'bg-gray-50', text: 'text-navy', dot: 'bg-navy' },
  retouche:     { bg: 'bg-green/5', text: 'text-green', dot: 'bg-green' },
}

const DURATION_LABELS: Record<string, string> = {
  '30': '30min', '60': '1h', '90': '1h30', '120': '2h', '150': '2h30',
  '180': '3h', '210': '3h30', '240': '4h', '270': '4h30', '300': '5h',
  '330': '5h30', '360': '6h',
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

type SelectedAppt = UpcomingAppointment & { date: string }

export default function DashboardPage() {
  const data = useDashboardData()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedAppt, setSelectedAppt] = useState<SelectedAppt | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteAppt = async (id: string) => {
    setDeleting(true)
    await supabase.from('appointments').delete().eq('id', id)
    setDeleting(false)
    setSelectedAppt(null)
    setConfirmDeleteId(null)
    data.retry()
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

  const marginPct = data.currentMonth.revenue > 0
    ? Math.round((data.currentMonth.net / data.currentMonth.revenue) * 100)
    : 0
  const pieData = [
    { name: 'Bénéfice', value: Math.max(data.currentMonth.net, 0), color: '#16a34a' },
    { name: 'Dépenses', value: data.currentMonth.expenses, color: '#dc2626' },
  ]

  return (
    <div className="space-y-8">
      {/* ===== SECTION 1: Header + Alerte RDV ===== */}
      <h1 className="text-2xl font-bold text-navy">
        Bonjour {data.firstName} 👋
      </h1>

      {data.todayAppointments.length > 0 && (
        <div className="bg-accent-light border border-accent/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <Bell size={18} className="text-accent shrink-0" />
          <p className="text-sm text-navy">
            <span className="font-semibold">Tu as {data.todayAppointments.length} rendez-vous aujourd'hui</span>
            {' — '}
            {data.todayAppointments.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ', '}
                <button
                  onClick={() => { setSelectedAppt(a); setConfirmDeleteId(null) }}
                  className="font-medium text-accent hover:underline"
                >
                  {a.client_first_name}
                </button>
                {' à '}{formatTime(a.time)}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ===== SECTION 2: Mes finances ===== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Mes finances</h2>
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

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-border p-8">
          <h3 className="text-sm font-semibold text-navy mb-6 text-center">Répartition bénéfice / dépenses</h3>
          <div className="flex items-center justify-center gap-12">
            <div className="relative">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
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
                  <p className="text-3xl font-bold text-navy">{marginPct}%</p>
                  <p className="text-xs text-text-muted">Marge</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-green" />
                <div>
                  <p className="text-sm font-medium text-navy">Bénéfice</p>
                  <p className="text-sm text-text-muted">{formatCurrency(Math.max(data.currentMonth.net, 0))}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-red" />
                <div>
                  <p className="text-sm font-medium text-navy">Dépenses</p>
                  <p className="text-sm text-text-muted">{formatCurrency(data.currentMonth.expenses)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: Mes prochains rendez-vous ===== */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-navy">Mes prochains rendez-vous</h2>

        {data.upcomingAppointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center">
            <Calendar size={32} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-muted">Aucun rendez-vous à venir</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {data.upcomingAppointments.map(appt => {
              const style = TYPE_STYLES[appt.type] || TYPE_STYLES.tattoo
              const endTime = getEndTime(appt.time, appt.duration_minutes)
              return (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => { setSelectedAppt(appt); setConfirmDeleteId(null) }}
                >
                  {/* Date */}
                  <div className="w-14 text-center shrink-0">
                    <p className="text-xs font-bold text-accent uppercase">
                      {new Date(appt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {new Date(appt.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                  </div>
                  {/* Time */}
                  <div className="shrink-0">
                    <div className="flex items-center gap-1 text-sm font-medium text-navy">
                      <Clock size={14} className="text-text-muted" />
                      {formatTime(appt.time)} - {endTime}
                    </div>
                  </div>
                  {/* Client + description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {appt.client_first_name} {appt.client_last_name}
                    </p>
                    {appt.description && (
                      <p className="text-xs text-text-muted truncate">{appt.description}</p>
                    )}
                  </div>
                  {/* Type badge */}
                  <span className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}>
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    {TYPE_LABELS[appt.type] || appt.type}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {data.upcomingAppointments.length >= 10 && (
          <div className="text-center">
            <Link
              to="/agenda"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Voir tous mes rendez-vous
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* ===== Appointment detail popup ===== */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedAppt(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-navy">Détails du rendez-vous</h2>
              <button onClick={() => setSelectedAppt(null)} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Client</span>
                <button
                  onClick={() => { setSelectedAppt(null); navigate(`/clients/${selectedAppt.client_id}`) }}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {selectedAppt.client_first_name} {selectedAppt.client_last_name}
                </button>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Date</span>
                <span className="text-sm font-medium text-navy">
                  {new Date(selectedAppt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Horaire</span>
                <span className="text-sm font-medium text-navy">
                  {formatTime(selectedAppt.time)} — {getEndTime(selectedAppt.time, selectedAppt.duration_minutes)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Durée</span>
                <span className="text-sm font-medium text-navy">
                  {DURATION_LABELS[String(selectedAppt.duration_minutes)] || `${selectedAppt.duration_minutes} min`}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Type</span>
                <span className="text-sm font-medium text-navy">{TYPE_LABELS[selectedAppt.type] || selectedAppt.type}</span>
              </div>
              {selectedAppt.description && (
                <div className="py-2">
                  <span className="text-sm text-text-secondary">Description</span>
                  <p className="text-sm text-navy mt-1">{selectedAppt.description}</p>
                </div>
              )}
            </div>
            {confirmDeleteId === selectedAppt.id ? (
              <div className="bg-red/5 border border-red/20 rounded-xl p-4">
                <p className="text-sm text-navy mb-3">Es-tu sûr de vouloir supprimer ce rendez-vous ?</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDeleteAppt(selectedAppt.id)}
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
                  onClick={() => { setSelectedAppt(null); navigate(`/clients/${selectedAppt.client_id}`) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={16} />
                  Voir le client
                </button>
                <button
                  onClick={() => setConfirmDeleteId(selectedAppt.id)}
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
    </div>
  )
}
