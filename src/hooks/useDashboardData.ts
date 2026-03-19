import { useEffect, useState } from 'react'
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
  firstName: string
  todayAppointments: TodayAppointment[]
  currentMonth: MonthlyFinance
  previousMonth: MonthlyFinance
  clientsThisMonth: number
  clientsLastMonth: number
  totalClients: number
  regularClients: number
  newClients: number
  activeProjects: number
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichAppointments(appts: any[], clients: any[]) {
  const map = new Map(clients.map((c: { id: string; first_name: string; last_name: string }) => [c.id, c]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return appts.map((a: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = map.get(a.client_id) as any
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
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [currentMonth, setCurrentMonth] = useState<MonthlyFinance>({ revenue: 0, expenses: 0, net: 0 })
  const [previousMonth, setPreviousMonth] = useState<MonthlyFinance>({ revenue: 0, expenses: 0, net: 0 })
  const [clientsThisMonth, setClientsThisMonth] = useState(0)
  const [clientsLastMonth, setClientsLastMonth] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [regularClients, setRegularClients] = useState(0)
  const [newClients, setNewClients] = useState(0)
  const [activeProjects, setActiveProjects] = useState(0)
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [revenueSeries, setRevenueSeries] = useState<PeriodPoint[]>([])
  const [clientsSeries, setClientsSeries] = useState<PeriodPoint[]>([])
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')

  useEffect(() => {
    if (!user) return
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, periodFilter])

  async function fetchAll() {
    if (!user) return
    setLoading(true)

    const now = new Date()
    const today = fmtDate(now)
    const monthStart = fmtDate(startOfMonth(now))
    const prevMonthStart = fmtDate(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
    const prevMonthEnd = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0))

    // Profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single() as { data: { first_name: string | null } | null }
    setFirstName(profile?.first_name || user.email?.split('@')[0] || '')

    // Today's appointments
    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', today)
      .order('time') as { data: { id: string; client_id: string; time: string; description: string | null; type: string }[] | null }

    if (todayAppts && todayAppts.length > 0) {
      const clientIds = [...new Set(todayAppts.map(a => a.client_id))]
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
      setTodayAppointments(enrichAppointments(todayAppts, clients || []))
    } else {
      setTodayAppointments([])
    }

    // Current month finances
    const { data: curFinances } = await supabase
      .from('finances')
      .select('*')
      .gte('date', monthStart)
      .lte('date', today)
    setCurrentMonth(calcFinances((curFinances || []) as unknown[]))

    // Previous month finances
    const { data: prevFinances } = await supabase
      .from('finances')
      .select('*')
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd)
    setPreviousMonth(calcFinances((prevFinances || []) as unknown[]))

    // Clients counts
    const { count: curClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart)
    setClientsThisMonth(curClients || 0)

    const { count: prevClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevMonthStart)
      .lte('created_at', prevMonthEnd)
    setClientsLastMonth(prevClients || 0)

    const { count: total } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
    setTotalClients(total || 0)

    const thirtyDaysAgo = fmtDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
    const { count: newC } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo)
    setNewClients(newC || 0)

    // Regular clients (>1 appointment)
    const { data: allAppts } = await supabase
      .from('appointments')
      .select('*') as { data: { client_id: string }[] | null }
    if (allAppts) {
      const countMap = new Map<string, number>()
      allAppts.forEach(a => countMap.set(a.client_id, (countMap.get(a.client_id) || 0) + 1))
      setRegularClients([...countMap.values()].filter(v => v > 1).length)
    }

    // Active projects
    const { count: activeP } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
    setActiveProjects(activeP || 0)

    // Upcoming appointments (next 5)
    const { data: upcoming } = await supabase
      .from('appointments')
      .select('*')
      .gte('date', today)
      .order('date')
      .order('time')
      .limit(5) as { data: { id: string; client_id: string; date: string; time: string; description: string | null; type: string }[] | null }

    if (upcoming && upcoming.length > 0) {
      const clientIds = [...new Set(upcoming.map(a => a.client_id))]
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
      setUpcomingAppointments(enrichAppointments(upcoming, clients || []))
    } else {
      setUpcomingAppointments([])
    }

    // Recent clients
    const { data: recent } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5) as { data: RecentClient[] | null }
    setRecentClients(recent || [])

    // Time series
    await fetchTimeSeries(now)

    setLoading(false)
  }

  async function fetchTimeSeries(now: Date) {
    let startDate: Date
    let groupBy: 'day' | 'week' | 'month'

    switch (periodFilter) {
      case 'month':
        startDate = startOfMonth(now)
        groupBy = 'day'
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
        break
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        groupBy = 'week'
        break
      case '12m':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        groupBy = 'month'
        break
    }

    const start = fmtDate(startDate)
    const end = fmtDate(now)

    const { data: finances } = await supabase
      .from('finances')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date') as { data: { type: string; date: string; amount: number }[] | null }

    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at') as { data: { created_at: string }[] | null }

    const revenueMap = new Map<string, number>()
    const clientsMap = new Map<string, number>()

    ;(finances || []).forEach(f => {
      if (f.type === 'revenu' || f.type === 'arrhes') {
        const key = getGroupKey(f.date, groupBy)
        revenueMap.set(key, (revenueMap.get(key) || 0) + Number(f.amount))
      }
    })

    ;(clients || []).forEach(c => {
      const key = getGroupKey(c.created_at.split('T')[0], groupBy)
      clientsMap.set(key, (clientsMap.get(key) || 0) + 1)
    })

    const allKeys = generateKeys(startDate, now, groupBy)
    setRevenueSeries(allKeys.map(k => ({ label: k, value: revenueMap.get(k) || 0 })))
    setClientsSeries(allKeys.map(k => ({ label: k, value: clientsMap.get(k) || 0 })))
  }

  return {
    loading,
    firstName,
    todayAppointments,
    currentMonth,
    previousMonth,
    clientsThisMonth,
    clientsLastMonth,
    totalClients,
    regularClients,
    newClients,
    activeProjects,
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
