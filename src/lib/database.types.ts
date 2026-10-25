// Generated with scripts/generate-types.py. Do not edit manually.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          duration_ms: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          duration_ms?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          duration_ms?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          busy_until: string | null
          created_at: string
          customer_id: string
          id: string
          internal_only: boolean
          needs_human: boolean
          summary: string | null
        }
        Insert: {
          busy_until?: string | null
          created_at?: string
          customer_id: string
          id?: string
          internal_only?: boolean
          needs_human?: boolean
          summary?: string | null
        }
        Update: {
          busy_until?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          internal_only?: boolean
          needs_human?: boolean
          summary?: string | null
        }
        Relationships: []
      }
      eval_human_labels: {
        Row: {
          evaluation_id: string
          grounded: boolean
          helpful: boolean
          note: string
          reviewed_at: string
          reviewed_by: string
          scenario_id: string
          warm: boolean
        }
        Insert: {
          evaluation_id: string
          grounded: boolean
          helpful: boolean
          note?: string
          reviewed_at?: string
          reviewed_by: string
          scenario_id: string
          warm: boolean
        }
        Update: {
          evaluation_id?: string
          grounded?: boolean
          helpful?: boolean
          note?: string
          reviewed_at?: string
          reviewed_by?: string
          scenario_id?: string
          warm?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "eval_human_labels_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "eval_results"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_results: {
        Row: {
          commit_sha: string
          created_at: string
          dataset_version: string
          id: string
          metrics: Json
          mode: string
          model: string
          prompt_version: string
          results: Json
        }
        Insert: {
          commit_sha: string
          created_at?: string
          dataset_version: string
          id?: string
          metrics: Json
          mode: string
          model: string
          prompt_version: string
          results: Json
        }
        Update: {
          commit_sha?: string
          created_at?: string
          dataset_version?: string
          id?: string
          metrics?: Json
          mode?: string
          model?: string
          prompt_version?: string
          results?: Json
        }
        Relationships: []
      }
      holds: {
        Row: {
          expires_at: string
          order_id: string
          product_id: string
        }
        Insert: {
          expires_at: string
          order_id: string
          product_id: string
        }
        Update: {
          expires_at?: string
          order_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          cards: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          link: string | null
          link_label: string | null
          publication: string
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          tool_trace: Json
        }
        Insert: {
          cards?: Json
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          link?: string | null
          link_label?: string | null
          publication?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          tool_trace?: Json
        }
        Update: {
          cards?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          link?: string | null
          link_label?: string | null
          publication?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          tool_trace?: Json
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_rates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          purity: string
          rate_date: string
          rate_paise: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          purity: string
          rate_date?: string
          rate_paise: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          purity?: string
          rate_date?: string
          rate_paise?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          refunded_paise: number
          snapshot: Json
          total_paise: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          refunded_paise?: number
          snapshot: Json
          total_paise: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          refunded_paise?: number
          snapshot?: Json
          total_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          captured_currency: string | null
          captured_paise: number | null
          created_at: string
          customer_id: string
          exception_reason: string | null
          fulfillment_status: string
          hold_expires_at: string
          id: string
          idempotency_key: string
          internal_only: boolean
          payment_status: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_state: string
          quote_id: string
          reconciled_at: string | null
          reservation_code: string | null
          reservation_expires_at: string | null
          total_paise: number
          tracking: string | null
          type: string
          updated_at: string
          visit_at: string | null
        }
        Insert: {
          captured_currency?: string | null
          captured_paise?: number | null
          created_at?: string
          customer_id: string
          exception_reason?: string | null
          fulfillment_status?: string
          hold_expires_at: string
          id?: string
          idempotency_key: string
          internal_only?: boolean
          payment_status?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_state?: string
          quote_id: string
          reconciled_at?: string | null
          reservation_code?: string | null
          reservation_expires_at?: string | null
          total_paise: number
          tracking?: string | null
          type: string
          updated_at?: string
          visit_at?: string | null
        }
        Update: {
          captured_currency?: string | null
          captured_paise?: number | null
          created_at?: string
          customer_id?: string
          exception_reason?: string | null
          fulfillment_status?: string
          hold_expires_at?: string
          id?: string
          idempotency_key?: string
          internal_only?: boolean
          payment_status?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_state?: string
          quote_id?: string
          reconciled_at?: string | null
          reservation_code?: string | null
          reservation_expires_at?: string | null
          total_paise?: number
          tracking?: string | null
          type?: string
          updated_at?: string
          visit_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          content: string
          embedding: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          description_hi: string
          embedding_model: string
          embedding_revision: number
          embedding_status: string
          extraction: Json | null
          gross_mg: number
          huid: string | null
          id: string
          image_embedding: string | null
          image_url: string
          internal_only: boolean
          making_bps: number
          making_fixed_paise: number | null
          name: string
          net_mg: number
          purity: string
          review_confirmed: boolean
          search_document: unknown
          search_document_v2: unknown
          sku: string
          status: string
          stone_paise: number
          tags: string[]
          text_embedding: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          description_hi?: string
          embedding_model?: string
          embedding_revision?: number
          embedding_status?: string
          extraction?: Json | null
          gross_mg: number
          huid?: string | null
          id?: string
          image_embedding?: string | null
          image_url?: string
          internal_only?: boolean
          making_bps?: number
          making_fixed_paise?: number | null
          name: string
          net_mg: number
          purity: string
          review_confirmed?: boolean
          search_document?: unknown
          search_document_v2?: unknown
          sku: string
          status?: string
          stone_paise?: number
          tags?: string[]
          text_embedding?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          description_hi?: string
          embedding_model?: string
          embedding_revision?: number
          embedding_status?: string
          extraction?: Json | null
          gross_mg?: number
          huid?: string | null
          id?: string
          image_embedding?: string | null
          image_url?: string
          internal_only?: boolean
          making_bps?: number
          making_fixed_paise?: number | null
          name?: string
          net_mg?: number
          purity?: string
          review_confirmed?: boolean
          search_document?: unknown
          search_document_v2?: unknown
          sku?: string
          status?: string
          stone_paise?: number
          tags?: string[]
          text_embedding?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          id: string
          product_id: string
          quote_id: string
          snapshot: Json
          total_paise: number
        }
        Insert: {
          id?: string
          product_id: string
          quote_id: string
          snapshot: Json
          total_paise: number
        }
        Update: {
          id?: string
          product_id?: string
          quote_id?: string
          snapshot?: Json
          total_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          total_paise: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string
          id?: string
          total_paise: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          total_paise?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      refund_items: {
        Row: {
          amount_paise: number
          order_item_id: string
          refund_id: string
        }
        Insert: {
          amount_paise: number
          order_item_id: string
          refund_id: string
        }
        Update: {
          amount_paise?: number
          order_item_id?: string
          refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_items_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_paise: number
          conversation_id: string | null
          created_at: string
          customer_id: string
          decision_at: string | null
          decision_by: string | null
          id: string
          item_ids: string[]
          order_id: string
          provider_refund_id: string | null
          reason: string
          reconciled_at: string | null
          status: string
        }
        Insert: {
          amount_paise: number
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          decision_at?: string | null
          decision_by?: string | null
          id?: string
          item_ids?: string[]
          order_id: string
          provider_refund_id?: string | null
          reason: string
          reconciled_at?: string | null
          status?: string
        }
        Update: {
          amount_paise?: number
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          decision_at?: string | null
          decision_by?: string | null
          id?: string
          item_ids?: string[]
          order_id?: string
          provider_refund_id?: string | null
          reason?: string
          reconciled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_conversation_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          version: string
        }
        Insert: {
          applied_at?: string
          version: string
        }
        Update: {
          applied_at?: string
          version?: string
        }
        Relationships: []
      }
      search_events: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count: number
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          payload: Json
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      catalogue: {
        Row: {
          availability: string | null
          category: string | null
          created_at: string | null
          description: string | null
          description_hi: string | null
          embedding_model: string | null
          embedding_revision: number | null
          embedding_status: string | null
          extraction: Json | null
          gross_mg: number | null
          huid: string | null
          id: string | null
          image_embedding: string | null
          image_url: string | null
          internal_only: boolean | null
          making_bps: number | null
          making_fixed_paise: number | null
          name: string | null
          net_mg: number | null
          price: Json | null
          purity: string | null
          rate_paise: number | null
          review_confirmed: boolean | null
          search_document: unknown
          search_document_v2: unknown
          sku: string | null
          status: string | null
          stone_paise: number | null
          tags: string[] | null
          text_embedding: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      allow_request: {
        Args: { k: string; maximum: number; seconds: number }
        Returns: boolean
      }
      begin_checkout: {
        Args: {
          actor: string
          idem: string
          kind?: string
          qid: string
          visit?: string
        }
        Returns: string
      }
      calculate_price: {
        Args: { p: Database["public"]["Tables"]["products"]["Row"]; r: number }
        Returns: Json
      }
      expire_holds: { Args: never; Returns: number }
      is_staff: { Args: never; Returns: boolean }
      make_quote: { Args: { actor: string; ids: string[] }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
