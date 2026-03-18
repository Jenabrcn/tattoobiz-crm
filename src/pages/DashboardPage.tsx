import { useAuth } from '../contexts/AuthContext'
import { CalendarDays, Users, DollarSign, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Rendez-vous ce mois', value: '—', icon: CalendarDays, color: 'bg-accent-light text-accent' },
  { label: 'Clients actifs', value: '—', icon: Users, color: 'bg-blue-50 text-blue-600' },
  { label: 'Revenus du mois', value: '—', icon: DollarSign, color: 'bg-green-50 text-green' },
  { label: 'Croissance', value: '—', icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Bienvenue, {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card p-6 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-navy">{value}</p>
            <p className="text-sm text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
