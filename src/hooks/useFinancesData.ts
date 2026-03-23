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
  created_at: string
}

export type TypeFilter = 'all' | 'revenu' | 'depense' | 'arrhes'
export type PeriodFilter = 'month' | '30d' | '3m' | 'all'

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
  return d.toISOString().split('T')[0]
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function useFinancesData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [allEntries, setAllEntries] = useState<FinanceEntry[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [search, setSearch] = useState('')

  // Stats
  const [curRevenue, setCurRevenue] = useState(0)
  const [curExpenses, setCurExpenses] = useState(0)
  const [prevRevenue, setPrevRevenue] = useState(0)
  const [prevExpenses, setPrevExpenses] = useState(0)

  // Charts
  const [monthBars, setMonthBars] = useState<MonthBar[]>([])
  const [topExpenses, setTopExpenses] = useState<CategorySum[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const now = new Date()
      const monthStart = fmtDate(startOfMonth(now))
      const prevMonthStart = fmtDate(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
      const prevMonthEnd = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0))

      // Fetch all finances
      const { data: finances } = await supabase
        .from('finances')
        .select('*')
        .order('date', { ascending: false })

      // Fetch clients for names
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
        created_at: f.created_at,
      }))

      setAllEntries(entries)

      // Current month stats
      const curMonth = entries.filter(e => e.date >= monthStart)
      setCurRevenue(curMonth.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0))
      setCurExpenses(curMonth.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0))

      // Previous month stats
      const prevMonth = entries.filter(e => e.date >= prevMonthStart && e.date <= prevMonthEnd)
      setPrevRevenue(prevMonth.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0))
      setPrevExpenses(prevMonth.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0))

      // Last 6 months bar chart data
      const bars: MonthBar[] = []
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0)
        const mStart = fmtDate(m)
        const mEndStr = fmtDate(mEnd)
        const mEntries = entries.filter(e => e.date >= mStart && e.date <= mEndStr)
        bars.push({
          label: m.toLocaleDateString('fr-FR', { month: 'short' }),
          revenue: mEntries.filter(e => e.type === 'revenu' || e.type === 'arrhes').reduce((s, e) => s + e.amount, 0),
          expenses: mEntries.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0),
        })
      }
      setMonthBars(bars)

      // Top expenses by category this month
      const curExpEntries = curMonth.filter(e => e.type === 'depense')
      const catMap = new Map<string, number>()
      curExpEntries.forEach(e => {
        const cat = e.category || 'Divers'
        catMap.set(cat, (catMap.get(cat) || 0) + e.amount)
      })
      const sorted = [...catMap.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
      setTopExpenses(sorted)
    } catch {
      // On error, show empty state instead of blocking UI
      setAllEntries([])
      setCurRevenue(0)
      setCurExpenses(0)
      setPrevRevenue(0)
      setPrevExpenses(0)
      setMonthBars([])
      setTopExpenses([])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered entries
  const now = new Date()
  const monthStart = fmtDate(startOfMonth(now))
  const thirtyDaysAgo = fmtDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
  const threeMonthsAgo = fmtDate(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 3, 1)))

  let filtered = allEntries

  // Period filter
  if (periodFilter === 'month') filtered = filtered.filter(e => e.date >= monthStart)
  else if (periodFilter === '30d') filtered = filtered.filter(e => e.date >= thirtyDaysAgo)
  else if (periodFilter === '3m') filtered = filtered.filter(e => e.date >= threeMonthsAgo)

  // Type filter
  if (typeFilter !== 'all') filtered = filtered.filter(e => e.type === typeFilter)

  // Search
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.client_name && e.client_name.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q))
    )
  }

  const curNet = curRevenue - curExpenses
  const prevNet = prevRevenue - prevExpenses

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
    totalExpensesThisMonth: curExpenses,
    refresh: fetchData,
  }
}
