export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          studio_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          studio_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          studio_name?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string | null
          email: string | null
          instagram: string | null
          tag: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone?: string | null
          email?: string | null
          instagram?: string | null
          tag?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          email?: string | null
          instagram?: string | null
          tag?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          client_id: string
          date: string
          time: string
          duration_minutes: number
          type: 'tattoo' | 'consultation' | 'retouche'
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          date: string
          time: string
          duration_minutes: number
          type: 'tattoo' | 'consultation' | 'retouche'
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          date?: string
          time?: string
          duration_minutes?: number
          type?: 'tattoo' | 'consultation' | 'retouche'
          description?: string | null
          created_at?: string
        }
      }
      finances: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          date: string
          description: string | null
          amount: number
          payment_method: 'carte' | 'especes' | 'virement'
          category: string | null
          type: 'revenu' | 'depense' | 'arrhes'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          date: string
          description?: string | null
          amount: number
          payment_method: 'carte' | 'especes' | 'virement'
          category?: string | null
          type: 'revenu' | 'depense' | 'arrhes'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          date?: string
          description?: string | null
          amount?: number
          payment_method?: 'carte' | 'especes' | 'virement'
          category?: string | null
          type?: 'revenu' | 'depense' | 'arrhes'
          created_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          client_id: string
          url: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          url: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          url?: string
          description?: string | null
          created_at?: string
        }
      }
    }
  }
}
