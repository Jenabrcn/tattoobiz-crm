import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface TodayAppointment {
  id: string
  time: string
  duration_minutes: number
  description: string | null
  type: string
  client_id: string
  client_first_name: string
  client_last_name: string
  date: string
}

interface MonthlyFinance {
  revenue: number
  expenses: number
  net: number
}

interface PeriodPoint {
  label: string
  value: number
}

export interface ClientSeriesPoint {
  label: string
  value: number
  nouveaux: number
  reguliers: number
}

export type PeriodPreset = 'this_month' | 'last_30_days' | 'last_month' | 'all_time' | 'custom'

export interface DateRange {
  from: string
  to: string
  preset: PeriodPreset
}

export interface UpcomingAppointment {
  id: string
  date: string
  time: string
  duration_minutes: number
  description: string | null
  type: string
  client_id: string
  client_first_name: string
  client_last_name: string
}

export interface DashboardData {
  loading: boolean
  error: string | null
  retry: () => void
  firstName: string
  todayAppointments: TodayAppointment[]
  upcomingAppointments: UpcomingAppointment[]
  currentMonth: MonthlyFinance
  previousMonth: MonthlyFinance
  clientsThisMonth: number
  clientsLastMonth: number
  revenueSeries: PeriodPoint[]
  clientsSeries: ClientSeriesPoint[]
  dateRange: DateRange
  setPreset: (p: PeriodPreset) => void
  setCustomRange: (from: string, to: string) => void
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export function getEvolution(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcFinances(rows: any[]): MonthlyFinance {
  const revenue = rows.filter(f => f.type === 'revenu' || f.type === 'arrhes').reduce((s, f) => s + Number(f.amount), 0)
  const expenses = rows.filter(f => f.type === 'depense').reduce((s, f) => s + Number(f.amount), 0)
  return { revenue, expenses, net: revenue - expenses }
}

function getDefaultRange(): DateRange {
  const now = new Date()
  return { from: fmtDate(startOfMonth(now)), to: fmtDate(now), preset: 'this_month' }
}

export function getRangeForPreset(preset: PeriodPreset): DateRange {
  const now = new Date()
  const today = fmtDate(now)
  switch (preset) {
    case 'this_month':
      return { from: fmtDate(startOfMonth(now)), to: today, preset }
    case 'last_30_days':
      return { from: fmtDate(new Date(now.getTime() - 30 * 86400000)), to: today, preset }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: fmtDate(s), to: fmtDate(e), preset }
    }
    case 'all_time':
      return { from: '2000-01-01', to: today, preset }
    default:
      return getDefaultRange()
  }
}

function getPreviousRange(range: DateRange): { from: string; to: string } {
  const fromDate = new Date(range.from)
  const toDate = new Date(range.to)
  const lengthMs = toDate.getTime() - fromDate.getTime()
  const prevTo = new Date(fromDate.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - lengthMs)
  return { from: fmtDate(prevFrom), to: fmtDate(prevTo) }
}

function getGroupBy(from: string, to: string): 'day' | 'week' | 'month' {
  const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000
  if (days <= 35) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

const FETCH_TIMEOUT = 10_000

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), FETCH_TIMEOUT)
    ),
  ])
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [currentMonth, setCurrentMonth] = useState<MonthlyFinance>({ revenue: 0, expenses: 0, net: 0 })
  const [previousMonth, setPreviousMonth] = useState<MonthlyFinance>({ revenue: 0, expenses: 0, net: 0 })
  const [clientsThisMonth, setClientsThisMonth] = useState(0)
  const [clientsLastMonth, setClientsLastMonth] = useState(0)
  const [revenueSeries, setRevenueSeries] = useState<PeriodPoint[]>([])
  const [clientsSeries, setClientsSeries] = useState<ClientSeriesPoint[]>([])
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange())
  const fetchIdRef = useRef(0)
  const [retryKey, setRetryKey] = useState(0)

  const retry = () => {
    setError(null)
    setLoading(true)
    setRetryKey(k => k + 1)
  }

  const setPreset = (preset: PeriodPreset) => {
    setDateRange(getRangeForPreset(preset))
  }

  const setCustomRange = (from: string, to: string) => {
    setDateRange({ from, to, preset: 'custom' })
  }

  useEffect(() => {
    if (!user) return
    const fetchId = ++fetchIdRef.current
    fetchAll(fetchId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange.from, dateRange.to, retryKey])

  async function fetchAll(fetchId: number) {
    if (!user) return
    setLoading(true)
    setError(null)

    const now = new Date()
    const today = fmtDate(now)

    const isAllTime = dateRange.preset === 'all_time'
    const prevRange = isAllTime ? null : getPreviousRange(dateRange)
    const groupBy = getGroupBy(dateRange.from, dateRange.to)

    const financeStart = prevRange ? prevRange.from : dateRange.from

    let profileResult, clientsResult, appointmentsResult, financesResult, upcomingResult
    try {
      ;[profileResult, clientsResult, appointmentsResult, financesResult, upcomingResult] = await withTimeout(Promise.all([
        supabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single(),
        supabase
          .from('clients')
          .select('id, first_name, last_name, tag, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('id, client_id, date, time, duration_minutes, description, type')
          .eq('date', today)
          .order('time'),
        supabase
          .from('finances')
          .select('type, date, amount')
          .gte('date', financeStart)
          .lte('date', dateRange.to)
          .order('date'),
        supabase
          .from('appointments')
          .select('id, client_id, date, time, duration_minutes, description, type')
          .gte('date', today)
          .order('date')
          .order('time')
          .limit(10),
      ]))
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      const isTimeout = err instanceof Error && err.message === 'TIMEOUT'
      setError(isTimeout ? 'La connexion est lente, réessaie.' : 'Erreur de chargement des données.')
      setLoading(false)
      return
    }

    if (fetchId !== fetchIdRef.current) return

    const queryError = profileResult.error || clientsResult.error || appointmentsResult.error || financesResult.error || upcomingResult.error
    if (queryError) {
      if (queryError.message?.includes('JWT') || queryError.message?.includes('token') || queryError.code === 'PGRST301') {
        supabase.auth.signOut()
        return
      }
      setError('Erreur de chargement des données.')
      setLoading(false)
      return
    }

    // --- Profile ---
    const profile = profileResult.data as { first_name: string | null } | null
    const fName = profile?.first_name || user.email?.split('@')[0] || ''

    // --- Clients ---
    const allClients = (clientsResult.data || []) as { id: string; first_name: string; last_name: string; tag: string | null; created_at: string }[]
    const clientMap = new Map(allClients.map(c => [c.id, c]))

    const periodClients = allClients.filter(c => {
      const d = c.created_at.split('T')[0]
      return d >= dateRange.from && d <= dateRange.to
    })
    const prevPeriodClients = prevRange
      ? allClients.filter(c => {
          const d = c.created_at.split('T')[0]
          return d >= prevRange.from && d <= prevRange.to
        })
      : []

    // --- Today's appointments ---
    const todayAppts = (appointmentsResult.data || []) as { id: string; client_id: string; date: string; time: string; duration_minutes: number; description: string | null; type: string }[]
    const todayEnriched = todayAppts.map(a => {
      const c = clientMap.get(a.client_id)
      return {
        id: a.id,
        time: a.time,
        duration_minutes: a.duration_minutes,
        description: a.description,
        type: a.type,
        client_id: a.client_id,
        client_first_name: c?.first_name || '',
        client_last_name: c?.last_name || '',
        date: a.date,
      }
    })

    // --- Upcoming appointments (independent of period filter) ---
    const upcomingAppts = (upcomingResult.data || []) as { id: string; client_id: string; date: string; time: string; duration_minutes: number; description: string | null; type: string }[]
    const upcomingEnriched: UpcomingAppointment[] = upcomingAppts.map(a => {
      const c = clientMap.get(a.client_id)
      return {
        id: a.id,
        date: a.date,
        time: a.time,
        duration_minutes: a.duration_minutes,
        description: a.description,
        type: a.type,
        client_id: a.client_id,
        client_first_name: c?.first_name || '',
        client_last_name: c?.last_name || '',
      }
    })

    // --- Finances ---
    const allFinances = (financesResult.data || []) as { type: string; date: string; amount: number }[]
    const curPeriodFinances = allFinances.filter(f => f.date >= dateRange.from && f.date <= dateRange.to)
    const prevPeriodFinances = prevRange
      ? allFinances.filter(f => f.date >= prevRange.from && f.date <= prevRange.to)
      : []

    // --- Time series ---
    const seriesStart = new Date(dateRange.from)
    const seriesEnd = new Date(dateRange.to)

    const revenueMap = new Map<string, number>()
    curPeriodFinances.forEach(f => {
      if (f.type === 'revenu' || f.type === 'arrhes') {
        const key = getGroupKey(f.date, groupBy)
        revenueMap.set(key, (revenueMap.get(key) || 0) + Number(f.amount))
      }
    })

    const clientsTotalMap = new Map<string, number>()
    const clientsNouveauxMap = new Map<string, number>()
    const clientsReguliersMap = new Map<string, number>()
    periodClients.forEach(c => {
      const key = getGroupKey(c.created_at.split('T')[0], groupBy)
      clientsTotalMap.set(key, (clientsTotalMap.get(key) || 0) + 1)
      if (c.tag === 'Nouveau') {
        clientsNouveauxMap.set(key, (clientsNouveauxMap.get(key) || 0) + 1)
      } else if (c.tag === 'Régulier') {
        clientsReguliersMap.set(key, (clientsReguliersMap.get(key) || 0) + 1)
      }
    })

    const allKeys = generateKeys(seriesStart, seriesEnd, groupBy)
    const revSeries = allKeys.map(k => ({ label: k, value: revenueMap.get(k) || 0 }))
    const cliSeries: ClientSeriesPoint[] = allKeys.map(k => ({
      label: k,
      value: clientsTotalMap.get(k) || 0,
      nouveaux: clientsNouveauxMap.get(k) || 0,
      reguliers: clientsReguliersMap.get(k) || 0,
    }))

    if (fetchId !== fetchIdRef.current) return

    // --- Update state ---
    setFirstName(fName)
    setTodayAppointments(todayEnriched)
    setUpcomingAppointments(upcomingEnriched)
    setCurrentMonth(calcFinances(curPeriodFinances))
    setPreviousMonth(calcFinances(prevPeriodFinances))
    setClientsThisMonth(periodClients.length)
    setClientsLastMonth(prevPeriodClients.length)
    setRevenueSeries(revSeries)
    setClientsSeries(cliSeries)
    setLoading(false)
    setError(null)
  }

  return {
    loading,
    error,
    retry,
    firstName,
    todayAppointments,
    upcomingAppointments,
    currentMonth,
    previousMonth,
    clientsThisMonth,
    clientsLastMonth,
    revenueSeries,
    clientsSeries,
    dateRange,
    setPreset,
    setCustomRange,
  }
}

function getGroupKey(dateStr: string, groupBy: 'day' | 'week' | 'month'): string {
  const d = new Date(dateStr)
  if (groupBy === 'month') {
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  }
  if (groupBy === 'week') {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.getFullYear(), d.getMonth(), diff)
    return monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function generateKeys(start: Date, end: Date, groupBy: 'day' | 'week' | 'month'): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const cur = new Date(start)

  while (cur <= end) {
    const key = getGroupKey(fmtDate(cur), groupBy)
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
    if (groupBy === 'month') {
      cur.setMonth(cur.getMonth() + 1)
    } else if (groupBy === 'week') {
      cur.setDate(cur.getDate() + 7)
    } else {
      cur.setDate(cur.getDate() + 1)
    }
  }

  return keys
}
