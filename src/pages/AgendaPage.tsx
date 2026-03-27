import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  X,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  useAgendaData,
  getMonthGrid,
  getWeekDays,
  fmtDateStr,
} from '../hooks/useAgendaData'
import type { AgendaAppointment, ViewMode } from '../hooks/useAgendaData'
import { supabase } from '../lib/supabase'
import NewAppointmentModalFull from '../components/NewAppointmentModalFull'
import { useConflictDetection, ConflictBanner } from '../hooks/useConflictDetection'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_FR_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  tattoo:       { bg: 'bg-accent-light', border: 'border-l-accent', text: 'text-accent', dot: 'bg-accent' },
  consultation: { bg: 'bg-gray-50', border: 'border-l-navy', text: 'text-navy', dot: 'bg-navy' },
  retouche:     { bg: 'bg-green/5', border: 'border-l-green', text: 'text-green', dot: 'bg-green' },
}

const TYPE_LABELS: Record<string, string> = {
  tattoo: 'Séance tattoo',
  consultation: 'Consultation',
  retouche: 'Retouche',
}

const DURATION_OPTIONS = [
  { value: '30', label: '30min' },
  { value: '60', label: '1h' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2h' },
  { value: '150', label: '2h30' },
  { value: '180', label: '3h' },
  { value: '210', label: '3h30' },
  { value: '240', label: '4h' },
  { value: '270', label: '4h30' },
  { value: '300', label: '5h' },
  { value: '330', label: '5h30' },
  { value: '360', label: '6h' },
]

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

function formatDateLong(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const HOUR_HEIGHT = 60 // px per hour
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 8:00 to 23:00
const GRID_START_HOUR = 8

export default function AgendaPage() {
  const data = useAgendaData()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState<string | undefined>(undefined)
  const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null)
  const [editAppt, setEditAppt] = useState<AgendaAppointment | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const today = fmtDateStr(new Date())

  let headerLabel: string
  if (data.viewMode === 'day') {
    headerLabel = data.currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } else {
    headerLabel = `${MONTHS_FR[data.currentDate.getMonth()]} ${data.currentDate.getFullYear()}`
  }

  const handleNewRdv = (date?: string) => {
    setModalDate(date)
    setShowModal(true)
  }

  const handleClickAppt = (appt: AgendaAppointment) => {
    setSelectedAppt(appt)
    setConfirmDeleteId(null)
  }

  const handleDeleteAppt = async (id: string) => {
    setDeleting(true)
    await supabase.from('appointments').delete().eq('id', id)
    setDeleting(false)
    setSelectedAppt(null)
    setConfirmDeleteId(null)
    data.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Agenda</h1>
          <p className="text-text-secondary mt-1">
            {data.viewCount} rendez-vous {data.viewMode === 'day' ? "aujourd'hui" : data.viewMode === 'week' ? 'cette semaine' : 'ce mois'}
          </p>
        </div>
        <button
          onClick={() => handleNewRdv()}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
        >
          <Plus size={18} />
          Nouveau rendez-vous
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={data.goPrev}
              className="p-2 rounded-lg hover:bg-gray-100 text-text-secondary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-navy min-w-[200px] text-center">{headerLabel}</h2>
            <button
              onClick={data.goNext}
              className="p-2 rounded-lg hover:bg-gray-100 text-text-secondary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={data.goToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-gray-50 transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
          <div className="flex bg-background rounded-lg p-1">
            {(['month', 'week'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => data.setViewMode(mode)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  data.viewMode === mode
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {mode === 'month' ? 'Mois' : 'Semaine'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      {data.loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : data.viewMode === 'day' ? (
        <DayView
          currentDate={data.currentDate}
          today={today}
          getAppointmentsForDate={data.getAppointmentsForDate}
          onClickAppt={handleClickAppt}
        />
      ) : data.viewMode === 'month' ? (
        <MonthView
          currentDate={data.currentDate}
          today={today}
          getAppointmentsForDate={data.getAppointmentsForDate}
          onClickDate={(d) => handleNewRdv(d)}
          onClickAppt={handleClickAppt}
        />
      ) : (
        <WeekView
          currentDate={data.currentDate}
          today={today}
          getAppointmentsForDate={data.getAppointmentsForDate}
          onClickAppt={handleClickAppt}
          onClickSlot={(dateStr) => handleNewRdv(dateStr)}
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-6">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${TYPE_STYLES[type].dot}`} />
            <span className="text-sm text-text-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* Today + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-navy">
              Aujourd'hui — {formatDateLong(new Date())}
            </h3>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-accent-light text-accent">
              {data.todayAppointments.length} RDV
            </span>
          </div>
          {data.todayAppointments.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">Aucun rendez-vous aujourd'hui</p>
          ) : (
            <div className="space-y-3">
              {data.todayAppointments.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} showDate={false} onClick={() => handleClickAppt(appt)} />
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Prochains rendez-vous</h3>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">Aucun rendez-vous à venir</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingAppointments.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} showDate onClick={() => handleClickAppt(appt)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New appointment modal */}
      <NewAppointmentModalFull
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={data.refresh}
        defaultDate={modalDate}
      />

      {/* Appointment detail popup */}
      {selectedAppt && !editAppt && (
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
                  {DURATION_OPTIONS.find(d => d.value === String(selectedAppt.duration_minutes))?.label || `${selectedAppt.duration_minutes} min`}
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
              <div className="bg-red/5 border border-red/20 rounded-xl p-4 mb-3">
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
                  onClick={() => { setEditAppt(selectedAppt); setSelectedAppt(null) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={16} />
                  Modifier
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

      {/* Edit appointment modal */}
      {editAppt && (
        <EditAppointmentModal
          appt={editAppt}
          onClose={() => setEditAppt(null)}
          onUpdated={() => { setEditAppt(null); data.refresh() }}
        />
      )}
    </div>
  )
}

/* ========== Edit Appointment Modal ========== */
function EditAppointmentModal({ appt, onClose, onUpdated }: { appt: AgendaAppointment; onClose: () => void; onUpdated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: appt.date,
    time: appt.time,
    duration_minutes: String(appt.duration_minutes),
    type: appt.type as string,
    description: appt.description || '',
  })
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))
  const conflict = useConflictDetection(form.date, form.time, parseInt(form.duration_minutes) || 60, appt.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('appointments').update({
      date: form.date,
      time: form.time,
      duration_minutes: parseInt(form.duration_minutes) || 60,
      type: form.type as 'tattoo' | 'consultation' | 'retouche',
      description: form.description.trim() || null,
    }).eq('id', appt.id)
    setSaving(false)
    onUpdated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-navy">Modifier le rendez-vous</h2>
            <p className="text-sm text-text-muted mt-0.5">{appt.client_first_name} {appt.client_last_name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Date *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Heure *</label>
              <input
                required
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              >
                <option value="tattoo">Séance tattoo</option>
                <option value="consultation">Consultation</option>
                <option value="retouche">Retouche</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Durée</label>
              <select
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              >
                {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          {conflict && <ConflictBanner conflict={conflict} />}
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ========== Month View ========== */
function MonthView({
  currentDate,
  today,
  getAppointmentsForDate,
  onClickDate,
  onClickAppt,
}: {
  currentDate: Date
  today: string
  getAppointmentsForDate: (d: string) => AgendaAppointment[]
  onClickDate: (d: string) => void
  onClickAppt: (appt: AgendaAppointment) => void
}) {
  const weeks = getMonthGrid(currentDate)
  const currentMonth = currentDate.getMonth()

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_FR.map(day => (
          <div key={day} className="px-2 py-3 text-center text-xs font-medium text-text-muted">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {week.map((day, di) => {
            const dateStr = fmtDateStr(day)
            const isCurrentMonth = day.getMonth() === currentMonth
            const isToday = dateStr === today
            const appts = getAppointmentsForDate(dateStr)

            return (
              <div
                key={di}
                className={`min-h-[100px] p-1.5 border-r border-border last:border-r-0 cursor-pointer hover:bg-gray-50/50 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/40' : ''
                }`}
                onClick={() => onClickDate(dateStr)}
              >
                <div className="flex justify-center mb-1">
                  <span
                    className={`w-7 h-7 flex items-center justify-center text-xs font-medium rounded-full ${
                      isToday
                        ? 'bg-accent text-white'
                        : isCurrentMonth
                        ? 'text-navy'
                        : 'text-text-muted'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {appts.slice(0, 3).map(a => {
                    const style = TYPE_STYLES[a.type] || TYPE_STYLES.tattoo
                    return (
                      <div
                        key={a.id}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border-l-2 ${style.bg} ${style.border} truncate cursor-pointer hover:opacity-80`}
                        title={`${formatTime(a.time)} - ${a.client_first_name} ${a.client_last_name}`}
                        onClick={(e) => { e.stopPropagation(); onClickAppt(a) }}
                      >
                        <span className={`font-medium ${style.text}`}>{formatTime(a.time)}</span>{' '}
                        <span className="text-text-secondary">{a.client_first_name}</span>
                      </div>
                    )
                  })}
                  {appts.length > 3 && (
                    <p className="text-[10px] text-text-muted text-center">+{appts.length - 3} autres</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ========== Week View ========== */
function WeekView({
  currentDate,
  today,
  getAppointmentsForDate,
  onClickAppt,
  onClickSlot,
}: {
  currentDate: Date
  today: string
  getAppointmentsForDate: (d: string) => AgendaAppointment[]
  onClickAppt: (appt: AgendaAppointment) => void
  onClickSlot: (dateStr: string) => void
}) {
  const days = getWeekDays(currentDate)

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-2" />
            {days.map((day, i) => {
              const dateStr = fmtDateStr(day)
              const isToday = dateStr === today
              return (
                <div key={i} className={`p-2 text-center border-l border-border ${isToday ? 'bg-accent-light' : ''}`}>
                  <p className="text-xs text-text-muted">{DAYS_FR_LONG[i]}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-accent' : 'text-navy'}`}>
                    {day.getDate()}
                  </p>
                </div>
              )
            })}
          </div>
          {/* Time grid body */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Hour labels column */}
            <div>
              {HOURS.map(hour => (
                <div key={hour} className="border-b border-border last:border-b-0" style={{ height: HOUR_HEIGHT }}>
                  <div className="text-xs text-text-muted text-right pr-3 pt-1">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {days.map((day, di) => {
              const dateStr = fmtDateStr(day)
              const isToday = dateStr === today
              const dayAppts = getAppointmentsForDate(dateStr)

              return (
                <div
                  key={di}
                  className={`border-l border-border relative ${isToday ? 'bg-accent-light/30' : ''}`}
                  style={{ height: HOURS.length * HOUR_HEIGHT }}
                  onClick={() => onClickSlot(dateStr)}
                >
                  {/* Hour grid lines */}
                  {HOURS.map(hour => (
                    <div
                      key={hour}
                      className="border-b border-border last:border-b-0 absolute w-full"
                      style={{ top: (hour - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}
                  {/* Appointment blocks */}
                  {dayAppts.map(a => {
                    const style = TYPE_STYLES[a.type] || TYPE_STYLES.tattoo
                    const [h, m] = a.time.split(':').map(Number)
                    const topOffset = (h - GRID_START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
                    const blockHeight = Math.max(24, (a.duration_minutes / 60) * HOUR_HEIGHT - 2)
                    const endTime = getEndTime(a.time, a.duration_minutes)

                    return (
                      <div
                        key={a.id}
                        className={`absolute left-0.5 right-0.5 text-xs px-2 py-1 rounded-lg border-l-2 cursor-pointer hover:opacity-80 z-10 overflow-hidden ${style.bg} ${style.border}`}
                        style={{ top: topOffset, height: blockHeight }}
                        onClick={(e) => { e.stopPropagation(); onClickAppt(a) }}
                      >
                        <p className={`font-medium ${style.text} leading-tight`}>{formatTime(a.time)} - {endTime}</p>
                        <p className="text-text-secondary truncate leading-tight">
                          {a.client_first_name} {a.client_last_name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========== Day View ========== */
function DayView({
  currentDate,
  today,
  getAppointmentsForDate,
  onClickAppt,
}: {
  currentDate: Date
  today: string
  getAppointmentsForDate: (d: string) => AgendaAppointment[]
  onClickAppt: (appt: AgendaAppointment) => void
}) {
  const dateStr = fmtDateStr(currentDate)
  const isToday = dateStr === today
  const appts = getAppointmentsForDate(dateStr)

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className={`px-5 py-3 border-b border-border ${isToday ? 'bg-accent-light' : ''}`}>
        <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-navy'}`}>
          {currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {isToday && <span className="ml-2 text-xs font-normal text-accent/70">— Aujourd'hui</span>}
        </p>
      </div>
      <div className="relative">
        {/* Hour rows */}
        {HOURS.map(hour => (
          <div key={hour} className="flex border-b border-border last:border-b-0" style={{ height: HOUR_HEIGHT }}>
            <div className="w-16 shrink-0 text-xs text-text-muted text-right pr-4 pt-1">
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className="flex-1 border-l border-border" />
          </div>
        ))}
        {/* Positioned appointment blocks */}
        {appts.map(a => {
          const style = TYPE_STYLES[a.type] || TYPE_STYLES.tattoo
          const [h, m] = a.time.split(':').map(Number)
          const topOffset = (h - GRID_START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
          const blockHeight = Math.max(32, (a.duration_minutes / 60) * HOUR_HEIGHT - 4)
          const endTime = getEndTime(a.time, a.duration_minutes)

          return (
            <div
              key={a.id}
              className={`absolute left-[68px] right-2 text-sm px-3 py-2 rounded-lg border-l-2 cursor-pointer hover:opacity-80 z-10 overflow-hidden ${style.bg} ${style.border}`}
              style={{ top: topOffset, height: blockHeight }}
              onClick={() => onClickAppt(a)}
            >
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${style.text}`}>{formatTime(a.time)} - {endTime}</span>
                <span className="text-navy font-medium">{a.client_first_name} {a.client_last_name}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                <span>{TYPE_LABELS[a.type] || a.type}</span>
                <span>{DURATION_OPTIONS.find(d => d.value === String(a.duration_minutes))?.label || `${a.duration_minutes} min`}</span>
              </div>
              {a.description && (
                <p className="text-xs text-text-muted mt-0.5 truncate">{a.description}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ========== Appointment Card ========== */
function AppointmentCard({ appt, showDate, onClick }: { appt: AgendaAppointment; showDate: boolean; onClick?: () => void }) {
  const style = TYPE_STYLES[appt.type] || TYPE_STYLES.tattoo
  const endTime = getEndTime(appt.time, appt.duration_minutes)

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity ${style.bg}`} onClick={onClick}>
      <div className={`w-1 self-stretch rounded-full ${style.dot}`} />
      <div className="flex-1 min-w-0">
        {showDate && (
          <p className="text-xs text-text-muted mb-0.5">
            {new Date(appt.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        )}
        <p className="text-sm font-medium text-navy">
          {appt.client_first_name} {appt.client_last_name}
        </p>
        {appt.description && (
          <p className="text-xs text-text-muted truncate mt-0.5">{appt.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-xs font-medium ${style.text} flex items-center gap-1`}>
            <Clock size={12} />
            {formatTime(appt.time)} - {endTime}
          </span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Calendar size={12} />
            {DURATION_OPTIONS.find(d => d.value === String(appt.duration_minutes))?.label || `${appt.duration_minutes} min`}
          </span>
        </div>
      </div>
    </div>
  )
}
