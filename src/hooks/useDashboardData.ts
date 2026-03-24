import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface TodayAppointment {
  id: string
  time: string
  description: string | null
  type: string
  client_first_name: string
  client_last_name: string
}

interface UpcomingAppointment {
  id: string
  date: string
  time: string
  description: string | null
  type: string
  client_first_name: string
  client_last_name: string
}

interface RecentClient {
  id: string
  first_name: string
  last_name: string
  tag: string | null
  created_at: string
  email: string | null
  instagram: string | null
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

export type PeriodPreset = 'this_month' | 'last_30_days' | 'last_month' | 'all_time' | 'custom'

export interface DateRange {
  from: string
  to: string
  preset: PeriodPreset
}

export interface DashboardData {
  loading: boolean
  error: string | null
  retry: () => void
  firstName: string
  todayAppointments: TodayAppointment[]
  currentMonth: MonthlyFinance
  previousMonth: MonthlyFinance
  clientsThisMonth: number
  clientsLastMonth: number
  totalClients: number
  regularClients: number
  newClients: number
  upcomingAppointments: UpcomingAppointment[]
  recentClients: RecentClient[]
  revenueSeries: PeriodPoint[]
  clientsSeries: PeriodPoint[]
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
  const [currentMonth, setCurrentMonth] = useState<MonthlyFinance>({ revenue: 0, expenses: 0, net: 0 })
  const [previousMonth, setPreviousMonth] = useState<MonthlyFinance>({ revenue: 0, expenses: 0, net: 0 })
  const [clientsThisMonth, setClientsThisMonth] = useState(0)
  const [clientsLastMonth, setClientsLastMonth] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [regularClients, setRegularClients] = useState(0)
  const [newClients, setNewClients] = useState(0)
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [revenueSeries, setRevenueSeries] = useState<PeriodPoint[]>([])
  const [clientsSeries, setClientsSeries] = useState<PeriodPoint[]>([])
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

    // Previous period for evolution comparison
    const isAllTime = dateRange.preset === 'all_time'
    const prevRange = isAllTime ? null : getPreviousRange(dateRange)
    const groupBy = getGroupBy(dateRange.from, dateRange.to)

    // Earliest date needed for finance query
    const financeStart = prevRange ? prevRange.from : dateRange.from

    let profileResult, clientsResult, appointmentsResult, financesResult
    try {
      ;[profileResult, clientsResult, appointmentsResult, financesResult] = await withTimeout(Promise.all([
        supabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single(),
        supabase
          .from('clients')
          .select('id, first_name, last_name, tag, email, instagram, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('id, client_id, date, time, description, type')
          .order('date')
          .order('time'),
        supabase
          .from('finances')
          .select('type, date, amount')
          .gte('date', financeStart)
          .lte('date', dateRange.to)
          .order('date'),
      ]))
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      const isTimeout = err instanceof Error && err.message === 'TIMEOUT'
      setError(isTimeout ? 'La connexion est lente, réessaie.' : 'Erreur de chargement des données.')
      setLoading(false)
      return
    }

    if (fetchId !== fetchIdRef.current) return

    const queryError = profileResult.error || clientsResult.error || appointmentsResult.error || financesResult.error
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
    const allClients = (clientsResult.data || []) as RecentClient[]
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

    // --- Appointments ---
    const allAppts = (appointmentsResult.data || []) as { id: string; client_id: string; date: string; time: string; description: string | null; type: string }[]

    // Today's appointments (always unfiltered — for the banner)
    const todayAppts = allAppts.filter(a => a.date === today)

    // Appointments within the selected period
    const periodAppts = allAppts.filter(a => a.date >= dateRange.from && a.date <= dateRange.to)

    const enrichWithClients = (appts: typeof allAppts) =>
      appts.map(a => {
        const c = clientMap.get(a.client_id)
        return {
          id: a.id,
          date: a.date,
          time: a.time,
          description: a.description,
          type: a.type,
          client_first_name: c?.first_name || '',
          client_last_name: c?.last_name || '',
        }
      })

    const todayEnriched = enrichWithClients(todayAppts)
    const periodApptsEnriched = enrichWithClients(periodAppts.slice(0, 5))

    // Regular clients (>1 appointment within period)
    const periodApptCountMap = new Map<string, number>()
    periodAppts.forEach(a => periodApptCountMap.set(a.client_id, (periodApptCountMap.get(a.client_id) || 0) + 1))
    const regulars = [...periodApptCountMap.values()].filter(v => v > 1).length

    // --- Finances ---
    const allFinances = (financesResult.data || []) as { type: string; date: string; amount: number }[]
    const curPeriodFinances = allFinances.filter(f => f.date >= dateRange.from && f.date <= dateRange.to)
    const prevPeriodFinances = prevRange
      ? allFinances.filter(f => f.date >= prevRange.from && f.date <= prevRange.to)
      : []

    // Time series
    const seriesStart = new Date(dateRange.from)
    const seriesEnd = new Date(dateRange.to)

    const revenueMap = new Map<string, number>()
    const clientsSeriesMap = new Map<string, number>()

    curPeriodFinances.forEach(f => {
      if (f.type === 'revenu' || f.type === 'arrhes') {
        const key = getGroupKey(f.date, groupBy)
        revenueMap.set(key, (revenueMap.get(key) || 0) + Number(f.amount))
      }
    })

    periodClients.forEach(c => {
      const key = getGroupKey(c.created_at.split('T')[0], groupBy)
      clientsSeriesMap.set(key, (clientsSeriesMap.get(key) || 0) + 1)
    })

    const allKeys = generateKeys(seriesStart, seriesEnd, groupBy)
    const revSeries = allKeys.map(k => ({ label: k, value: revenueMap.get(k) || 0 }))
    const cliSeries = allKeys.map(k => ({ label: k, value: clientsSeriesMap.get(k) || 0 }))

    if (fetchId !== fetchIdRef.current) return

    // --- Update all state ---
    setFirstName(fName)
    setTodayAppointments(todayEnriched)
    setCurrentMonth(calcFinances(curPeriodFinances))
    setPreviousMonth(calcFinances(prevPeriodFinances))
    setClientsThisMonth(periodClients.length)
    setClientsLastMonth(prevPeriodClients.length)
    setTotalClients(periodClients.length)
    setRegularClients(regulars)
    setNewClients(periodClients.filter(c => c.tag === 'Nouveau').length)
    setUpcomingAppointments(periodApptsEnriched)
    setRecentClients(periodClients.slice(0, 5))
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
    currentMonth,
    previousMonth,
    clientsThisMonth,
    clientsLastMonth,
    totalClients,
    regularClients,
    newClients,
    upcomingAppointments,
    recentClients,
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
