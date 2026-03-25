import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  defaultDate?: string
}

interface ClientOption {
  id: string
  first_name: string
  last_name: string
}

const TYPE_OPTIONS = [
  { value: 'tattoo', label: 'Séance tattoo' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'retouche', label: 'Retouche' },
]

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

export default function NewAppointmentModalFull({ open, onClose, onCreated, defaultDate }: Props) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [form, setForm] = useState({
    date: defaultDate || '',
    time: '10:00',
    duration_minutes: '60',
    type: 'tattoo' as 'tattoo' | 'consultation' | 'retouche',
    description: '',
  })

  useEffect(() => {
    if (defaultDate) setForm(prev => ({ ...prev, date: defaultDate }))
  }, [defaultDate])

  useEffect(() => {
    if (!open || !user) return
    supabase
      .from('clients')
      .select('*')
      .order('first_name')
      .then(({ data }) => {
        if (data) {
          setClients(data.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name })))
        }
      })
  }, [open, user])

  if (!open) return null

  const filteredClients = clientSearch.trim()
    ? clients.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients

  const handleSelectClient = (c: ClientOption) => {
    setSelectedClient(c)
    setClientSearch(`${c.first_name} ${c.last_name}`)
    setShowDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedClient || !form.date) return
    setSaving(true)

    const { error } = await supabase.from('appointments').insert({
      user_id: user.id,
      client_id: selectedClient.id,
      date: form.date,
      time: form.time,
      duration_minutes: parseInt(form.duration_minutes) || 60,
      type: form.type,
      description: form.description.trim() || null,
    })

    setSaving(false)
    if (!error) {
      setForm({ date: '', time: '10:00', duration_minutes: '60', type: 'tattoo', description: '' })
      setSelectedClient(null)
      setClientSearch('')
      onCreated()
      onClose()
    }
  }

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-navy">Nouveau rendez-vous</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client selector */}
          <div className="relative">
            <label className="block text-sm font-medium text-navy mb-1">Client *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                required
                value={clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value)
                  setSelectedClient(null)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Rechercher un client..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-muted">Aucun client trouvé</p>
                ) : (
                  filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent-light transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium text-navy">{c.first_name} {c.last_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

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
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Détails du rendez-vous..."
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
              disabled={saving || !selectedClient}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Créer le RDV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
