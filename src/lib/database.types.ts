// Generated from the Supabase schema. Regenerate after changing tables:
// npx supabase gen types typescript --project-id inibgxlxvvegsbevnwmj > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      events: {
        Row: {
          content_type: string | null
          created_at: string
          ends_at: string
          id: number
          name: string
          objectives: string | null
          organizer_id: string
          poster_url: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scope: string | null
          starts_at: string
          status: string
          submitter_name: string | null
          submitter_phone: string | null
          submitter_position: string | null
          updated_at: string
          venue_id: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          ends_at: string
          id?: never
          name: string
          objectives?: string | null
          organizer_id?: string
          poster_url?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope?: string | null
          starts_at: string
          status?: string
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_position?: string | null
          updated_at?: string
          venue_id?: number | null
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: [
          { foreignKeyName: 'events_organizer_id_fkey'; columns: ['organizer_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'events_reviewed_by_fkey'; columns: ['reviewed_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'events_venue_id_fkey'; columns: ['venue_id']; isOneToOne: false; referencedRelation: 'venues'; referencedColumns: ['id'] },
        ]
      }
      guests: {
        Row: {
          designation: string | null
          event_id: number
          guest_type: string | null
          id: number
          name: string
          organization: string | null
        }
        Insert: {
          designation?: string | null
          event_id: number
          guest_type?: string | null
          id?: never
          name: string
          organization?: string | null
        }
        Update: Partial<Database['public']['Tables']['guests']['Insert']>
        Relationships: [
          { foreignKeyName: 'guests_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          role: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string
          role?: string
          username?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      tickets: {
        Row: {
          attended: boolean
          checked_in_at: string | null
          created_at: string
          email: string
          event_id: number
          id: number
          name: string
          token: string
        }
        Insert: {
          attended?: boolean
          checked_in_at?: string | null
          created_at?: string
          email: string
          event_id: number
          id?: never
          name: string
          token?: string
        }
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
        Relationships: [
          { foreignKeyName: 'tickets_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number
          created_at: string
          id: number
          name: string
          type: string | null
        }
        Insert: {
          address?: string | null
          capacity: number
          created_at?: string
          id?: never
          name: string
          type?: string | null
        }
        Update: Partial<Database['public']['Tables']['venues']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_ticket: {
        Args: { p_token: string }
        Returns: {
          attended: boolean
          ends_at: string
          event_id: number
          event_name: string
          starts_at: string
          ticket_email: string
          ticket_name: string
          venue_address: string
          venue_name: string
        }[]
      }
      event_organizer_contact: { Args: { p_event_id: number }; Returns: { email: string; name: string }[] }
      is_admin: { Args: never; Returns: boolean }
      register_for_event: { Args: { p_email: string; p_event_id: number; p_name: string }; Returns: string }
      seats_left: { Args: { p_event_id: number }; Returns: number }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
