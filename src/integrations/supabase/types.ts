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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          ator_id: string | null
          ator_nome: string | null
          created_at: string | null
          entidade: string
          entidade_id: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          acao: string
          ator_id?: string | null
          ator_nome?: string | null
          created_at?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          acao?: string
          ator_id?: string | null
          ator_nome?: string | null
          created_at?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_ator_id_fkey"
            columns: ["ator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletins: {
        Row: {
          agendado_para: string | null
          conteudo: string
          conteudo_original: string | null
          created_at: string | null
          data: string
          id: string
          publicado_em: string | null
          publicado_por: string | null
          status: string
          titulo: string
        }
        Insert: {
          agendado_para?: string | null
          conteudo: string
          conteudo_original?: string | null
          created_at?: string | null
          data: string
          id?: string
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          titulo: string
        }
        Update: {
          agendado_para?: string | null
          conteudo?: string
          conteudo_original?: string | null
          created_at?: string | null
          data?: string
          id?: string
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletins_publicado_por_fkey"
            columns: ["publicado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          criado_por: string | null
          email: string
          enviado_em: string | null
          expira_em: string
          id: string
          mensagem: string | null
          nome: string
          status: string
          token: string
          usado_em: string | null
        }
        Insert: {
          criado_por?: string | null
          email: string
          enviado_em?: string | null
          expira_em?: string
          id?: string
          mensagem?: string | null
          nome: string
          status?: string
          token?: string
          usado_em?: string | null
        }
        Update: {
          criado_por?: string | null
          email?: string
          enviado_em?: string | null
          expira_em?: string
          id?: string
          mensagem?: string | null
          nome?: string
          status?: string
          token?: string
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_compra: {
        Row: {
          comprovante_url: string | null
          criado_em: string
          decidido_em: string | null
          id: string
          motivo_rejeicao: string | null
          quantidade_pedida: number
          status: string
          tentativas_comprovante: number
          user_id: string
          valor_esperado: number
        }
        Insert: {
          comprovante_url?: string | null
          criado_em?: string
          decidido_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          quantidade_pedida: number
          status?: string
          tentativas_comprovante?: number
          user_id: string
          valor_esperado: number
        }
        Update: {
          comprovante_url?: string | null
          criado_em?: string
          decidido_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          quantidade_pedida?: number
          status?: string
          tentativas_comprovante?: number
          user_id?: string
          valor_esperado?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          casa: string
          cidade: string | null
          created_at: string | null
          data_jogo: string
          estadio: string | null
          fase: string
          fora: string
          hora_definida: boolean
          id: string
          numero_jogo: number | null
          peso: number
          placar_casa: number | null
          placar_fora: number | null
          slot_casa: string | null
          slot_visitante: string | null
          stadium_id: string | null
          status: string
          team_away_id: string | null
          team_home_id: string | null
          travado_em: string | null
        }
        Insert: {
          casa: string
          cidade?: string | null
          created_at?: string | null
          data_jogo: string
          estadio?: string | null
          fase: string
          fora: string
          hora_definida?: boolean
          id?: string
          numero_jogo?: number | null
          peso?: number
          placar_casa?: number | null
          placar_fora?: number | null
          slot_casa?: string | null
          slot_visitante?: string | null
          stadium_id?: string | null
          status?: string
          team_away_id?: string | null
          team_home_id?: string | null
          travado_em?: string | null
        }
        Update: {
          casa?: string
          cidade?: string | null
          created_at?: string | null
          data_jogo?: string
          estadio?: string | null
          fase?: string
          fora?: string
          hora_definida?: boolean
          id?: string
          numero_jogo?: number | null
          peso?: number
          placar_casa?: number | null
          placar_fora?: number | null
          slot_casa?: string | null
          slot_visitante?: string | null
          stadium_id?: string | null
          status?: string
          team_away_id?: string | null
          team_home_id?: string | null
          travado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_stadium_id_fkey"
            columns: ["stadium_id"]
            isOneToOne: false
            referencedRelation: "stadiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_away_id_fkey"
            columns: ["team_away_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_home_id_fkey"
            columns: ["team_home_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          comprovante_path: string | null
          created_at: string | null
          id: string
          motivo_rejeicao: string | null
          quota_id: string | null
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          comprovante_path?: string | null
          created_at?: string | null
          id?: string
          motivo_rejeicao?: string | null
          quota_id?: string | null
          status?: string
          user_id: string
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          comprovante_path?: string | null
          created_at?: string | null
          id?: string
          motivo_rejeicao?: string | null
          quota_id?: string | null
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_profiles: {
        Row: {
          apelido_principal: string
          apelidos_alternativos: string[] | null
          created_at: string | null
          id: string
          observacoes_admin: string | null
          participante_id: string | null
          tags: string[] | null
          tracos: Json | null
          updated_at: string | null
        }
        Insert: {
          apelido_principal: string
          apelidos_alternativos?: string[] | null
          created_at?: string | null
          id?: string
          observacoes_admin?: string | null
          participante_id?: string | null
          tags?: string[] | null
          tracos?: Json | null
          updated_at?: string | null
        }
        Update: {
          apelido_principal?: string
          apelidos_alternativos?: string[] | null
          created_at?: string | null
          id?: string
          observacoes_admin?: string | null
          participante_id?: string | null
          tags?: string[] | null
          tracos?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personality_profiles_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          placar_casa: number | null
          placar_fora: number | null
          pontos_calculados: number | null
          quota_id: string
          submetido_em: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          placar_casa?: number | null
          placar_fora?: number | null
          pontos_calculados?: number | null
          quota_id: string
          submetido_em?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          placar_casa?: number | null
          placar_fora?: number | null
          pontos_calculados?: number | null
          quota_id?: string
          submetido_em?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apelido: string
          ativo: boolean
          cor: string | null
          created_at: string | null
          email: string
          id: string
          limite_quotas_custom: number | null
          nome: string
          notificacoes: Json | null
          role: string
          ultimo_acesso: string | null
        }
        Insert: {
          apelido: string
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          email: string
          id: string
          limite_quotas_custom?: number | null
          nome: string
          notificacoes?: Json | null
          role?: string
          ultimo_acesso?: string | null
        }
        Update: {
          apelido?: string
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          email?: string
          id?: string
          limite_quotas_custom?: number | null
          nome?: string
          notificacoes?: Json | null
          role?: string
          ultimo_acesso?: string | null
        }
        Relationships: []
      }
      quotas: {
        Row: {
          apelido: string | null
          created_at: string | null
          elegivel_lanterna: boolean | null
          id: string
          lote_id: string | null
          motivo_rejeicao: string | null
          numero: number | null
          paga_em: string | null
          palpites_possiveis: number | null
          palpites_validos: number | null
          pontos: number | null
          posicao: number | null
          status: string
          tentativas_comprovante: number
          user_id: string
        }
        Insert: {
          apelido?: string | null
          created_at?: string | null
          elegivel_lanterna?: boolean | null
          id?: string
          lote_id?: string | null
          motivo_rejeicao?: string | null
          numero?: number | null
          paga_em?: string | null
          palpites_possiveis?: number | null
          palpites_validos?: number | null
          pontos?: number | null
          posicao?: number | null
          status?: string
          tentativas_comprovante?: number
          user_id: string
        }
        Update: {
          apelido?: string | null
          created_at?: string | null
          elegivel_lanterna?: boolean | null
          id?: string
          lote_id?: string | null
          motivo_rejeicao?: string | null
          numero?: number | null
          paga_em?: string | null
          palpites_possiveis?: number | null
          palpites_validos?: number | null
          pontos?: number | null
          posicao?: number | null
          status?: string
          tentativas_comprovante?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          created_at: string | null
          descricao: string
          id: string
          severidade: string
          status: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          severidade: string
          status?: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          severidade?: string
          status?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stadiums: {
        Row: {
          cidade: string
          created_at: string | null
          fuso_horario: string
          id: string
          nome: string
          pais: string
        }
        Insert: {
          cidade: string
          created_at?: string | null
          fuso_horario: string
          id?: string
          nome: string
          pais: string
        }
        Update: {
          cidade?: string
          created_at?: string | null
          fuso_horario?: string
          id?: string
          nome?: string
          pais?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          bandeira_emoji: string
          bracket_position: string
          confederacao: string | null
          created_at: string | null
          grupo: string
          id: string
          nome_pt: string
        }
        Insert: {
          bandeira_emoji: string
          bracket_position: string
          confederacao?: string | null
          created_at?: string | null
          grupo: string
          id?: string
          nome_pt: string
        }
        Update: {
          bandeira_emoji?: string
          bracket_position?: string
          confederacao?: string | null
          created_at?: string | null
          grupo?: string
          id?: string
          nome_pt?: string
        }
        Relationships: []
      }
      top4_predictions: {
        Row: {
          alterado_em: string | null
          fase_alteracao: string | null
          id: string
          peso_no_palpite: number
          posicao_1: string | null
          posicao_2: string | null
          posicao_3: string | null
          posicao_4: string | null
          quota_id: string
        }
        Insert: {
          alterado_em?: string | null
          fase_alteracao?: string | null
          id?: string
          peso_no_palpite?: number
          posicao_1?: string | null
          posicao_2?: string | null
          posicao_3?: string | null
          posicao_4?: string | null
          quota_id: string
        }
        Update: {
          alterado_em?: string | null
          fase_alteracao?: string | null
          id?: string
          peso_no_palpite?: number
          posicao_1?: string | null
          posicao_2?: string | null
          posicao_3?: string | null
          posicao_4?: string | null
          quota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top4_predictions_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: true
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_perebas_count: {
        Row: {
          convites_pendentes: number | null
          signups: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_ativo: {
        Args: { p_ativo: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      check_apelido_disponivel: {
        Args: { p_apelido: string }
        Returns: boolean
      }
      cleanup_quotas_incompletas: { Args: never; Returns: number }
      consume_invite: { Args: { p_token: string }; Returns: boolean }
      fase_atual_copa: { Args: never; Returns: string }
      get_arrecadacao_atual: { Args: never; Returns: number }
      get_arrecadacao_potencial: { Args: never; Returns: number }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expira_em: string
          id: string
          mensagem: string
          nome: string
          status: string
        }[]
      }
      get_palpites_publicos_jogos: {
        Args: { p_user_id: string }
        Returns: {
          casa: string
          data_jogo: string
          fase: string
          fora: string
          match_id: string
          numero_jogo: number
          placar_casa_palpite: number
          placar_casa_real: number
          placar_fora_palpite: number
          placar_fora_real: number
          pontos: number
          quota_numero: number
          slot_casa: string
          slot_visitante: string
          status: string
          team_away_id: string
          team_home_id: string
        }[]
      }
      get_palpites_publicos_top4: {
        Args: { p_user_id: string }
        Returns: {
          alterado_em: string
          fase_alteracao: string
          posicao_1: string
          posicao_2: string
          posicao_3: string
          posicao_4: string
          quota_numero: number
        }[]
      }
      get_peso_top4_atual: { Args: never; Returns: number }
      get_profile_public: {
        Args: { p_user_id: string }
        Returns: {
          apelido: string
          cor: string
          id: string
          nome: string
        }[]
      }
      get_ranking_diario: {
        Args: { data_referencia?: string }
        Returns: {
          apelido: string
          cor: string
          exatos: number
          nome: string
          numero: number
          pontos: number
          posicao: number
          quota_id: string
          resultados: number
          user_id: string
        }[]
      }
      get_ranking_geral: {
        Args: never
        Returns: {
          apelido: string
          cor: string
          exatos: number
          nome: string
          numero: number
          pontos: number
          posicao: number
          quota_id: string
          resultados: number
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      limite_perebas_hard: { Args: never; Returns: number }
      limite_quotas_global_hard: { Args: never; Returns: number }
      limite_quotas_pereba: { Args: { p_user_id: string }; Returns: number }
      pode_comprar_quota: { Args: { p_user_id: string }; Returns: Json }
      pode_criar_quota: { Args: never; Returns: boolean }
      pode_emitir_convite: { Args: never; Returns: Json }
      promote_to_admin: { Args: { p_email: string }; Returns: string }
      proximo_numero_quota: { Args: { p_user_id: string }; Returns: number }
      recompute_peso_jogos: { Args: never; Returns: undefined }
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
