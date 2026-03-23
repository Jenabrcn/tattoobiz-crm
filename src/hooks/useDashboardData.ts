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

export type PeriodFilter = 'month' | '30d' | '3m' | '12m'

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
  periodFilter: PeriodFilter
  setPeriodFilter: (f: PeriodFilter) => void
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
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const fetchIdRef = useRef(0)
  const [retryKey, setRetryKey] = useState(0)

  const retry = () => {
    setError(null)
    setLoading(true)
    setRetryKey(k => k + 1)
  }

  useEffect(() => {
    if (!user) return

    const fetchId = ++fetchIdRef.current
    fetchAll(fetchId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, periodFilter, retryKey])

  async function fetchAll(fetchId: number) {
    if (!user) return
    setLoading(true)
    setError(null)

    const now = new Date()
    const today = fmtDate(now)
    const monthStart = fmtDate(startOfMonth(now))
    const prevMonthStart = fmtDate(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
    const prevMonthEnd = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0))
    const thirtyDaysAgo = fmtDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))

    // Compute time series date range
    let seriesStart: Date
    let groupBy: 'day' | 'week' | 'month'
    switch (periodFilter) {
      case 'month': seriesStart = startOfMonth(now); groupBy = 'day'; break
      case '30d': seriesStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); groupBy = 'day'; break
      case '3m': seriesStart = new Date(now.getFullYear(), now.getMonth() - 3, 1); groupBy = 'week'; break
      case '12m': seriesStart = new Date(now.getFullYear() - 1, now.getMonth(), 1); groupBy = 'month'; break
    }

    // Use the earliest date needed across all finance queries
    const financeStartDate = new Date(Math.min(seriesStart.getTime(), new Date(prevMonthStart).getTime()))
    const financeStart = fmtDate(financeStartDate)

    let profileResult, clientsResult, appointmentsResult, financesResult
    try {
      // 4 parallel queries with 10s timeout
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
          .lte('date', today)
          .order('date'),
      ]))
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      const isTimeout = err instanceof Error && err.message === 'TIMEOUT'
      setError(isTimeout ? 'La connexion est lente, réessaie.' : 'Erreur de chargement des données.')
      setLoading(false)
      return
    }

    // Stale fetch guard
    if (fetchId !== fetchIdRef.current) return

    // Check for Supabase errors (auth expired, RLS, etc.)
    const queryError = profileResult.error || clientsResult.error || appointmentsResult.error || financesResult.error
    if (queryError) {
      // Auth errors → don't show error, ProtectedRoute will redirect
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

    // --- Clients (compute all counts from single query) ---
    const allClients = (clientsResult.data || []) as RecentClient[]
    const clientMap = new Map(allClients.map(c => [c.id, c]))
    const total = allClients.length
    const recent5 = allClients.slice(0, 5)
    const curClients = allClients.filter(c => c.created_at >= monthStart).length
    const prevClientsCount = allClients.filter(c => c.created_at >= prevMonthStart && c.created_at <= prevMonthEnd + 'T23:59:59').length
    const newC = allClients.filter(c => c.created_at >= thirtyDaysAgo).length

    // --- Appointments (compute today, upcoming, regular, active from single query) ---
    const allAppts = (appointmentsResult.data || []) as { id: string; client_id: string; date: string; time: string; description: string | null; type: string }[]

    const todayAppts = allAppts.filter(a => a.date === today)
    const futureAppts = allAppts.filter(a => a.date >= today)
    const upcoming5 = futureAppts.slice(0, 5)

    // Enrich with client names
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
    const upcomingEnriched = enrichWithClients(upcoming5)

    // Regular clients (>1 appointment)
    const apptCountMap = new Map<string, number>()
    allAppts.forEach(a => apptCountMap.set(a.client_id, (apptCountMap.get(a.client_id) || 0) + 1))
    const regulars = [...apptCountMap.values()].filter(v => v > 1).length

    // --- Finances (compute current month, previous month, time series from single query) ---
    const allFinances = (financesResult.data || []) as { type: string; date: string; amount: number }[]
    const curMonthFinances = allFinances.filter(f => f.date >= monthStart && f.date <= today)
    const prevMonthFinances = allFinances.filter(f => f.date >= prevMonthStart && f.date <= prevMonthEnd)

    const seriesStartStr = fmtDate(seriesStart)
    const seriesFinances = allFinances.filter(f => f.date >= seriesStartStr && f.date <= today)
    const seriesClientsList = allClients.filter(c => c.created_at.split('T')[0] >= seriesStartStr && c.created_at.split('T')[0] <= today)

    // Build time series
    const revenueMap = new Map<string, number>()
    const clientsSeriesMap = new Map<string, number>()

    seriesFinances.forEach(f => {
      if (f.type === 'revenu' || f.type === 'arrhes') {
        const key = getGroupKey(f.date, groupBy)
        revenueMap.set(key, (revenueMap.get(key) || 0) + Number(f.amount))
      }
    })

    seriesClientsList.forEach(c => {
      const key = getGroupKey(c.created_at.split('T')[0], groupBy)
      clientsSeriesMap.set(key, (clientsSeriesMap.get(key) || 0) + 1)
    })

    const allKeys = generateKeys(seriesStart, now, groupBy)
    const revSeries = allKeys.map(k => ({ label: k, value: revenueMap.get(k) || 0 }))
    const cliSeries = allKeys.map(k => ({ label: k, value: clientsSeriesMap.get(k) || 0 }))

    // Stale fetch guard (check again after processing)
    if (fetchId !== fetchIdRef.current) return

    // --- Update all state ---
    setFirstName(fName)
    setTodayAppointments(todayEnriched)
    setCurrentMonth(calcFinances(curMonthFinances))
    setPreviousMonth(calcFinances(prevMonthFinances))
    setClientsThisMonth(curClients)
    setClientsLastMonth(prevClientsCount)
    setTotalClients(total)
    setRegularClients(regulars)
    setNewClients(newC)
    setUpcomingAppointments(upcomingEnriched)
    setRecentClients(recent5)
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
    periodFilter,
    setPeriodFilter,
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
