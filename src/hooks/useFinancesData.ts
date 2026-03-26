import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface FinanceEntry {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'revenu' | 'depense' | 'arrhes'
  payment_method: 'carte' | 'especes' | 'virement'
  category: string | null
  client_id: string | null
  client_name: string | null
  invoice_url: string | null
  created_at: string
}

export type TypeFilter = 'all' | 'revenu' | 'depense'
export type PeriodFilter = 'month' | '30d' | 'last_month' | 'all' | 'custom'

interface MonthBar {
  label: string
  revenue: number
  expenses: number
}

interface CategorySum {
  category: string
  amount: number
}

function fmtDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
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

export function useFinancesData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [allEntries, setAllEntries] = useState<FinanceEntry[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data: finances } = await supabase
        .from('finances')
        .select('*')
        .order('date', { ascending: false })

      const { data: clients } = await supabase
        .from('clients')
        .select('*')

      const clientMap = new Map(
        (clients || []).map(c => [c.id, `${c.first_name} ${c.last_name}`])
      )

      const entries: FinanceEntry[] = (finances || []).map(f => ({
        id: f.id,
        date: f.date,
        description: f.description,
        amount: Number(f.amount),
        type: f.type,
        payment_method: f.payment_method,
        category: f.category,
        client_id: f.client_id,
        client_name: f.client_id ? clientMap.get(f.client_id) || null : null,
        invoice_url: f.invoice_url || null,
        created_at: f.created_at,
      }))

      setAllEntries(entries)
    } catch {
      setAllEntries([])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Period filtering ---
  const now = new Date()
  const monthStart = fmtDate(startOfMonth(now))
  const thirtyDaysAgo = fmtDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
  const lastMonthStart = fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMonthEnd = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0))

  let periodFiltered = allEntries
  if (periodFilter === 'month') periodFiltered = periodFiltered.filter(e => e.date >= monthStart)
  else if (periodFilter === '30d') periodFiltered = periodFiltered.filter(e => e.date >= thirtyDaysAgo)
  else if (periodFilter === 'last_month') periodFiltered = periodFiltered.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd)
  else if (periodFilter === 'custom' && customFrom && customTo) periodFiltered = periodFiltered.filter(e => e.date >= customFrom && e.date <= customTo)

  // --- Stats from period-filtered entries ---
  const curRevenue = periodFiltered.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0)
  const curExpenses = periodFiltered.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0)
  const curNet = curRevenue - curExpenses

  // --- Previous period for evolution ---
  let prevRevenue = 0
  let prevExpenses = 0
  if (periodFilter === 'month') {
    const prev = allEntries.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd)
    prevRevenue = prev.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0)
    prevExpenses = prev.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0)
  } else if (periodFilter === '30d') {
    const prevEnd = fmtDate(new Date(now.getTime() - 30 * 86400000))
    const prevStart = fmtDate(new Date(now.getTime() - 60 * 86400000))
    const prev = allEntries.filter(e => e.date >= prevStart && e.date < prevEnd)
    prevRevenue = prev.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0)
    prevExpenses = prev.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0)
  } else if (periodFilter === 'last_month') {
    const pm2Start = fmtDate(new Date(now.getFullYear(), now.getMonth() - 2, 1))
    const pm2End = fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 0))
    const prev = allEntries.filter(e => e.date >= pm2Start && e.date <= pm2End)
    prevRevenue = prev.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0)
    prevExpenses = prev.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0)
  }
  const prevNet = prevRevenue - prevExpenses

  // --- Bar chart from period-filtered entries ---
  const periodDates = periodFiltered.map(e => e.date).sort()
  const rangeStart = periodDates[0] || fmtDate(now)
  const rangeEnd = periodDates[periodDates.length - 1] || fmtDate(now)
  const rangeDays = (new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / 86400000
  const groupBy: 'day' | 'week' | 'month' = rangeDays <= 35 ? 'day' : rangeDays <= 120 ? 'week' : 'month'

  const revMap = new Map<string, number>()
  const expMap = new Map<string, number>()
  periodFiltered.forEach(e => {
    const key = getGroupKey(e.date, groupBy)
    if (e.type === 'revenu' || e.type === 'arrhes') {
      revMap.set(key, (revMap.get(key) || 0) + e.amount)
    } else if (e.type === 'depense') {
      expMap.set(key, (expMap.get(key) || 0) + e.amount)
    }
  })
  const allKeys: string[] = []
  const seen = new Set<string>()
  const cur = new Date(rangeStart)
  const end = new Date(rangeEnd)
  while (cur <= end) {
    const key = getGroupKey(fmtDate(cur), groupBy)
    if (!seen.has(key)) { seen.add(key); allKeys.push(key) }
    if (groupBy === 'month') cur.setMonth(cur.getMonth() + 1)
    else if (groupBy === 'week') cur.setDate(cur.getDate() + 7)
    else cur.setDate(cur.getDate() + 1)
  }
  const monthBars: MonthBar[] = allKeys.map(k => ({
    label: k,
    revenue: revMap.get(k) || 0,
    expenses: expMap.get(k) || 0,
  }))

  // --- Top expenses from period-filtered entries ---
  const catMap = new Map<string, number>()
  periodFiltered.filter(e => e.type === 'depense').forEach(e => {
    const cat = e.category || 'Divers'
    catMap.set(cat, (catMap.get(cat) || 0) + e.amount)
  })
  const topExpenses: CategorySum[] = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // --- Type + search filter for table ---
  let filtered = periodFiltered
  if (typeFilter === 'revenu') filtered = filtered.filter(e => e.type === 'revenu' || e.type === 'arrhes')
  else if (typeFilter === 'depense') filtered = filtered.filter(e => e.type === 'depense')
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.client_name && e.client_name.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q))
    )
  }

  function getEvolution(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    loading,
    entries: filtered,
    allFilteredEntries: filtered,
    typeFilter,
    setTypeFilter,
    periodFilter,
    setPeriodFilter,
    customFrom,
    customTo,
    setCustomRange: (from: string, to: string) => {
      setCustomFrom(from)
      setCustomTo(to)
      setPeriodFilter('custom')
    },
    search,
    setSearch,
    curRevenue,
    curExpenses,
    curNet,
    revenueEvo: getEvolution(curRevenue, prevRevenue),
    expenseEvo: getEvolution(curExpenses, prevExpenses),
    netEvo: getEvolution(curNet, prevNet),
    monthBars,
    topExpenses,
    totalExpenses: curExpenses,
    refresh: fetchData,
  }
}
