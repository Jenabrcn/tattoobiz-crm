import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

interface ClientOption {
  id: string
  first_name: string
  last_name: string
}

const PAYMENT_METHODS = [
  { value: 'carte', label: 'Carte' },
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
]

const EXPENSE_CATEGORIES = ['Loyer', 'Matériel', 'Pub', 'Abonnements', 'Divers']

export default function AddFinanceModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [form, setForm] = useState({
    type: 'revenu' as 'revenu' | 'depense' | 'arrhes',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'carte' as 'carte' | 'especes' | 'virement',
    category: '',
  })

  useEffect(() => {
    if (!open || !user) return
    supabase
      .from('clients')
      .select('*')
      .order('first_name')
      .then(({ data }) => {
        if (data) setClients(data.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name })))
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
    if (!user || !form.amount || !form.date) return
    setSaving(true)

    const { error } = await supabase.from('finances').insert({
      user_id: user.id,
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description.trim() || null,
      date: form.date,
      client_id: selectedClient?.id || null,
      payment_method: form.payment_method,
      category: form.type === 'depense' ? (form.category || 'Divers') : null,
    })

    setSaving(false)
    if (!error) {
      setForm({
        type: 'revenu',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'carte',
        category: '',
      })
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
          <h2 className="text-lg font-bold text-navy">Ajouter une entrée</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Type *</label>
            <div className="flex gap-2">
              {([
                { value: 'revenu', label: 'Revenu', color: 'bg-green/10 text-green border-green/30' },
                { value: 'depense', label: 'Dépense', color: 'bg-red/10 text-red border-red/30' },
                { value: 'arrhes', label: 'Arrhes', color: 'bg-accent-light text-accent border-accent/30' },
              ] as const).map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                    form.type === t.value ? t.color : 'border-border text-text-muted hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Montant (€) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Description</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Séance bras complet, Loyer studio..."
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {/* Client (optional) */}
          {form.type !== 'depense' && (
            <div className="relative">
              <label className="block text-sm font-medium text-navy mb-1">Client (optionnel)</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
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
              {showDropdown && clientSearch.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-text-muted">Aucun client</p>
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
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Mode de paiement</label>
              <select
                value={form.payment_method}
                onChange={e => set('payment_method', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              >
                {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {form.type === 'depense' && (
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Catégorie</label>
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
                >
                  <option value="">Sélectionner...</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
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
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
