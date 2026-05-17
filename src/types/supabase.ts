export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: string
          name: string
          class_id: string | null
          last_active: string
          consent_timestamp: string | null
          data_retention_approved: boolean
          two_factor_enabled: boolean
          password_last_changed: string
          failed_login_attempts: number
          account_locked_until: string | null
          dfe_number: string | null
          school_type: string | null
          year_group: string | null
          send_status: boolean
          parent_consent_timestamp: string | null
          safeguarding_flag: boolean
          parent_email: string | null
          requires_parent_consent: boolean
          educational_credits: number
          school_system: string
          regional_school_id: string | null
          district_id: string | null
          state_id: string | null
          eu_institution_code: string | null
          eu_country_code: string | null
          primary_language: string
          secondary_languages: string[] | null
          timezone: string
          regional_compliance_status: Json
        }
        Insert: {
          id?: string
          email: string
          role?: string
          name: string
          class_id?: string | null
          last_active?: string
          consent_timestamp?: string | null
          data_retention_approved?: boolean
          two_factor_enabled?: boolean
          password_last_changed?: string
          failed_login_attempts?: number
          account_locked_until?: string | null
          dfe_number?: string | null
          school_type?: string | null
          year_group?: string | null
          send_status?: boolean
          parent_consent_timestamp?: string | null
          safeguarding_flag?: boolean
          parent_email?: string | null
          requires_parent_consent?: boolean
          educational_credits?: number
          school_system?: string
          regional_school_id?: string | null
          district_id?: string | null
          state_id?: string | null
          eu_institution_code?: string | null
          eu_country_code?: string | null
          primary_language?: string
          secondary_languages?: string[] | null
          timezone?: string
          regional_compliance_status?: Json
        }
        Update: {
          id?: string
          email?: string
          role?: string
          name?: string
          class_id?: string | null
          last_active?: string
          consent_timestamp?: string | null
          data_retention_approved?: boolean
          two_factor_enabled?: boolean
          password_last_changed?: string
          failed_login_attempts?: number
          account_locked_until?: string | null
          dfe_number?: string | null
          school_type?: string | null
          year_group?: string | null
          send_status?: boolean
          parent_consent_timestamp?: string | null
          safeguarding_flag?: boolean
          parent_email?: string | null
          requires_parent_consent?: boolean
          educational_credits?: number
          school_system?: string
          regional_school_id?: string | null
          district_id?: string | null
          state_id?: string | null
          eu_institution_code?: string | null
          eu_country_code?: string | null
          primary_language?: string
          secondary_languages?: string[] | null
          timezone?: string
          regional_compliance_status?: Json
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}