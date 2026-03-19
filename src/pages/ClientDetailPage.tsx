import { useParams, Link } from 'react-router-dom'
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

interface Photo {
  id: string
  url: string
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
  const [uploading, setUploading] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)

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

    const { data: ph } = await supabase
      .from('photos')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }) as { data: Photo[] | null }
    setPhotos(ph || [])

    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', id)
      .order('date', { ascending: false }) as { data: AppointmentEntry[] | null }
    setAppointments(appts || [])

    setLoading(false)
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

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('client-photos')
      .upload(path, file)

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('client-photos')
        .getPublicUrl(path)

      await supabase.from('photos').insert({
        client_id: id,
        url: urlData.publicUrl,
        description: file.name,
      })

      fetchData()
    }
    setUploading(false)
    e.target.value = ''
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
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-text-muted" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} className="text-text-muted" />
                  {client.phone}
                </span>
              )}
              {client.instagram && (
                <span className="flex items-center gap-1.5">
                  <Instagram size={14} className="text-text-muted" />
                  {client.instagram}
                </span>
              )}
              {client.tag && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  client.tag === 'Régulier' ? 'bg-green/10 text-green' :
                  client.tag === 'Projet en cours' ? 'bg-accent-light text-accent' :
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
              <span className="text-sm text-text-secondary">Nombre de séances</span>
              <span className="text-sm font-bold text-navy">{nbSessions}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-sm text-text-secondary">Panier moyen</span>
              <span className="text-sm font-bold text-navy">{formatCurrency(avgBasket)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-sm text-text-secondary">Arrhes en attente</span>
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

        {/* Photos des réalisations */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <Camera size={16} className="text-accent" />
            Photos des réalisations
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={photo.url} alt={photo.description || ''} className="w-full h-full object-cover" />
              </div>
            ))}
            <label className={`aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent-light/50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              <Plus size={24} className="text-text-muted mb-1" />
              <span className="text-xs text-text-muted">{uploading ? 'Upload...' : 'Ajouter'}</span>
            </label>
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
