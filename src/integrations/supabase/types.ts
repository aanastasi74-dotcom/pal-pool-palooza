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
      boletins: {
        Row: {
          created_at: string
          data_referencia: string
          id: string
          modelo_usado: string | null
          publicado_em: string | null
          publicado_md: string | null
          publicado_por: string | null
          rascunho_md: string | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_referencia: string
          id?: string
          modelo_usado?: string | null
          publicado_em?: string | null
          publicado_md?: string | null
          publicado_por?: string | null
          rascunho_md?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_referencia?: string
          id?: string
          modelo_usado?: string | null
          publicado_em?: string | null
          publicado_md?: string | null
          publicado_por?: string | null
          rascunho_md?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletins_publicado_por_fkey"
            columns: ["publicado_por"]
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
      faixas_premiacao: {
        Row: {
          created_at: string | null
          devolucao_pos_ate: number | null
          devolucao_pos_de: number | null
          devolucao_qts: number
          id: number
          nome: string
          pct_1: number
          pct_2: number
          pct_3: number
          pct_4: number
          pct_5: number
          pct_6_10_cada: number
          pct_lant: number
          quotas_max: number | null
          quotas_min: number
          rotulo_faixa: string
        }
        Insert: {
          created_at?: string | null
          devolucao_pos_ate?: number | null
          devolucao_pos_de?: number | null
          devolucao_qts?: number
          id: number
          nome: string
          pct_1: number
          pct_2: number
          pct_3: number
          pct_4?: number
          pct_5?: number
          pct_6_10_cada?: number
          pct_lant?: number
          quotas_max?: number | null
          quotas_min: number
          rotulo_faixa: string
        }
        Update: {
          created_at?: string | null
          devolucao_pos_ate?: number | null
          devolucao_pos_de?: number | null
          devolucao_qts?: number
          id?: number
          nome?: string
          pct_1?: number
          pct_2?: number
          pct_3?: number
          pct_4?: number
          pct_5?: number
          pct_6_10_cada?: number
          pct_lant?: number
          quotas_max?: number | null
          quotas_min?: number
          rotulo_faixa?: string
        }
        Relationships: []
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
      lembretes_enviados: {
        Row: {
          data_referencia: string
          enviado_em: string | null
          erro: string | null
          id: string
          profile_id: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          data_referencia: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          profile_id?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          data_referencia?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          profile_id?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_enviados_profile_id_fkey"
            columns: ["profile_id"]
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
          eventos: Json | null
          fase: string
          fora: string
          hora_definida: boolean
          id: string
          numero_jogo: number | null
          penaltis_casa: number | null
          penaltis_fora: number | null
          peso: number
          placar_casa: number | null
          placar_casa_prorrogacao: number | null
          placar_fora: number | null
          placar_fora_prorrogacao: number | null
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
          eventos?: Json | null
          fase: string
          fora: string
          hora_definida?: boolean
          id?: string
          numero_jogo?: number | null
          penaltis_casa?: number | null
          penaltis_fora?: number | null
          peso?: number
          placar_casa?: number | null
          placar_casa_prorrogacao?: number | null
          placar_fora?: number | null
          placar_fora_prorrogacao?: number | null
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
          eventos?: Json | null
          fase?: string
          fora?: string
          hora_definida?: boolean
          id?: string
          numero_jogo?: number | null
          penaltis_casa?: number | null
          penaltis_fora?: number | null
          peso?: number
          placar_casa?: number | null
          placar_casa_prorrogacao?: number | null
          placar_fora?: number | null
          placar_fora_prorrogacao?: number | null
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
          lote_id: string | null
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
          lote_id?: string | null
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
          lote_id?: string | null
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
            foreignKeyName: "payments_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_compra"
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
      perfis_personalidade: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          descricao: string | null
          profile_id: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          descricao?: string | null
          profile_id: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          descricao?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_personalidade_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_personalidade_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
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
          aceitou_regras_em: string | null
          apelido: string
          ativo: boolean
          cor: string | null
          created_at: string | null
          email: string
          email_regras_enviado_em: string | null
          id: string
          limite_quotas_custom: number | null
          nome: string
          notificacoes: Json | null
          recebe_lembretes_email: boolean
          role: string
          sigla: string | null
          ultimo_acesso: string | null
        }
        Insert: {
          aceitou_regras_em?: string | null
          apelido: string
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          email: string
          email_regras_enviado_em?: string | null
          id: string
          limite_quotas_custom?: number | null
          nome: string
          notificacoes?: Json | null
          recebe_lembretes_email?: boolean
          role?: string
          sigla?: string | null
          ultimo_acesso?: string | null
        }
        Update: {
          aceitou_regras_em?: string | null
          apelido?: string
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          email?: string
          email_regras_enviado_em?: string | null
          id?: string
          limite_quotas_custom?: number | null
          nome?: string
          notificacoes?: Json | null
          recebe_lembretes_email?: boolean
          role?: string
          sigla?: string | null
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
      sync_logs: {
        Row: {
          chamadas_api: number | null
          detalhe: Json | null
          duracao_ms: number | null
          erro: string | null
          executado_em: string
          id: string
          jogos_atualizados: number | null
          jogos_verificados: number | null
          modo: string
          season: string | null
        }
        Insert: {
          chamadas_api?: number | null
          detalhe?: Json | null
          duracao_ms?: number | null
          erro?: string | null
          executado_em?: string
          id?: string
          jogos_atualizados?: number | null
          jogos_verificados?: number | null
          modo: string
          season?: string | null
        }
        Update: {
          chamadas_api?: number | null
          detalhe?: Json | null
          duracao_ms?: number | null
          erro?: string | null
          executado_em?: string
          id?: string
          jogos_atualizados?: number | null
          jogos_verificados?: number | null
          modo?: string
          season?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          bandeira_emoji: string
          bracket_position: string
          codigo_api: number | null
          confederacao: string | null
          created_at: string | null
          grupo: string
          id: string
          nome_pt: string
        }
        Insert: {
          bandeira_emoji: string
          bracket_position: string
          codigo_api?: number | null
          confederacao?: string | null
          created_at?: string | null
          grupo: string
          id?: string
          nome_pt: string
        }
        Update: {
          bandeira_emoji?: string
          bracket_position?: string
          codigo_api?: number | null
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
          pontos_calculados: number
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
          pontos_calculados?: number
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
          pontos_calculados?: number
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
      vw_capacidade_infra: {
        Row: {
          emails_atual: number | null
          emails_max: number | null
          emails_pct: number | null
          perebas_atual: number | null
          perebas_max: number | null
          perebas_pct: number | null
          quotas_atual: number | null
          quotas_max: number | null
          quotas_pct: number | null
          storage_atual_bytes: number | null
          storage_max_bytes: number | null
          storage_pct: number | null
          threshold_amarelo: number | null
          threshold_vermelho: number | null
        }
        Relationships: []
      }
      vw_emails_enviados_mes: {
        Row: {
          aprovacoes: number | null
          convites: number | null
          lembretes: number | null
          rejeicoes: number | null
          total_estimado: number | null
        }
        Relationships: []
      }
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
      aceitar_regras: { Args: never; Returns: string }
      admin_list_usuarios: {
        Args: never
        Returns: {
          aceitou_regras_em: string
          apelido: string
          ativo: boolean
          cor: string
          created_at: string
          email: string
          email_regras_enviado_em: string
          id: string
          limite_quotas_custom: number
          nome: string
          notificacoes: Json
          quotas_ativas: number
          quotas_outras: number
          quotas_total: number
          role: string
          sigla: string
          ultimo_acesso: string
        }[]
      }
      admin_set_ativo: {
        Args: { p_ativo: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      alertar_capacidade: { Args: never; Returns: Json }
      aprovar_lote: {
        Args: { p_aprovar_n?: number; p_lote_id: string }
        Returns: Json
      }
      ativar_quota_manual: {
        Args: { p_motivo: string; p_quota_id: string }
        Returns: Json
      }
      calcular_premiacao: { Args: { p_quotas_ativas: number }; Returns: Json }
      check_apelido_disponivel: {
        Args: { p_apelido: string }
        Returns: boolean
      }
      check_capacidade: { Args: never; Returns: Json }
      cleanup_quotas_incompletas: { Args: never; Returns: number }
      compute_default_sigla: { Args: { p_nome: string }; Returns: string }
      consume_invite: { Args: { p_token: string }; Returns: boolean }
      derivar_periodo: { Args: { p_minuto: string }; Returns: string }
      encerrar_lote_por_decisao: {
        Args: { p_lote_id: string; p_motivo: string }
        Returns: Json
      }
      encerrar_quota_manual: {
        Args: { p_motivo: string; p_quota_id: string }
        Returns: Json
      }
      enviar_comprovante_lote: {
        Args: { p_comprovante_url: string; p_lote_id: string }
        Returns: Json
      }
      fase_atual_copa: { Args: never; Returns: string }
      get_arrecadacao_atual: { Args: never; Returns: number }
      get_arrecadacao_potencial: { Args: never; Returns: number }
      get_estatisticas_palpites: { Args: { p_match_id: string }; Returns: Json }
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
          numero: number
          numero_jogo: number
          palpite_casa: number
          palpite_fora: number
          penaltis_casa: number
          penaltis_fora: number
          placar_casa: number
          placar_casa_prorrogacao: number
          placar_fora: number
          placar_fora_prorrogacao: number
          pontos_calculados: number
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
      get_perebas_com_palpite_faltante: {
        Args: { p_data_alvo: string }
        Returns: {
          apelido: string
          email: string
          id: string
          nome: string
          palpites_faltantes: number
          recebe_lembretes_email: boolean
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
          sigla: string
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
          sigla: string
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
          sigla: string
          user_id: string
        }[]
      }
      get_so_voce_achou: {
        Args: { p_match_id: string; p_quota_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      limite_perebas_hard: { Args: never; Returns: number }
      limite_quotas_global_hard: { Args: never; Returns: number }
      limite_quotas_pereba: { Args: { p_user_id: string }; Returns: number }
      marcar_email_regras_enviado: { Args: never; Returns: string }
      pode_comprar_quota:
        | { Args: { p_user_id: string }; Returns: Json }
        | { Args: { p_quantidade?: number; p_user_id: string }; Returns: Json }
      pode_criar_quota: { Args: never; Returns: boolean }
      pode_emitir_convite: { Args: never; Returns: Json }
      promote_to_admin: { Args: { p_email: string }; Returns: string }
      proximo_numero_quota: { Args: { p_user_id: string }; Returns: number }
      recompute_peso_jogos: { Args: never; Returns: undefined }
      rejeitar_lote: {
        Args: { p_lote_id: string; p_motivo: string }
        Returns: Json
      }
      vencedor_real: { Args: { p_match_id: string }; Returns: string }
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
