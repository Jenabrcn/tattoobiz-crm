import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronRight,
  Pencil,
  CalendarPlus,
  Phone,
  Mail,
  Instagram,
  User,
  DollarSign,
  Calendar,
  FileText,
  Camera,
  Plus,
  Clock,
  Download,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import EditClientModal from '../components/EditClientModal'
import NewAppointmentModal from '../components/NewAppointmentModal'

const AVATAR_COLORS = ['#F26522', '#1A1F3D', '#16a34a', '#6366f1', '#ec4899', '#f59e0b']

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatCurrency(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDateFr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface ClientData {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  instagram: string | null
  tag: string | null
  city: string | null
  notes: string | null
  created_at: string
}

interface FinanceEntry {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'revenu' | 'depense' | 'arrhes'
}

type PhotoType = 'consentement' | 'fiche_soin'

interface Photo {
  id: string
  url: string
  type: PhotoType
  description: string | null
}

interface AppointmentEntry {
  id: string
  date: string
  time: string
  duration_minutes: number
  type: string
  description: string | null
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientData | null>(null)
  const [finances, setFinances] = useState<FinanceEntry[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [appointments, setAppointments] = useState<AppointmentEntry[]>([])
  const [notes, setNotes] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [showNewRdv, setShowNewRdv] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<AppointmentEntry | null>(null)
  const [editAppt, setEditAppt] = useState<AppointmentEntry | null>(null)
  const [confirmDeleteAppt, setConfirmDeleteAppt] = useState<string | null>(null)
  const [deletingAppt, setDeletingAppt] = useState(false)
  const navigate = useNavigate()
  const [uploadingType, setUploadingType] = useState<PhotoType | null>(null)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (isInitial = true) => {
    if (!id) return
    if (isInitial) setLoading(true)

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single() as { data: ClientData | null }

    if (clientData) {
      setClient(clientData)
      setNotes(clientData.notes || '')
    }

    const { data: fin } = await supabase
      .from('finances')
      .select('*')
      .eq('client_id', id)
      .order('date', { ascending: false }) as { data: FinanceEntry[] | null }
    setFinances(fin || [])

    const { data: ph, error: phError } = await supabase
      .from('photos')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
    console.log('[fetchData] photos result:', ph, 'error:', phError)
    setPhotos((ph as Photo[]) || [])

    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', id)
      .order('date')
      .order('time') as { data: AppointmentEntry[] | null }
    setAppointments(appts || [])

    if (isInitial) setLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-save notes
  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      if (!id) return
      await supabase.from('clients').update({ notes: value || null }).eq('id', id)
    }, 1000)
  }

  // Photo upload by type
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoType: PhotoType) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploadingType(photoType)

    const ext = file.name.split('.').pop()
    const path = `${id}/${photoType}_${Date.now()}.${ext}`

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('client-photos')
      .upload(path, file, { upsert: true })

    console.log('[photo upload] storage result:', uploadData, 'error:', uploadError)

    if (uploadError) {
      console.error('[photo upload] Storage upload failed:', uploadError)
      setUploadingType(null)
      e.target.value = ''
      return
    }

    const { data: urlData } = supabase.storage
      .from('client-photos')
      .getPublicUrl(path)

    const publicUrl = urlData.publicUrl
    console.log('[photo upload] publicUrl:', publicUrl)

    // Delete existing photo of this type for this client
    const existing = photos.find(p => p.type === photoType)
    if (existing) {
      await supabase.from('photos').delete().eq('id', existing.id)
    }

    const { data: insertData, error: insertError } = await supabase.from('photos').insert({
      client_id: id,
      url: publicUrl,
      type: photoType,
      description: file.name,
    }).select()

    console.log('[photo upload] insert result:', insertData, 'error:', insertError)

    if (insertError) {
      console.error('[photo upload] Insert failed:', insertError)
    } else {
      // Optimistically update photos state immediately
      if (insertData && insertData.length > 0) {
        setPhotos(prev => {
          const filtered = prev.filter(p => p.type !== photoType)
          return [...filtered, insertData[0] as Photo]
        })
      }
      // Also refetch in background to stay in sync
      fetchData(false)
    }

    setUploadingType(null)
    e.target.value = ''
  }

  const handlePhotoDelete = async (photo: Photo) => {
    // Extract storage path from public URL
    const urlParts = photo.url.split('/client-photos/')
    const storagePath = urlParts[1]
    if (storagePath) {
      await supabase.storage.from('client-photos').remove([decodeURIComponent(storagePath)])
    }
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  const handlePhotoDownload = async (photo: Photo, label: string) => {
    const response = await fetch(photo.url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${label}.${photo.url.split('.').pop()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Client introuvable</p>
        <Link to="/clients" className="text-accent hover:underline mt-2 inline-block">
          Retour aux clients
        </Link>
      </div>
    )
  }

  const fullName = `${client.first_name} ${client.last_name}`
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
  const color = getAvatarColor(fullName)

  // Financial stats
  const totalSpent = finances
    .filter(f => f.type === 'revenu' || f.type === 'arrhes')
    .reduce((s, f) => s + Number(f.amount), 0)
  const nbSessions = finances.filter(f => f.type === 'revenu').length
  const avgBasket = nbSessions > 0 ? Math.round(totalSpent / nbSessions) : 0
  const pendingArrhes = finances
    .filter(f => f.type === 'arrhes')
    .reduce((s, f) => s + Number(f.amount), 0)

  // Next appointment
  const today = new Date().toISOString().split('T')[0]
  const nextAppt = appointments.find(a => a.date >= today)
  const memberSince = formatDateFr(client.created_at)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/clients" className="text-text-muted hover:text-accent transition-colors">Clients</Link>
        <ChevronRight size={14} className="text-text-muted" />
        <span className="text-navy font-medium">{fullName}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-navy font-display">{fullName}</h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-text-secondary">
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
                  <Mail size={14} className="text-text-muted" />
                  {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
                  <Phone size={14} className="text-text-muted" />
                  {client.phone}
                </a>
              )}
              {client.instagram && (
                <a
                  href={`https://instagram.com/${client.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-accent transition-colors"
                >
                  <Instagram size={14} className="text-text-muted" />
                  {client.instagram}
                </a>
              )}
              {client.tag && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  client.tag === 'Régulier' ? 'bg-green/10 text-green' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {client.tag}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
            >
              <Pencil size={16} />
              Modifier
            </button>
            <button
              onClick={() => setShowNewRdv(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              <CalendarPlus size={16} />
              Nouveau RDV
            </button>
          </div>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Informations */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <User size={16} className="text-accent" />
            Informations
          </h3>
          <div className="space-y-3">
            <InfoRow label="Prénom" value={client.first_name} />
            <InfoRow label="Nom" value={client.last_name} />
            <InfoRow label="Téléphone" value={client.phone || '—'} />
            <InfoRow label="Email" value={client.email || '—'} />
            <InfoRow label="Instagram" value={client.instagram || '—'} />
            <InfoRow label="Ville" value={client.city || '—'} />
            <InfoRow label="Client depuis" value={memberSince} />
          </div>
        </div>

        {/* Résumé financier */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-accent" />
            Résumé financier
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-text-secondary">Total dépensé</span>
              <span className="text-sm font-bold text-green">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-sm text-text-secondary">Total séances</span>
              <span className="text-sm font-bold text-navy">{nbSessions}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-sm text-text-secondary">Panier moyen</span>
              <span className="text-sm font-bold text-navy">{formatCurrency(avgBasket)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-sm text-text-secondary">Arrhes versées</span>
              <span className="text-sm font-bold text-accent">{formatCurrency(pendingArrhes)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-sm text-text-secondary">Prochain RDV</span>
              <span className="text-sm font-bold text-navy">
                {nextAppt ? (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-accent" />
                    {formatDateFr(nextAppt.date)}
                  </span>
                ) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes personnelles */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <FileText size={16} className="text-accent" />
            Notes personnelles
          </h3>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Ajouter des notes sur ce client..."
            rows={6}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
          />
          <p className="text-xs text-text-muted mt-2">Sauvegarde automatique</p>
        </div>

        {/* Documents & Photos */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <Camera size={16} className="text-accent" />
            Documents & Photos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {([
              { type: 'consentement' as PhotoType, label: 'Consentement éclairé', icon: '📋' },
              { type: 'fiche_soin' as PhotoType, label: 'Fiche de soin', icon: '💊' },
            ]).map(slot => {
              const photo = photos.find(p => p.type === slot.type)
              const isUploading = uploadingType === slot.type
              return (
                <div key={slot.type} className="border border-border rounded-xl p-3 flex flex-col items-center">
                  <div className="text-2xl mb-1">{slot.icon}</div>
                  <p className="text-xs font-medium text-navy mb-2 text-center">{slot.label}</p>
                  {photo ? (
                    <div className="w-full relative">
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                        <img src={photo.url} alt={slot.label} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <button
                          onClick={() => handlePhotoDownload(photo, slot.label)}
                          className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
                          title="Télécharger"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handlePhotoDelete(photo)}
                          className="p-1.5 rounded-md bg-black/50 text-white hover:bg-red/80 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className={`w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent-light/50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handlePhotoUpload(e, slot.type)}
                        disabled={isUploading}
                      />
                      <Plus size={20} className="text-text-muted mb-1" />
                      <span className="text-xs text-text-muted">{isUploading ? 'Upload...' : 'Ajouter une photo'}</span>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Rendez-vous */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-accent" />
          Rendez-vous
        </h3>
        {appointments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">Aucun rendez-vous</p>
        ) : (() => {
          const todayStr = new Date().toISOString().split('T')[0]
          const upcoming = appointments.filter(a => a.date >= todayStr)
          const past = appointments.filter(a => a.date < todayStr).reverse()
          const sorted = [...upcoming, ...past]
          const typeStyles: Record<string, { bg: string; text: string }> = {
            tattoo: { bg: 'bg-accent-light', text: 'text-accent' },
            consultation: { bg: 'bg-gray-50', text: 'text-navy' },
            retouche: { bg: 'bg-green/5', text: 'text-green' },
          }
          const typeLabels: Record<string, string> = {
            tattoo: 'Tattoo', consultation: 'Consultation', retouche: 'Retouche',
          }
          const fmtEndTime = (time: string, dur: number) => {
            const [h, m] = time.split(':').map(Number)
            const t = h * 60 + m + dur
            return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
          }
          const durLabels: Record<string, string> = {
            '30': '30min', '60': '1h', '90': '1h30', '120': '2h', '150': '2h30',
            '180': '3h', '210': '3h30', '240': '4h', '270': '4h30', '300': '5h',
          }
          return (
            <div className="divide-y divide-border">
              {sorted.map(a => {
                const isUpcoming = a.date >= todayStr
                const style = typeStyles[a.type] || typeStyles.tattoo
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors -mx-2 px-2 rounded-lg"
                    onClick={() => { setSelectedAppt(a); setConfirmDeleteAppt(null) }}
                  >
                    <div className="w-16 text-center shrink-0">
                      <p className="text-xs font-bold text-accent">
                        {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-navy">
                          {a.time.slice(0, 5)} - {fmtEndTime(a.time, a.duration_minutes)}
                        </span>
                        <span className="text-xs text-text-muted">
                          {durLabels[String(a.duration_minutes)] || `${a.duration_minutes} min`}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-text-muted truncate">{a.description}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-lg ${style.bg} ${style.text}`}>
                      {typeLabels[a.type] || a.type}
                    </span>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-lg ${
                      isUpcoming ? 'bg-accent-light text-accent' : 'bg-gray-100 text-text-muted'
                    }`}>
                      {isUpcoming ? 'À venir' : 'Passé'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Historique des transactions - full width */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
          <Clock size={16} className="text-accent" />
          Historique des transactions
        </h3>
        {finances.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">Aucune transaction enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {finances.map(f => (
                  <tr key={f.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-sm text-text-secondary">{formatDateFr(f.date)}</td>
                    <td className="px-4 py-3 text-sm text-navy">{f.description || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green">{formatCurrency(Number(f.amount))}</td>
                    <td className="px-4 py-3">
                      {f.type === 'arrhes' ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-accent-light text-accent">
                          Arrhes versées
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-green/10 text-green">
                          Payé
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete client */}
      <div className="flex justify-end">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red/70 hover:text-red transition-colors"
          >
            Supprimer ce client
          </button>
        ) : (
          <div className="w-full bg-white rounded-xl border border-red/20 p-5">
            <p className="text-sm text-navy mb-4">
              Es-tu sûr de vouloir supprimer ce client ? Cette action est irréversible. Toutes ses données (rendez-vous, finances, photos) seront supprimées.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!id) return
                  setDeleting(true)
                  await supabase.from('photos').delete().eq('client_id', id)
                  await supabase.from('finances').delete().eq('client_id', id)
                  await supabase.from('appointments').delete().eq('client_id', id)
                  await supabase.from('clients').delete().eq('id', id)
                  navigate('/clients')
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-red text-white hover:bg-red/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditClientModal
        open={showEdit}
        client={client}
        onClose={() => setShowEdit(false)}
        onUpdated={fetchData}
      />
      <NewAppointmentModal
        open={showNewRdv}
        clientId={client.id}
        clientName={fullName}
        onClose={() => setShowNewRdv(false)}
        onCreated={fetchData}
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
                <span className="text-sm text-text-secondary">Date</span>
                <span className="text-sm font-medium text-navy">
                  {new Date(selectedAppt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Horaire</span>
                <span className="text-sm font-medium text-navy">
                  {selectedAppt.time.slice(0, 5)} — {(() => {
                    const [h, m] = selectedAppt.time.split(':').map(Number)
                    const t = h * 60 + m + selectedAppt.duration_minutes
                    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Type</span>
                <span className="text-sm font-medium text-navy">
                  {{ tattoo: 'Séance tattoo', consultation: 'Consultation', retouche: 'Retouche' }[selectedAppt.type] || selectedAppt.type}
                </span>
              </div>
              {selectedAppt.description && (
                <div className="py-2">
                  <span className="text-sm text-text-secondary">Description</span>
                  <p className="text-sm text-navy mt-1">{selectedAppt.description}</p>
                </div>
              )}
            </div>
            {confirmDeleteAppt === selectedAppt.id ? (
              <div className="bg-red/5 border border-red/20 rounded-xl p-4">
                <p className="text-sm text-navy mb-3">Es-tu sûr de vouloir supprimer ce rendez-vous ?</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmDeleteAppt(null)}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors">
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      setDeletingAppt(true)
                      await supabase.from('appointments').delete().eq('id', selectedAppt.id)
                      setDeletingAppt(false)
                      setSelectedAppt(null)
                      setConfirmDeleteAppt(null)
                      fetchData(false)
                    }}
                    disabled={deletingAppt}
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-red text-white hover:bg-red/90 transition-colors disabled:opacity-50">
                    {deletingAppt ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditAppt(selectedAppt); setSelectedAppt(null) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors">
                  <Pencil size={16} />
                  Modifier
                </button>
                <button
                  onClick={() => setConfirmDeleteAppt(selectedAppt.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-red/30 text-red hover:bg-red/5 transition-colors">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-navy">Modifier le rendez-vous</h2>
                <p className="text-sm text-text-muted mt-0.5">{fullName}</p>
              </div>
              <button onClick={() => setEditAppt(null)} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const fd = new FormData(form)
              await supabase.from('appointments').update({
                date: fd.get('date') as string,
                time: fd.get('time') as string,
                duration_minutes: parseInt(fd.get('duration') as string) || 60,
                type: fd.get('type') as 'tattoo' | 'consultation' | 'retouche',
                description: (fd.get('description') as string)?.trim() || null,
              }).eq('id', editAppt.id)
              setEditAppt(null)
              fetchData(false)
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Date *</label>
                  <input required type="date" name="date" defaultValue={editAppt.date}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Heure *</label>
                  <input required type="time" name="time" defaultValue={editAppt.time}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Type</label>
                  <select name="type" defaultValue={editAppt.type}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                    <option value="tattoo">Séance tattoo</option>
                    <option value="consultation">Consultation</option>
                    <option value="retouche">Retouche</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Durée</label>
                  <select name="duration" defaultValue={String(editAppt.duration_minutes)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                    {[['30','30min'],['60','1h'],['90','1h30'],['120','2h'],['150','2h30'],['180','3h'],['210','3h30'],['240','4h'],['270','4h30'],['300','5h'],['330','5h30'],['360','6h']].map(([v,l]) =>
                      <option key={v} value={v}>{l}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Description</label>
                <textarea name="description" defaultValue={editAppt.description || ''} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditAppt(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-navy">{value}</span>
    </div>
  )
}
