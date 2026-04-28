export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      angsuran: {
        Row: {
          created_at: string
          id: string
          keterangan: string | null
          nasabah_id: string
          nomor_angsuran: number
          rp: number
          status_bayar: string
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          keterangan?: string | null
          nasabah_id: string
          nomor_angsuran: number
          rp: number
          status_bayar?: string
          tanggal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          keterangan?: string | null
          nasabah_id?: string
          nomor_angsuran?: number
          rp?: number
          status_bayar?: string
          tanggal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "angsuran_nasabah_id_fkey"
            columns: ["nasabah_id"]
            isOneToOne: false
            referencedRelation: "nasabah"
            referencedColumns: ["id"]
          },
        ]
      }
      keuangan: {
        Row: {
          created_at: string
          id: string
          kategori: string
          keterangan: string | null
          nominal: number
          tanggal: string
        }
        Insert: {
          created_at?: string
          id?: string
          kategori: string
          keterangan?: string | null
          nominal: number
          tanggal?: string
        }
        Update: {
          created_at?: string
          id?: string
          kategori?: string
          keterangan?: string | null
          nominal?: number
          tanggal?: string
        }
        Relationships: []
      }
      nasabah: {
        Row: {
          created_at: string
          id: string
          item_dibeli: string
          jumlah_angsuran: number
          keterangan: string | null
          nama: string
          password: string | null
          rp_per_angsuran: number
          status: string
          tgl_mulai: string
          uang_muka: number
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_dibeli: string
          jumlah_angsuran: number
          keterangan?: string | null
          nama: string
          password?: string | null
          rp_per_angsuran: number
          status?: string
          tgl_mulai?: string
          uang_muka?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_dibeli?: string
          jumlah_angsuran?: number
          keterangan?: string | null
          nama?: string
          password?: string | null
          rp_per_angsuran?: number
          status?: string
          tgl_mulai?: string
          uang_muka?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const