import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ConflictInfo {
  client_name: string
  time: string
  end_time: string
}

function getEndTime(time: string, durationMinutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMin = h * 60 + m + durationMinutes
  const eh = Math.floor(totalMin / 60) % 24
  const em = totalMin % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function useConflictDetection(
  date: string,
  time: string,
  durationMinutes: number,
  excludeApptId?: string,
) {
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)

  useEffect(() => {
    if (!date || !time) {
      setConflict(null)
      return
    }

    const check = async () => {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, time, duration_minutes, client_id')
        .eq('date', date)

      if (!appts || appts.length === 0) {
        setConflict(null)
        return
      }

      const newStart = toMinutes(time)
      const newEnd = newStart + durationMinutes

      const overlapping = appts.find(a => {
        if (excludeApptId && a.id === excludeApptId) return false
        const aStart = toMinutes(a.time)
        const aEnd = aStart + a.duration_minutes
        return newStart < aEnd && newEnd > aStart
      })

      if (!overlapping) {
        setConflict(null)
        return
      }

      // Fetch client name
      const { data: client } = await supabase
        .from('clients')
        .select('first_name, last_name')
        .eq('id', overlapping.client_id)
        .single()

      setConflict({
        client_name: client ? `${client.first_name} ${client.last_name}` : 'un client',
        time: overlapping.time.slice(0, 5),
        end_time: getEndTime(overlapping.time, overlapping.duration_minutes),
      })
    }

    check()
  }, [date, time, durationMinutes, excludeApptId])

  return conflict
}

export function ConflictBanner({ conflict }: { conflict: ConflictInfo }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
      <span className="shrink-0">⚠️</span>
      <span>
        Attention : tu as déjà un rendez-vous avec <strong>{conflict.client_name}</strong> de {conflict.time} à {conflict.end_time} ce jour-là.
      </span>
    </div>
  )
}
