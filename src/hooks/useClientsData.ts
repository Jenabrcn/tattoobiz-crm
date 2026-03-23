import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface ClientRow {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  instagram: string | null
  tag: string | null
  city: string | null
  notes: string | null
  created_at: string
}

export interface ClientWithStats extends ClientRow {
  last_appointment: string | null
  total_spent: number
}

export type TagFilter = 'all' | 'Régulier' | 'Nouveau'

const PAGE_SIZE = 10

export function useClientsData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientWithStats[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<TagFilter>('all')
  const [page, setPage] = useState(1)

  // Tag counts
  const [totalCount, setTotalCount] = useState(0)
  const [regulierCount, setRegulierCount] = useState(0)
  const [nouveauCount, setNouveauCount] = useState(0)

  // Mini stats
  const [clientsThisMonth, setClientsThisMonth] = useState(0)
  const [avgBasket, setAvgBasket] = useState(0)

  const fetchClients = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // Fetch all clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false }) as { data: ClientRow[] | null }

      const allClients = clientsData || []

      // Fetch all appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*') as { data: { client_id: string; date: string }[] | null }

      // Fetch all finances (revenues)
      const { data: finances } = await supabase
        .from('finances')
        .select('*') as { data: { client_id: string | null; amount: number; type: string }[] | null }

      // Build maps
      const lastApptMap = new Map<string, string>()
      ;(appointments || []).forEach(a => {
        const cur = lastApptMap.get(a.client_id)
        if (!cur || a.date > cur) lastApptMap.set(a.client_id, a.date)
      })

      const spentMap = new Map<string, number>()
      ;(finances || []).forEach(f => {
        if (f.client_id && (f.type === 'revenu' || f.type === 'arrhes')) {
          spentMap.set(f.client_id, (spentMap.get(f.client_id) || 0) + Number(f.amount))
        }
      })

      const enriched: ClientWithStats[] = allClients.map(c => ({
        ...c,
        last_appointment: lastApptMap.get(c.id) || null,
        total_spent: spentMap.get(c.id) || 0,
      }))

      setClients(enriched)
      setTotalCount(enriched.length)

      // Tag counts
      setRegulierCount(enriched.filter(c => c.tag === 'Régulier').length)
      setNouveauCount(enriched.filter(c => c.tag === 'Nouveau').length)

      // Clients this month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      setClientsThisMonth(enriched.filter(c => c.created_at >= monthStart).length)

      // Average basket
      const allRevenues = (finances || []).filter(f => f.type === 'revenu')
      if (allRevenues.length > 0) {
        const totalRev = allRevenues.reduce((s, f) => s + Number(f.amount), 0)
        setAvgBasket(Math.round(totalRev / allRevenues.length))
      } else {
        setAvgBasket(0)
      }
    } catch {
      // On error, show empty state instead of blocking UI
      setClients([])
      setTotalCount(0)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Apply filters
  useEffect(() => {
    let result = clients

    // Tag filter
    if (tagFilter !== 'all') {
      result = result.filter(c => c.tag === tagFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      )
    }

    setFilteredClients(result)
    setPage(1)
  }, [clients, tagFilter, search])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE))
  const paginatedClients = filteredClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return {
    loading,
    clients: paginatedClients,
    allClients: filteredClients,
    search,
    setSearch,
    tagFilter,
    setTagFilter,
    page,
    setPage,
    totalPages,
    totalCount,
    regulierCount,
    nouveauCount,
    clientsThisMonth,
    avgBasket,
    refresh: fetchClients,
  }
}
