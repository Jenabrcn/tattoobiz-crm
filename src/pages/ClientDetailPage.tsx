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

type PhotoType = 'consentement' | 'fiche_soin' | 'tattoo_frais' | 'tattoo_cicatrise'

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
      .order('date', { ascending: false }) as { data: AppointmentEntry[] | null }
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
              { type: 'tattoo_frais' as PhotoType, label: 'Tattoo frais', icon: '🎨' },
              { type: 'tattoo_cicatrise' as PhotoType, label: 'Tattoo cicatrisé', icon: '✅' },
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

      {/* Historique des séances - full width */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
          <Clock size={16} className="text-accent" />
          Historique des séances
        </h3>
        {finances.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">Aucune séance enregistrée</p>
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
