import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface AgendaAppointment {
  id: string
  date: string
  time: string
  duration_minutes: number
  type: 'tattoo' | 'consultation' | 'retouche'
  description: string | null
  client_id: string
  client_first_name: string
  client_last_name: string
}

export type ViewMode = 'month' | 'week' | 'day'

function fmtDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function endOfWeek(d: Date) {
  const s = startOfWeek(d)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
}

export function useAgendaData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const fetchAppointments = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // Determine date range based on view - fetch wider range for calendar display
      let rangeStart: Date
      let rangeEnd: Date

      if (viewMode === 'month') {
        const ms = startOfMonth(currentDate)
        const me = endOfMonth(currentDate)
        const dayOfWeek = ms.getDay()
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        rangeStart = new Date(ms.getFullYear(), ms.getMonth(), ms.getDate() - offset)
        const endDay = me.getDay()
        const endOffset = endDay === 0 ? 0 : 7 - endDay
        rangeEnd = new Date(me.getFullYear(), me.getMonth(), me.getDate() + endOffset)
      } else if (viewMode === 'day') {
        rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        rangeEnd = rangeStart
      } else {
        rangeStart = startOfWeek(currentDate)
        rangeEnd = endOfWeek(currentDate)
      }

      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .gte('date', fmtDate(rangeStart))
        .lte('date', fmtDate(rangeEnd))
        .order('date')
        .order('time')

      if (appts && appts.length > 0) {
        const clientIds = [...new Set(appts.map(a => a.client_id))]
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds)

        const clientMap = new Map(
          (clients || []).map(c => [c.id, c])
        )

        setAppointments(appts.map(a => {
          const c = clientMap.get(a.client_id)
          return {
            id: a.id,
            date: a.date,
            time: a.time,
            duration_minutes: a.duration_minutes,
            type: a.type,
            description: a.description,
            client_id: a.client_id,
            client_first_name: c?.first_name || '',
            client_last_name: c?.last_name || '',
          }
        }))
      } else {
        setAppointments([])
      }
    } catch {
      setAppointments([])
    }

    setLoading(false)
  }, [user, currentDate, viewMode])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const goToday = () => {
    setCurrentDate(new Date())
    setViewMode('day')
  }

  const goPrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else if (viewMode === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))
    } else {
      const s = startOfWeek(currentDate)
      setCurrentDate(new Date(s.getFullYear(), s.getMonth(), s.getDate() - 7))
    }
  }

  const goNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else if (viewMode === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))
    } else {
      const s = startOfWeek(currentDate)
      setCurrentDate(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7))
    }
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (dateStr: string) =>
    appointments.filter(a => a.date === dateStr)

  // View count — adapts to current view
  let viewCount: number
  if (viewMode === 'day') {
    const dayStr = fmtDate(currentDate)
    viewCount = appointments.filter(a => a.date === dayStr).length
  } else if (viewMode === 'week') {
    const ws = startOfWeek(currentDate)
    const we = endOfWeek(currentDate)
    const wsStr = fmtDate(ws)
    const weStr = fmtDate(we)
    viewCount = appointments.filter(a => a.date >= wsStr && a.date <= weStr).length
  } else {
    const ms = fmtDate(startOfMonth(currentDate))
    const me = fmtDate(endOfMonth(currentDate))
    viewCount = appointments.filter(a => a.date >= ms && a.date <= me).length
  }

  // Today's appointments
  const today = fmtDate(new Date())
  const todayAppointments = appointments.filter(a => a.date === today)

  // Upcoming appointments (after today, next 5)
  const upcomingAppointments = appointments
    .filter(a => a.date > today || (a.date === today && a.time > new Date().toTimeString().slice(0, 5)))
    .slice(0, 5)

  return {
    loading,
    appointments,
    currentDate,
    viewMode,
    setViewMode,
    viewCount,
    goToday,
    goPrev,
    goNext,
    getAppointmentsForDate,
    todayAppointments,
    upcomingAppointments,
    refresh: fetchAppointments,
  }
}

// Calendar grid helpers
export function getMonthGrid(date: Date): Date[][] {
  const ms = startOfMonth(date)
  const me = endOfMonth(date)

  const dayOfWeek = ms.getDay()
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const gridStart = new Date(ms.getFullYear(), ms.getMonth(), ms.getDate() - offset)

  const weeks: Date[][] = []
  const cur = new Date(gridStart)

  while (cur <= me || weeks.length < 6) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
    if (weeks.length >= 6) break
  }

  return weeks
}

export function getWeekDays(date: Date): Date[] {
  const s = startOfWeek(date)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i))
  }
  return days
}

export function fmtDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
