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
          studio_address: string | null
          siret: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          studio_name?: string | null
          studio_address?: string | null
          siret?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          studio_name?: string | null
          studio_address?: string | null
          siret?: string | null
          created_at?: string
        }
        Relationships: []
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
          city: string | null
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
          city?: string | null
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
          city?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
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
        Relationships: []
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
          invoice_url: string | null
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
          invoice_url?: string | null
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
          invoice_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          id: string
          client_id: string
          url: string
          type: 'consentement' | 'fiche_soin' | 'tattoo_frais' | 'tattoo_cicatrise'
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          url: string
          type: 'consentement' | 'fiche_soin' | 'tattoo_frais' | 'tattoo_cicatrise'
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          url?: string
          type?: 'consentement' | 'fiche_soin' | 'tattoo_frais' | 'tattoo_cicatrise'
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_type: 'tattoo' | 'consultation' | 'retouche'
      finance_type: 'revenu' | 'depense' | 'arrhes'
      payment_method: 'carte' | 'especes' | 'virement'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
