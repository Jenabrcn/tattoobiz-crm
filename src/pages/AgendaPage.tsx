import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
} from 'lucide-react'
import {
  useAgendaData,
  getMonthGrid,
  getWeekDays,
  fmtDateStr,
} from '../hooks/useAgendaData'
import type { AgendaAppointment, ViewMode } from '../hooks/useAgendaData'
import NewAppointmentModalFull from '../components/NewAppointmentModalFull'

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

function formatTime(time: string) {
  return time.slice(0, 5)
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Hours for the week view grid
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8:00 to 19:00

export default function AgendaPage() {
  const data = useAgendaData()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState<string | undefined>(undefined)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Agenda</h1>
          <p className="text-text-secondary mt-1">{data.monthCount} rendez-vous ce mois</p>
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
          onClickAppt={(clientId) => navigate(`/clients/${clientId}`)}
        />
      ) : data.viewMode === 'month' ? (
        <MonthView
          currentDate={data.currentDate}
          today={today}
          getAppointmentsForDate={data.getAppointmentsForDate}
          onClickDate={(d) => handleNewRdv(d)}
          onClickAppt={(clientId) => navigate(`/clients/${clientId}`)}
        />
      ) : (
        <WeekView
          currentDate={data.currentDate}
          today={today}
          getAppointmentsForDate={data.getAppointmentsForDate}
          onClickAppt={(clientId) => navigate(`/clients/${clientId}`)}
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
        {/* Today */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-navy">
                Aujourd'hui — {formatDateLong(new Date())}
              </h3>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-accent-light text-accent">
              {data.todayAppointments.length} RDV
            </span>
          </div>
          {data.todayAppointments.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">Aucun rendez-vous aujourd'hui</p>
          ) : (
            <div className="space-y-3">
              {data.todayAppointments.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} showDate={false} onClick={() => navigate(`/clients/${appt.client_id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Prochains rendez-vous</h3>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">Aucun rendez-vous à venir</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingAppointments.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} showDate onClick={() => navigate(`/clients/${appt.client_id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <NewAppointmentModalFull
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={data.refresh}
        defaultDate={modalDate}
      />
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
  onClickAppt: (clientId: string) => void
}) {
  const weeks = getMonthGrid(currentDate)
  const currentMonth = currentDate.getMonth()

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_FR.map(day => (
          <div key={day} className="px-2 py-3 text-center text-xs font-medium text-text-muted">
            {day}
          </div>
        ))}
      </div>
      {/* Weeks */}
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
                        onClick={(e) => { e.stopPropagation(); onClickAppt(a.client_id) }}
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
}: {
  currentDate: Date
  today: string
  getAppointmentsForDate: (d: string) => AgendaAppointment[]
  onClickAppt: (clientId: string) => void
}) {
  const days = getWeekDays(currentDate)

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
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
          {/* Hour rows */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border last:border-b-0">
              <div className="p-2 text-xs text-text-muted text-right pr-3 pt-1">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((day, di) => {
                const dateStr = fmtDateStr(day)
                const isToday = dateStr === today
                const appts = getAppointmentsForDate(dateStr).filter(a => {
                  const h = parseInt(a.time.split(':')[0])
                  return h === hour
                })

                return (
                  <div
                    key={di}
                    className={`min-h-[60px] p-1 border-l border-border relative ${isToday ? 'bg-accent-light/30' : ''}`}
                  >
                    {appts.map(a => {
                      const style = TYPE_STYLES[a.type] || TYPE_STYLES.tattoo
                      const durationRows = Math.max(1, Math.round(a.duration_minutes / 60))
                      return (
                        <div
                          key={a.id}
                          className={`text-xs px-2 py-1 rounded-lg border-l-2 mb-0.5 cursor-pointer hover:opacity-80 ${style.bg} ${style.border}`}
                          style={{ minHeight: `${durationRows * 50}px` }}
                          onClick={() => onClickAppt(a.client_id)}
                        >
                          <p className={`font-medium ${style.text}`}>{formatTime(a.time)}</p>
                          <p className="text-text-secondary truncate">
                            {a.client_first_name} {a.client_last_name}
                          </p>
                          {a.description && (
                            <p className="text-text-muted truncate">{a.description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
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
  onClickAppt: (clientId: string) => void
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
      {HOURS.map(hour => {
        const hourAppts = appts.filter(a => parseInt(a.time.split(':')[0]) === hour)
        return (
          <div key={hour} className="flex border-b border-border last:border-b-0">
            <div className="w-16 shrink-0 p-3 text-xs text-text-muted text-right pr-4 pt-3">
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className={`flex-1 min-h-[64px] p-1.5 border-l border-border`}>
              {hourAppts.map(a => {
                const style = TYPE_STYLES[a.type] || TYPE_STYLES.tattoo
                const durationRows = Math.max(1, Math.round(a.duration_minutes / 60))
                return (
                  <div
                    key={a.id}
                    className={`text-sm px-3 py-2 rounded-lg border-l-2 mb-1 cursor-pointer hover:opacity-80 ${style.bg} ${style.border}`}
                    style={{ minHeight: `${durationRows * 56}px` }}
                    onClick={() => onClickAppt(a.client_id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${style.text}`}>{formatTime(a.time)}</span>
                      <span className="text-navy font-medium">{a.client_first_name} {a.client_last_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                      <span>{TYPE_LABELS[a.type] || a.type}</span>
                      <span>{a.duration_minutes} min</span>
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
      })}
    </div>
  )
}

/* ========== Appointment Card ========== */
function AppointmentCard({ appt, showDate, onClick }: { appt: AgendaAppointment; showDate: boolean; onClick?: () => void }) {
  const style = TYPE_STYLES[appt.type] || TYPE_STYLES.tattoo

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
            {formatTime(appt.time)}
          </span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Calendar size={12} />
            {appt.duration_minutes} min
          </span>
        </div>
      </div>
    </div>
  )
}
