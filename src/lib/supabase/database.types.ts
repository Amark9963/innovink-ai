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
      access_review_cycles: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["access_review_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["access_review_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["access_review_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_review_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_cycles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      access_review_items: {
        Row: {
          access_review_cycle_id: string
          created_at: string
          id: string
          membership_id: string
          membership_table: string
          notes: string | null
          review_state: Database["public"]["Enums"]["access_review_item_state"]
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          access_review_cycle_id: string
          created_at?: string
          id?: string
          membership_id: string
          membership_table: string
          notes?: string | null
          review_state?: Database["public"]["Enums"]["access_review_item_state"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          access_review_cycle_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          membership_table?: string
          notes?: string | null
          review_state?: Database["public"]["Enums"]["access_review_item_state"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_review_items_access_review_cycle_id_fkey"
            columns: ["access_review_cycle_id"]
            isOneToOne: false
            referencedRelation: "access_review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_name: string
          event_summary: string | null
          id: string
          metadata: Json
          organization_id: string | null
          program_id: string | null
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_name: string
          event_summary?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_name?: string
          event_summary?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          actor_user_id: string | null
          approval_request_id: string | null
          brief_id: string | null
          content_payload: Json
          content_text: string | null
          created_at: string
          execution_run_id: string | null
          id: string
          kind: Database["public"]["Enums"]["agent_message_kind"]
          model_name: string | null
          plan_id: string | null
          role: Database["public"]["Enums"]["agent_message_role"]
          session_id: string
        }
        Insert: {
          actor_user_id?: string | null
          approval_request_id?: string | null
          brief_id?: string | null
          content_payload?: Json
          content_text?: string | null
          created_at?: string
          execution_run_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_message_kind"]
          model_name?: string | null
          plan_id?: string | null
          role: Database["public"]["Enums"]["agent_message_role"]
          session_id: string
        }
        Update: {
          actor_user_id?: string | null
          approval_request_id?: string | null
          brief_id?: string | null
          content_payload?: Json
          content_text?: string | null
          created_at?: string
          execution_run_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_message_kind"]
          model_name?: string | null
          plan_id?: string | null
          role?: Database["public"]["Enums"]["agent_message_role"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_execution_run_id_fkey"
            columns: ["execution_run_id"]
            isOneToOne: false
            referencedRelation: "execution_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          brief_id: string | null
          created_at: string
          created_by: string
          id: string
          last_message_at: string | null
          organization_id: string | null
          program_id: string | null
          session_metadata: Json
          status: Database["public"]["Enums"]["agent_session_status"]
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brief_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string | null
          organization_id?: string | null
          program_id?: string | null
          session_metadata?: Json
          status?: Database["public"]["Enums"]["agent_session_status"]
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brief_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string | null
          organization_id?: string | null
          program_id?: string | null
          session_metadata?: Json
          status?: Database["public"]["Enums"]["agent_session_status"]
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          approval_request_id: string | null
          brief_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          current_task_id: string | null
          error_payload: Json
          execution_run_id: string | null
          executor_model: string | null
          goal_text: string | null
          id: string
          organization_id: string | null
          plan_id: string | null
          planner_model: string | null
          program_id: string | null
          run_input: Json
          run_output: Json
          run_type: Database["public"]["Enums"]["agent_run_type"]
          session_id: string
          started_at: string | null
          started_by: string
          status: Database["public"]["Enums"]["agent_run_status"]
          summary: string | null
          updated_at: string
          user_instruction: string | null
          workspace_id: string
        }
        Insert: {
          approval_request_id?: string | null
          brief_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_task_id?: string | null
          error_payload?: Json
          execution_run_id?: string | null
          executor_model?: string | null
          goal_text?: string | null
          id?: string
          organization_id?: string | null
          plan_id?: string | null
          planner_model?: string | null
          program_id?: string | null
          run_input?: Json
          run_output?: Json
          run_type: Database["public"]["Enums"]["agent_run_type"]
          session_id: string
          started_at?: string | null
          started_by: string
          status?: Database["public"]["Enums"]["agent_run_status"]
          summary?: string | null
          updated_at?: string
          user_instruction?: string | null
          workspace_id: string
        }
        Update: {
          approval_request_id?: string | null
          brief_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_task_id?: string | null
          error_payload?: Json
          execution_run_id?: string | null
          executor_model?: string | null
          goal_text?: string | null
          id?: string
          organization_id?: string | null
          plan_id?: string | null
          planner_model?: string | null
          program_id?: string | null
          run_input?: Json
          run_output?: Json
          run_type?: Database["public"]["Enums"]["agent_run_type"]
          session_id?: string
          started_at?: string | null
          started_by?: string
          status?: Database["public"]["Enums"]["agent_run_status"]
          summary?: string | null
          updated_at?: string
          user_instruction?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_current_task_fk"
            columns: ["current_task_id"]
            isOneToOne: false
            referencedRelation: "agent_run_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_execution_run_id_fkey"
            columns: ["execution_run_id"]
            isOneToOne: false
            referencedRelation: "execution_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_run_tasks: {
        Row: {
          approval_required: boolean
          blocking: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          error_payload: Json
          id: string
          input_payload: Json
          output_payload: Json
          parent_task_id: string | null
          priority: number
          run_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["agent_task_status"]
          task_type: Database["public"]["Enums"]["agent_task_type"]
          title: string
          updated_at: string
          waiting_reason: string | null
        }
        Insert: {
          approval_required?: boolean
          blocking?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          error_payload?: Json
          id?: string
          input_payload?: Json
          output_payload?: Json
          parent_task_id?: string | null
          priority?: number
          run_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_task_status"]
          task_type: Database["public"]["Enums"]["agent_task_type"]
          title: string
          updated_at?: string
          waiting_reason?: string | null
        }
        Update: {
          approval_required?: boolean
          blocking?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          error_payload?: Json
          id?: string
          input_payload?: Json
          output_payload?: Json
          parent_task_id?: string | null
          priority?: number
          run_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_task_status"]
          task_type?: Database["public"]["Enums"]["agent_task_type"]
          title?: string
          updated_at?: string
          waiting_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_run_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_calls: {
        Row: {
          approval_required: boolean
          completed_at: string | null
          created_at: string
          error_payload: Json
          executor_type: string
          id: string
          input_payload: Json
          latency_ms: number | null
          organization_id: string | null
          output_payload: Json
          program_id: string | null
          risk_level: Database["public"]["Enums"]["agent_tool_risk_level"]
          run_id: string
          session_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["agent_tool_call_status"]
          task_id: string | null
          tool_name: string
          tool_version: string | null
          workspace_id: string
        }
        Insert: {
          approval_required?: boolean
          completed_at?: string | null
          created_at?: string
          error_payload?: Json
          executor_type: string
          id?: string
          input_payload?: Json
          latency_ms?: number | null
          organization_id?: string | null
          output_payload?: Json
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["agent_tool_risk_level"]
          run_id: string
          session_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_tool_call_status"]
          task_id?: string | null
          tool_name: string
          tool_version?: string | null
          workspace_id: string
        }
        Update: {
          approval_required?: boolean
          completed_at?: string | null
          created_at?: string
          error_payload?: Json
          executor_type?: string
          id?: string
          input_payload?: Json
          latency_ms?: number | null
          organization_id?: string | null
          output_payload?: Json
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["agent_tool_risk_level"]
          run_id?: string
          session_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_tool_call_status"]
          task_id?: string | null
          tool_name?: string
          tool_version?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_run_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_events: {
        Row: {
          body: string | null
          created_at: string
          event_payload: Json
          event_type: Database["public"]["Enums"]["agent_event_type"]
          id: string
          organization_id: string | null
          program_id: string | null
          run_id: string | null
          session_id: string
          severity: Database["public"]["Enums"]["agent_event_severity"]
          task_id: string | null
          title: string
          tool_call_id: string | null
          visible_to_user: boolean
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_payload?: Json
          event_type: Database["public"]["Enums"]["agent_event_type"]
          id?: string
          organization_id?: string | null
          program_id?: string | null
          run_id?: string | null
          session_id: string
          severity?: Database["public"]["Enums"]["agent_event_severity"]
          task_id?: string | null
          title: string
          tool_call_id?: string | null
          visible_to_user?: boolean
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: Database["public"]["Enums"]["agent_event_type"]
          id?: string
          organization_id?: string | null
          program_id?: string | null
          run_id?: string | null
          session_id?: string
          severity?: Database["public"]["Enums"]["agent_event_severity"]
          task_id?: string | null
          title?: string
          tool_call_id?: string | null
          visible_to_user?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_run_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_tool_call_id_fkey"
            columns: ["tool_call_id"]
            isOneToOne: false
            referencedRelation: "agent_tool_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          artifact_source_id: string | null
          artifact_source_table: string | null
          artifact_type: Database["public"]["Enums"]["agent_artifact_type"] | null
          confidence: Database["public"]["Enums"]["agent_memory_confidence"]
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          memory_key: string
          memory_payload: Json
          memory_scope: Database["public"]["Enums"]["agent_memory_scope"]
          organization_id: string | null
          program_id: string | null
          session_id: string | null
          source_event_id: string | null
          source_run_id: string | null
          source_type: Database["public"]["Enums"]["agent_memory_source_type"]
          summary: string
          superseded_by: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          artifact_source_id?: string | null
          artifact_source_table?: string | null
          artifact_type?: Database["public"]["Enums"]["agent_artifact_type"] | null
          confidence?: Database["public"]["Enums"]["agent_memory_confidence"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          memory_key: string
          memory_payload?: Json
          memory_scope: Database["public"]["Enums"]["agent_memory_scope"]
          organization_id?: string | null
          program_id?: string | null
          session_id?: string | null
          source_event_id?: string | null
          source_run_id?: string | null
          source_type: Database["public"]["Enums"]["agent_memory_source_type"]
          summary: string
          superseded_by?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          artifact_source_id?: string | null
          artifact_source_table?: string | null
          artifact_type?: Database["public"]["Enums"]["agent_artifact_type"] | null
          confidence?: Database["public"]["Enums"]["agent_memory_confidence"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          memory_key?: string
          memory_payload?: Json
          memory_scope?: Database["public"]["Enums"]["agent_memory_scope"]
          organization_id?: string | null
          program_id?: string | null
          session_id?: string | null
          source_event_id?: string | null
          source_run_id?: string | null
          source_type?: Database["public"]["Enums"]["agent_memory_source_type"]
          summary?: string
          superseded_by?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "agent_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "agent_memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_artifacts: {
        Row: {
          approved_at: string | null
          artifact_payload: Json
          artifact_type: Database["public"]["Enums"]["agent_artifact_type"]
          created_at: string
          created_by_run_id: string | null
          executed_at: string | null
          id: string
          organization_id: string | null
          program_id: string | null
          run_id: string | null
          session_id: string
          source_id: string
          source_table: string
          status: Database["public"]["Enums"]["agent_artifact_status"]
          summary: string | null
          task_id: string | null
          title: string | null
          updated_at: string
          version_label: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          artifact_payload?: Json
          artifact_type: Database["public"]["Enums"]["agent_artifact_type"]
          created_at?: string
          created_by_run_id?: string | null
          executed_at?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          run_id?: string | null
          session_id: string
          source_id: string
          source_table: string
          status?: Database["public"]["Enums"]["agent_artifact_status"]
          summary?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          version_label?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          artifact_payload?: Json
          artifact_type?: Database["public"]["Enums"]["agent_artifact_type"]
          created_at?: string
          created_by_run_id?: string | null
          executed_at?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          run_id?: string | null
          session_id?: string
          source_id?: string
          source_table?: string
          status?: Database["public"]["Enums"]["agent_artifact_status"]
          summary?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          version_label?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_artifacts_created_by_run_id_fkey"
            columns: ["created_by_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_artifacts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_artifacts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_artifacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_run_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_approval_checkpoints: {
        Row: {
          approval_request_id: string | null
          checkpoint_payload: Json
          checkpoint_type: Database["public"]["Enums"]["agent_checkpoint_type"]
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          program_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_level: Database["public"]["Enums"]["agent_tool_risk_level"]
          run_id: string
          session_id: string
          status: Database["public"]["Enums"]["agent_checkpoint_status"]
          task_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approval_request_id?: string | null
          checkpoint_payload?: Json
          checkpoint_type: Database["public"]["Enums"]["agent_checkpoint_type"]
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level: Database["public"]["Enums"]["agent_tool_risk_level"]
          run_id: string
          session_id: string
          status?: Database["public"]["Enums"]["agent_checkpoint_status"]
          task_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approval_request_id?: string | null
          checkpoint_payload?: Json
          checkpoint_type?: Database["public"]["Enums"]["agent_checkpoint_type"]
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: Database["public"]["Enums"]["agent_tool_risk_level"]
          run_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["agent_checkpoint_status"]
          task_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_approval_checkpoints_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_run_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_checkpoints_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feature_configs: {
        Row: {
          created_at: string
          enabled: boolean
          feature_config: Json
          feature_key: string
          id: string
          organization_id: string | null
          program_id: string | null
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_config?: Json
          feature_key: string
          id?: string
          organization_id?: string | null
          program_id?: string | null
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_config?: Json
          feature_key?: string
          id?: string
          organization_id?: string | null
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_configs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feature_policies: {
        Row: {
          approval_mode: Database["public"]["Enums"]["ai_approval_mode"]
          created_at: string
          created_by: string | null
          enabled: boolean
          feature_key: string
          id: string
          metadata: Json
          organization_id: string | null
          program_id: string | null
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          approval_mode?: Database["public"]["Enums"]["ai_approval_mode"]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature_key: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          approval_mode?: Database["public"]["Enums"]["ai_approval_mode"]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_policies_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_output_reviews: {
        Row: {
          ai_request_id: string
          feedback: string | null
          id: string
          review_status: Database["public"]["Enums"]["ai_review_status"]
          reviewed_at: string
          reviewer_user_id: string
        }
        Insert: {
          ai_request_id: string
          feedback?: string | null
          id?: string
          review_status: Database["public"]["Enums"]["ai_review_status"]
          reviewed_at?: string
          reviewer_user_id: string
        }
        Update: {
          ai_request_id?: string
          feedback?: string | null
          id?: string
          review_status?: Database["public"]["Enums"]["ai_review_status"]
          reviewed_at?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_output_reviews_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "ai_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_output_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_versions: {
        Row: {
          created_at: string
          created_by: string | null
          feature_key: string
          id: string
          metadata: Json
          prompt_template: string
          version_label: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          feature_key: string
          id?: string
          metadata?: Json
          prompt_template: string
          version_label: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          feature_key?: string
          id?: string
          metadata?: Json
          prompt_template?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_policies: {
        Row: {
          allowed_models: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          metadata: Json
          organization_id: string | null
          program_id: string | null
          provider_key: string
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at: string
          usage_limits: Json
          workspace_id: string | null
        }
        Insert: {
          allowed_models?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          provider_key: string
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          usage_limits?: Json
          workspace_id?: string | null
        }
        Update: {
          allowed_models?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          provider_key?: string
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          usage_limits?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_policies_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_requests: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          organization_id: string | null
          output_hash: string | null
          output_payload: Json | null
          program_id: string | null
          prompt_version_id: string | null
          request_payload: Json
          requested_by: string
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          status: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          organization_id?: string | null
          output_hash?: string | null
          output_payload?: Json | null
          program_id?: string | null
          prompt_version_id?: string | null
          request_payload?: Json
          requested_by: string
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          status?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          organization_id?: string | null
          output_hash?: string | null
          output_payload?: Json | null
          program_id?: string | null
          prompt_version_id?: string | null
          request_payload?: Json
          requested_by?: string
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          ai_request_id: string | null
          cache_hit: boolean
          created_at: string
          credit_units: number | null
          estimated_cost: number | null
          feature_key: string
          id: string
          model_name: string | null
          organization_id: string | null
          program_id: string | null
          provider_name: string | null
          token_count: number | null
          workspace_id: string | null
        }
        Insert: {
          ai_request_id?: string | null
          cache_hit?: boolean
          created_at?: string
          credit_units?: number | null
          estimated_cost?: number | null
          feature_key: string
          id?: string
          model_name?: string | null
          organization_id?: string | null
          program_id?: string | null
          provider_name?: string | null
          token_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          ai_request_id?: string | null
          cache_hit?: boolean
          created_at?: string
          credit_units?: number | null
          estimated_cost?: number | null
          feature_key?: string
          id?: string
          model_name?: string | null
          organization_id?: string | null
          program_id?: string | null
          provider_name?: string | null
          token_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "ai_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          actor_user_id: string | null
          event_name: string
          event_payload: Json
          id: string
          occurred_at: string
          organization_id: string | null
          program_id: string | null
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          event_name: string
          event_payload?: Json
          id?: string
          occurred_at?: string
          organization_id?: string | null
          program_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          event_name?: string
          event_payload?: Json
          id?: string
          occurred_at?: string
          organization_id?: string | null
          program_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_request_items: {
        Row: {
          approval_request_id: string
          created_at: string
          description: string | null
          id: string
          item_key: string
          item_type: string
          payload: Json
          status: Database["public"]["Enums"]["approval_status"]
          title: string
        }
        Insert: {
          approval_request_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_key: string
          item_type: string
          payload?: Json
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
        }
        Update: {
          approval_request_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_key?: string
          item_type?: string
          payload?: Json
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_items_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          brief_id: string | null
          decision_notes: string | null
          expires_at: string | null
          id: string
          organization_id: string | null
          plan_id: string | null
          program_id: string | null
          request_payload: Json
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          status: Database["public"]["Enums"]["approval_status"]
          summary: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          brief_id?: string | null
          decision_notes?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          plan_id?: string | null
          program_id?: string | null
          request_payload?: Json
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          status?: Database["public"]["Enums"]["approval_status"]
          summary?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          brief_id?: string | null
          decision_notes?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          plan_id?: string | null
          program_id?: string | null
          request_payload?: Json
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          status?: Database["public"]["Enums"]["approval_status"]
          summary?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          organization_id: string | null
          program_id: string | null
          scope: Database["public"]["Enums"]["audit_scope"]
          target_id: string | null
          target_table: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          scope: Database["public"]["Enums"]["audit_scope"]
          target_id?: string | null
          target_table?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          scope?: Database["public"]["Enums"]["audit_scope"]
          target_id?: string | null
          target_table?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_escalations: {
        Row: {
          acknowledged_at: string | null
          automation_failure_id: string | null
          automation_run_id: string
          created_at: string
          escalation_payload: Json
          escalation_type: string
          id: string
          resolved_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["automation_escalation_status"]
          target_role: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          automation_failure_id?: string | null
          automation_run_id: string
          created_at?: string
          escalation_payload?: Json
          escalation_type: string
          id?: string
          resolved_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["automation_escalation_status"]
          target_role?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          automation_failure_id?: string | null
          automation_run_id?: string
          created_at?: string
          escalation_payload?: Json
          escalation_type?: string
          id?: string
          resolved_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["automation_escalation_status"]
          target_role?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_escalations_automation_failure_id_fkey"
            columns: ["automation_failure_id"]
            isOneToOne: false
            referencedRelation: "automation_failures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_escalations_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_escalations_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_failures: {
        Row: {
          automation_run_id: string
          automation_run_step_id: string | null
          created_at: string
          failure_reason: string | null
          failure_type: string
          id: string
          last_retry_at: string | null
          resolved_at: string | null
          retry_count: number
          status: Database["public"]["Enums"]["automation_failure_status"]
          updated_at: string
        }
        Insert: {
          automation_run_id: string
          automation_run_step_id?: string | null
          created_at?: string
          failure_reason?: string | null
          failure_type: string
          id?: string
          last_retry_at?: string | null
          resolved_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["automation_failure_status"]
          updated_at?: string
        }
        Update: {
          automation_run_id?: string
          automation_run_step_id?: string | null
          created_at?: string
          failure_reason?: string | null
          failure_type?: string
          id?: string
          last_retry_at?: string | null
          resolved_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["automation_failure_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_failures_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_failures_automation_run_step_id_fkey"
            columns: ["automation_run_step_id"]
            isOneToOne: false
            referencedRelation: "automation_run_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rule_versions: {
        Row: {
          action_payload: Json
          approval_payload: Json
          automation_rule_id: string
          change_summary: string | null
          condition_payload: Json
          created_at: string
          created_by: string | null
          id: string
          retry_policy: Json
          trigger_payload: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger_type"]
          version_number: number
        }
        Insert: {
          action_payload?: Json
          approval_payload?: Json
          automation_rule_id: string
          change_summary?: string | null
          condition_payload?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          retry_policy?: Json
          trigger_payload?: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger_type"]
          version_number: number
        }
        Update: {
          action_payload?: Json
          approval_payload?: Json
          automation_rule_id?: string
          change_summary?: string | null
          condition_payload?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          retry_policy?: Json
          trigger_payload?: Json
          trigger_type?: Database["public"]["Enums"]["automation_trigger_type"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_rule_versions_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rule_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          active_version_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string | null
          program_id: string | null
          rule_key: string
          safety_mode: Database["public"]["Enums"]["automation_safety_mode"]
          scope_type: Database["public"]["Enums"]["automation_scope_type"]
          status: Database["public"]["Enums"]["automation_rule_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string | null
          program_id?: string | null
          rule_key: string
          safety_mode?: Database["public"]["Enums"]["automation_safety_mode"]
          scope_type: Database["public"]["Enums"]["automation_scope_type"]
          status?: Database["public"]["Enums"]["automation_rule_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          program_id?: string | null
          rule_key?: string
          safety_mode?: Database["public"]["Enums"]["automation_safety_mode"]
          scope_type?: Database["public"]["Enums"]["automation_scope_type"]
          status?: Database["public"]["Enums"]["automation_rule_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "automation_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_run_steps: {
        Row: {
          action_type:
            | Database["public"]["Enums"]["automation_action_type"]
            | null
          automation_run_id: string
          completed_at: string | null
          created_at: string
          error_summary: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["automation_step_status"]
          step_order: number
          step_payload: Json
          step_type: string
          target_id: string | null
          target_type: string | null
          updated_at: string
        }
        Insert: {
          action_type?:
            | Database["public"]["Enums"]["automation_action_type"]
            | null
          automation_run_id: string
          completed_at?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_step_status"]
          step_order: number
          step_payload?: Json
          step_type: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          action_type?:
            | Database["public"]["Enums"]["automation_action_type"]
            | null
          automation_run_id?: string
          completed_at?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_step_status"]
          step_order?: number
          step_payload?: Json
          step_type?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_run_steps_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_rule_id: string
          automation_rule_version_id: string
          completed_at: string | null
          created_at: string
          id: string
          result_summary: Json
          scope_snapshot: Json
          started_at: string | null
          status: Database["public"]["Enums"]["automation_run_status"]
          trigger_snapshot: Json
          triggered_at: string
          updated_at: string
        }
        Insert: {
          automation_rule_id: string
          automation_rule_version_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          result_summary?: Json
          scope_snapshot?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_run_status"]
          trigger_snapshot?: Json
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          automation_rule_id?: string
          automation_rule_version_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          result_summary?: Json
          scope_snapshot?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_run_status"]
          trigger_snapshot?: Json
          triggered_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_automation_rule_version_id_fkey"
            columns: ["automation_rule_version_id"]
            isOneToOne: false
            referencedRelation: "automation_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_recipients: {
        Row: {
          certificate_id: string
          created_at: string
          id: string
          recipient_email: string | null
          recipient_name: string
          sponsor_id: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          certificate_id: string
          created_at?: string
          id?: string
          recipient_email?: string | null
          recipient_name: string
          sponsor_id?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          certificate_id?: string
          created_at?: string
          id?: string
          recipient_email?: string | null
          recipient_name?: string
          sponsor_id?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_recipients_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_recipients_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_recipients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at: string
          created_by: string
          id: string
          name: string
          program_id: string
          template_payload: Json
          updated_at: string
        }
        Insert: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at?: string
          created_by: string
          id?: string
          name: string
          program_id: string
          template_payload?: Json
          updated_at?: string
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          program_id?: string
          template_payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_template_id: string | null
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          file_path: string | null
          id: string
          issued_at: string
          issued_by: string
          program_id: string
          title: string
          verification_code: string | null
        }
        Insert: {
          certificate_template_id?: string | null
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          file_path?: string | null
          id?: string
          issued_at?: string
          issued_by: string
          program_id: string
          title: string
          verification_code?: string | null
        }
        Update: {
          certificate_template_id?: string | null
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          file_path?: string | null
          id?: string
          issued_at?: string
          issued_by?: string
          program_id?: string
          title?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience_summary: string | null
          campaign_name: string
          campaign_type: string
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_template_id: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          program_id: string | null
          scheduled_for: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          segment_snapshot: Json
          status: Database["public"]["Enums"]["communication_campaign_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience_summary?: string | null
          campaign_name: string
          campaign_type: string
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_template_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          scheduled_for?: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          segment_snapshot?: Json
          status?: Database["public"]["Enums"]["communication_campaign_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience_summary?: string | null
          campaign_name?: string
          campaign_type?: string
          channel?: Database["public"]["Enums"]["communication_channel"]
          communication_template_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          scheduled_for?: string | null
          scope_type?: Database["public"]["Enums"]["communication_scope_type"]
          segment_snapshot?: Json
          status?: Database["public"]["Enums"]["communication_campaign_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_campaigns_communication_template_id_fkey"
            columns: ["communication_template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_deliveries: {
        Row: {
          channel: Database["public"]["Enums"]["communication_channel"]
          clicked_at: string | null
          communication_message_id: string
          communication_recipient_id: string
          created_at: string
          delivered_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          opened_at: string | null
          provider_message_id: string | null
          provider_payload: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_delivery_status"]
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["communication_channel"]
          clicked_at?: string | null
          communication_message_id: string
          communication_recipient_id: string
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          provider_payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_delivery_status"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["communication_channel"]
          clicked_at?: string | null
          communication_message_id?: string
          communication_recipient_id?: string
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          provider_payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_deliveries_communication_message_id_fkey"
            columns: ["communication_message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_deliveries_communication_recipient_id_fkey"
            columns: ["communication_recipient_id"]
            isOneToOne: false
            referencedRelation: "communication_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_events: {
        Row: {
          actor_user_id: string | null
          communication_campaign_id: string | null
          communication_delivery_id: string | null
          communication_message_id: string | null
          created_at: string
          event_payload: Json
          event_type: Database["public"]["Enums"]["communication_event_type"]
          id: string
          organization_id: string | null
          program_id: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          communication_campaign_id?: string | null
          communication_delivery_id?: string | null
          communication_message_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type: Database["public"]["Enums"]["communication_event_type"]
          id?: string
          organization_id?: string | null
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          communication_campaign_id?: string | null
          communication_delivery_id?: string | null
          communication_message_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: Database["public"]["Enums"]["communication_event_type"]
          id?: string
          organization_id?: string | null
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["communication_scope_type"]
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_communication_campaign_id_fkey"
            columns: ["communication_campaign_id"]
            isOneToOne: false
            referencedRelation: "communication_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_communication_delivery_id_fkey"
            columns: ["communication_delivery_id"]
            isOneToOne: false
            referencedRelation: "communication_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_communication_message_id_fkey"
            columns: ["communication_message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_campaign_id: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          program_id: string | null
          rendered_payload: Json
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          status: Database["public"]["Enums"]["communication_message_status"]
          subject: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          rendered_payload?: Json
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          status?: Database["public"]["Enums"]["communication_message_status"]
          subject?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["communication_channel"]
          communication_campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          rendered_payload?: Json
          scope_type?: Database["public"]["Enums"]["communication_scope_type"]
          status?: Database["public"]["Enums"]["communication_message_status"]
          subject?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_communication_campaign_id_fkey"
            columns: ["communication_campaign_id"]
            isOneToOne: false
            referencedRelation: "communication_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_recipients: {
        Row: {
          communication_message_id: string
          created_at: string
          display_name: string | null
          email_address: string | null
          id: string
          recipient_metadata: Json
          recipient_type: Database["public"]["Enums"]["communication_recipient_type"]
          segment_key: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          communication_message_id: string
          created_at?: string
          display_name?: string | null
          email_address?: string | null
          id?: string
          recipient_metadata?: Json
          recipient_type: Database["public"]["Enums"]["communication_recipient_type"]
          segment_key?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          communication_message_id?: string
          created_at?: string
          display_name?: string | null
          email_address?: string | null
          id?: string
          recipient_metadata?: Json
          recipient_type?: Database["public"]["Enums"]["communication_recipient_type"]
          segment_key?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_recipients_communication_message_id_fkey"
            columns: ["communication_message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_recipients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_segments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_resolved_at: string | null
          name: string
          organization_id: string | null
          program_id: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          segment_definition: Json
          status: Database["public"]["Enums"]["communication_segment_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_resolved_at?: string | null
          name: string
          organization_id?: string | null
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          segment_definition?: Json
          status?: Database["public"]["Enums"]["communication_segment_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_resolved_at?: string | null
          name?: string
          organization_id?: string | null
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["communication_scope_type"]
          segment_definition?: Json
          status?: Database["public"]["Enums"]["communication_segment_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_segments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body_template: string
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          organization_id: string | null
          program_id: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          subject_template: string | null
          template_key: string
          template_type: Database["public"]["Enums"]["communication_template_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          body_template: string
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          organization_id?: string | null
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          subject_template?: string | null
          template_key: string
          template_type: Database["public"]["Enums"]["communication_template_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          body_template?: string
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string | null
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["communication_scope_type"]
          subject_template?: string | null
          template_key?: string
          template_type?: Database["public"]["Enums"]["communication_template_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          decision_notes: string | null
          export_type: string
          id: string
          organization_id: string | null
          program_id: string | null
          request_payload: Json
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          status: Database["public"]["Enums"]["export_request_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          decision_notes?: string | null
          export_type: string
          id?: string
          organization_id?: string | null
          program_id?: string | null
          request_payload?: Json
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          status?: Database["public"]["Enums"]["export_request_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          decision_notes?: string | null
          export_type?: string
          id?: string
          organization_id?: string | null
          program_id?: string | null
          request_payload?: Json
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          status?: Database["public"]["Enums"]["export_request_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_rounds: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          is_blind_review: boolean
          name: string
          program_id: string
          round_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          is_blind_review?: boolean
          name: string
          program_id: string
          round_order: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          is_blind_review?: boolean
          name?: string
          program_id?: string
          round_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_rounds_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_run_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          display_order: number
          error_payload: Json | null
          execution_run_id: string
          id: string
          input_payload: Json
          output_payload: Json
          started_at: string | null
          status: Database["public"]["Enums"]["execution_status"]
          step_key: string
          step_type: string
          target_id: string | null
          target_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          display_order: number
          error_payload?: Json | null
          execution_run_id: string
          id?: string
          input_payload?: Json
          output_payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          step_key: string
          step_type: string
          target_id?: string | null
          target_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          display_order?: number
          error_payload?: Json | null
          execution_run_id?: string
          id?: string
          input_payload?: Json
          output_payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          step_key?: string
          step_type?: string
          target_id?: string | null
          target_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_run_steps_execution_run_id_fkey"
            columns: ["execution_run_id"]
            isOneToOne: false
            referencedRelation: "execution_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_runs: {
        Row: {
          approval_request_id: string | null
          brief_id: string | null
          completed_at: string | null
          created_at: string
          error_payload: Json | null
          execution_kind: string
          id: string
          input_payload: Json
          organization_id: string | null
          output_payload: Json
          plan_id: string | null
          program_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["execution_status"]
          summary: string | null
          triggered_by: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approval_request_id?: string | null
          brief_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_payload?: Json | null
          execution_kind: string
          id?: string
          input_payload?: Json
          organization_id?: string | null
          output_payload?: Json
          plan_id?: string | null
          program_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          summary?: string | null
          triggered_by: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approval_request_id?: string | null
          brief_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_payload?: Json | null
          execution_kind?: string
          id?: string
          input_payload?: Json
          organization_id?: string | null
          output_payload?: Json
          plan_id?: string | null
          program_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          summary?: string | null
          triggered_by?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_runs_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_runs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_runs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_runs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_choices: {
        Row: {
          choice_key: string
          created_at: string
          display_order: number
          form_field_id: string
          id: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          choice_key: string
          created_at?: string
          display_order: number
          form_field_id: string
          id?: string
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          choice_key?: string
          created_at?: string
          display_order?: number
          form_field_id?: string
          id?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_choices_form_field_id_fkey"
            columns: ["form_field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_conditions: {
        Row: {
          comparison_value: Json
          created_at: string
          depends_on_field_key: string
          form_field_id: string
          id: string
          operator: string
          updated_at: string
        }
        Insert: {
          comparison_value: Json
          created_at?: string
          depends_on_field_key: string
          form_field_id: string
          id?: string
          operator: string
          updated_at?: string
        }
        Update: {
          comparison_value?: Json
          created_at?: string
          depends_on_field_key?: string
          form_field_id?: string
          id?: string
          operator?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_conditions_form_field_id_fkey"
            columns: ["form_field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          display_order: number
          field_config: Json
          field_key: string
          field_type: Database["public"]["Enums"]["form_field_type"]
          form_version_id: string
          help_text: string | null
          id: string
          is_enabled: boolean
          is_required: boolean
          label: string
          placeholder: string | null
          updated_at: string
          validation_rules: Json
        }
        Insert: {
          created_at?: string
          display_order: number
          field_config?: Json
          field_key: string
          field_type: Database["public"]["Enums"]["form_field_type"]
          form_version_id: string
          help_text?: string | null
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          label: string
          placeholder?: string | null
          updated_at?: string
          validation_rules?: Json
        }
        Update: {
          created_at?: string
          display_order?: number
          field_config?: Json
          field_key?: string
          field_type?: Database["public"]["Enums"]["form_field_type"]
          form_version_id?: string
          help_text?: string | null
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          label?: string
          placeholder?: string | null
          updated_at?: string
          validation_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_versions: {
        Row: {
          created_at: string
          created_by: string
          form_id: string
          id: string
          schema_snapshot: Json
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          form_id: string
          id?: string
          schema_snapshot?: Json
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          form_id?: string
          id?: string
          schema_snapshot?: Json
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          active_version_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["form_kind"]
          name: string
          program_id: string
          status: Database["public"]["Enums"]["form_status"]
          updated_at: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["form_kind"]
          name: string
          program_id: string
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          name?: string
          program_id?: string
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          approved_by: string | null
          content: Json
          created_at: string
          generated_by: string
          id: string
          program_id: string
          published_at: string | null
          report_template_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          summary: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["report_visibility"]
        }
        Insert: {
          approved_by?: string | null
          content?: Json
          created_at?: string
          generated_by: string
          id?: string
          program_id: string
          published_at?: string | null
          report_template_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          summary?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["report_visibility"]
        }
        Update: {
          approved_by?: string | null
          content?: Json
          created_at?: string
          generated_by?: string
          id?: string
          program_id?: string
          published_at?: string | null
          report_template_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["report_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_report_template_id_fkey"
            columns: ["report_template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_policies: {
        Row: {
          active_version_id: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string | null
          policy_type: Database["public"]["Enums"]["governance_policy_type"]
          program_id: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          status: Database["public"]["Enums"]["governance_record_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          organization_id?: string | null
          policy_type: Database["public"]["Enums"]["governance_policy_type"]
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          status?: Database["public"]["Enums"]["governance_record_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string | null
          policy_type?: Database["public"]["Enums"]["governance_policy_type"]
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          status?: Database["public"]["Enums"]["governance_record_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_policies_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "governance_policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_policies_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_policy_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          governance_policy_id: string
          id: string
          policy_payload: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          governance_policy_id: string
          id?: string
          policy_payload?: Json
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          governance_policy_id?: string
          id?: string
          policy_payload?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "governance_policy_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_policy_versions_governance_policy_id_fkey"
            columns: ["governance_policy_id"]
            isOneToOne: false
            referencedRelation: "governance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_apply_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          error_summary: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          import_run_id: string
          payload: Json
          status: Database["public"]["Enums"]["import_apply_status"]
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error_summary?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          import_run_id: string
          payload?: Json
          status?: Database["public"]["Enums"]["import_apply_status"]
          target_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error_summary?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          import_run_id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["import_apply_status"]
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_apply_actions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_apply_actions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_apply_actions_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_confidence_scores: {
        Row: {
          confidence_level: Database["public"]["Enums"]["import_confidence_level"]
          confidence_score: number | null
          created_at: string
          id: string
          import_run_id: string
          subject_key: string
          subject_type: string
        }
        Insert: {
          confidence_level: Database["public"]["Enums"]["import_confidence_level"]
          confidence_score?: number | null
          created_at?: string
          id?: string
          import_run_id: string
          subject_key: string
          subject_type: string
        }
        Update: {
          confidence_level?: Database["public"]["Enums"]["import_confidence_level"]
          confidence_score?: number | null
          created_at?: string
          id?: string
          import_run_id?: string
          subject_key?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_confidence_scores_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_extractions: {
        Row: {
          confidence_level:
            | Database["public"]["Enums"]["import_confidence_level"]
            | null
          confidence_score: number | null
          created_at: string
          extracted_text: string | null
          extraction_type: Database["public"]["Enums"]["import_extraction_type"]
          id: string
          import_run_id: string
          label: string | null
          source_locator: string | null
          structured_value: Json
        }
        Insert: {
          confidence_level?:
            | Database["public"]["Enums"]["import_confidence_level"]
            | null
          confidence_score?: number | null
          created_at?: string
          extracted_text?: string | null
          extraction_type: Database["public"]["Enums"]["import_extraction_type"]
          id?: string
          import_run_id: string
          label?: string | null
          source_locator?: string | null
          structured_value?: Json
        }
        Update: {
          confidence_level?:
            | Database["public"]["Enums"]["import_confidence_level"]
            | null
          confidence_score?: number | null
          created_at?: string
          extracted_text?: string | null
          extraction_type?: Database["public"]["Enums"]["import_extraction_type"]
          id?: string
          import_run_id?: string
          label?: string | null
          source_locator?: string | null
          structured_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_extractions_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_mappings: {
        Row: {
          created_at: string
          id: string
          import_extraction_id: string | null
          import_run_id: string
          mapping_payload: Json
          mapping_target_key: string
          mapping_target_type: string
          reasoning_summary: string | null
          status: Database["public"]["Enums"]["import_mapping_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_extraction_id?: string | null
          import_run_id: string
          mapping_payload?: Json
          mapping_target_key: string
          mapping_target_type: string
          reasoning_summary?: string | null
          status?: Database["public"]["Enums"]["import_mapping_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          import_extraction_id?: string | null
          import_run_id?: string
          mapping_payload?: Json
          mapping_target_key?: string
          mapping_target_type?: string
          reasoning_summary?: string | null
          status?: Database["public"]["Enums"]["import_mapping_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_mappings_import_extraction_id_fkey"
            columns: ["import_extraction_id"]
            isOneToOne: false
            referencedRelation: "import_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_mappings_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_review_items: {
        Row: {
          created_at: string
          id: string
          import_mapping_id: string | null
          import_run_id: string
          item_type: string
          prompt: string
          resolution_payload: Json
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["import_review_item_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_mapping_id?: string | null
          import_run_id: string
          item_type: string
          prompt: string
          resolution_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["import_review_item_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          import_mapping_id?: string | null
          import_run_id?: string
          item_type?: string
          prompt?: string
          resolution_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["import_review_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_review_items_import_mapping_id_fkey"
            columns: ["import_mapping_id"]
            isOneToOne: false
            referencedRelation: "import_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_review_items_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_review_items_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          created_at: string
          error_summary: string | null
          goal_type: Database["public"]["Enums"]["import_goal_type"]
          id: string
          imported_source_id: string
          program_brief_id: string | null
          program_id: string | null
          program_template_id: string | null
          requested_by: string | null
          reviewed_by: string | null
          run_metadata: Json
          source_version_id: string
          status: Database["public"]["Enums"]["import_run_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          created_at?: string
          error_summary?: string | null
          goal_type: Database["public"]["Enums"]["import_goal_type"]
          id?: string
          imported_source_id: string
          program_brief_id?: string | null
          program_id?: string | null
          program_template_id?: string | null
          requested_by?: string | null
          reviewed_by?: string | null
          run_metadata?: Json
          source_version_id: string
          status?: Database["public"]["Enums"]["import_run_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          created_at?: string
          error_summary?: string | null
          goal_type?: Database["public"]["Enums"]["import_goal_type"]
          id?: string
          imported_source_id?: string
          program_brief_id?: string | null
          program_id?: string | null
          program_template_id?: string | null
          requested_by?: string | null
          reviewed_by?: string | null
          run_metadata?: Json
          source_version_id?: string
          status?: Database["public"]["Enums"]["import_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_imported_source_id_fkey"
            columns: ["imported_source_id"]
            isOneToOne: false
            referencedRelation: "imported_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_program_brief_id_fkey"
            columns: ["program_brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_source_version_id_fkey"
            columns: ["source_version_id"]
            isOneToOne: false
            referencedRelation: "imported_source_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_trace_links: {
        Row: {
          created_at: string
          id: string
          import_extraction_id: string | null
          import_mapping_id: string | null
          imported_source_id: string
          source_version_id: string
          target_field: string | null
          target_id: string | null
          target_type: string
          trace_metadata: Json
        }
        Insert: {
          created_at?: string
          id?: string
          import_extraction_id?: string | null
          import_mapping_id?: string | null
          imported_source_id: string
          source_version_id: string
          target_field?: string | null
          target_id?: string | null
          target_type: string
          trace_metadata?: Json
        }
        Update: {
          created_at?: string
          id?: string
          import_extraction_id?: string | null
          import_mapping_id?: string | null
          imported_source_id?: string
          source_version_id?: string
          target_field?: string | null
          target_id?: string | null
          target_type?: string
          trace_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_trace_links_import_extraction_id_fkey"
            columns: ["import_extraction_id"]
            isOneToOne: false
            referencedRelation: "import_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_trace_links_import_mapping_id_fkey"
            columns: ["import_mapping_id"]
            isOneToOne: false
            referencedRelation: "import_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_trace_links_imported_source_id_fkey"
            columns: ["imported_source_id"]
            isOneToOne: false
            referencedRelation: "imported_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_trace_links_source_version_id_fkey"
            columns: ["source_version_id"]
            isOneToOne: false
            referencedRelation: "imported_source_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_source_versions: {
        Row: {
          created_at: string
          created_by: string | null
          file_metadata: Json
          id: string
          imported_source_id: string
          raw_text: string | null
          structured_payload: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_metadata?: Json
          id?: string
          imported_source_id: string
          raw_text?: string | null
          structured_payload?: Json
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_metadata?: Json
          id?: string
          imported_source_id?: string
          raw_text?: string | null
          structured_payload?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "imported_source_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_source_versions_imported_source_id_fkey"
            columns: ["imported_source_id"]
            isOneToOne: false
            referencedRelation: "imported_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_sources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          original_filename: string | null
          owner_user_id: string | null
          program_id: string | null
          scope_type: Database["public"]["Enums"]["import_scope_type"]
          source_type: Database["public"]["Enums"]["import_source_type"]
          source_url: string | null
          storage_path: string | null
          title: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          original_filename?: string | null
          owner_user_id?: string | null
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["import_scope_type"]
          source_type: Database["public"]["Enums"]["import_source_type"]
          source_url?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          original_filename?: string | null
          owner_user_id?: string | null
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["import_scope_type"]
          source_type?: Database["public"]["Enums"]["import_source_type"]
          source_url?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_sources_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_sources_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configurations: {
        Row: {
          config_status: Database["public"]["Enums"]["integration_config_status"]
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          integration_key: string
          metadata: Json
          organization_id: string | null
          program_id: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          config_status?: Database["public"]["Enums"]["integration_config_status"]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          integration_key: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          config_status?: Database["public"]["Enums"]["integration_config_status"]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          integration_key?: string
          metadata?: Json
          organization_id?: string | null
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configurations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_configurations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_configurations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          executed_by: string | null
          execution_summary: string | null
          id: string
          intervention_request_id: string
          result_payload: Json
          started_at: string | null
          status: Database["public"]["Enums"]["intervention_execution_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          executed_by?: string | null
          execution_summary?: string | null
          id?: string
          intervention_request_id: string
          result_payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["intervention_execution_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          executed_by?: string | null
          execution_summary?: string | null
          id?: string
          intervention_request_id?: string
          result_payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["intervention_execution_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_executions_intervention_request_id_fkey"
            columns: ["intervention_request_id"]
            isOneToOne: false
            referencedRelation: "intervention_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          intervention_type: string
          operational_recommendation_id: string | null
          program_id: string
          reason: string | null
          request_payload: Json
          requested_by: string | null
          status: Database["public"]["Enums"]["intervention_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          intervention_type: string
          operational_recommendation_id?: string | null
          program_id: string
          reason?: string | null
          request_payload?: Json
          requested_by?: string | null
          status?: Database["public"]["Enums"]["intervention_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          intervention_type?: string
          operational_recommendation_id?: string | null
          program_id?: string
          reason?: string | null
          request_payload?: Json
          requested_by?: string | null
          status?: Database["public"]["Enums"]["intervention_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_requests_operational_recommendation_id_fkey"
            columns: ["operational_recommendation_id"]
            isOneToOne: false
            referencedRelation: "operational_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assignment_mode: Database["public"]["Enums"]["assignment_mode"]
          completed_at: string | null
          due_at: string | null
          id: string
          judge_user_id: string
          notes: string | null
          program_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          submission_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assignment_mode?: Database["public"]["Enums"]["assignment_mode"]
          completed_at?: string | null
          due_at?: string | null
          id?: string
          judge_user_id: string
          notes?: string | null
          program_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          submission_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assignment_mode?: Database["public"]["Enums"]["assignment_mode"]
          completed_at?: string | null
          due_at?: string | null
          id?: string
          judge_user_id?: string
          notes?: string | null
          program_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_judge_user_id_fkey"
            columns: ["judge_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_conflicts: {
        Row: {
          created_at: string
          id: string
          judge_user_id: string
          program_id: string
          reason: string
          reported_by: string
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          judge_user_id: string
          program_id: string
          reason: string
          reported_by: string
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          judge_user_id?: string
          program_id?: string
          reason?: string
          reported_by?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_conflicts_judge_user_id_fkey"
            columns: ["judge_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_conflicts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_conflicts_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_conflicts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_calibration_exercises: {
        Row: {
          consensus_total_score: number | null
          created_at: string
          created_by: string
          demo_url: string | null
          id: string
          instructions: string | null
          is_active: boolean
          manager_note: string | null
          pitch_deck_url: string | null
          problem_summary: string | null
          program_id: string
          reference_code: string | null
          scorecard_id: string
          scoring_anchors: Json
          solution_summary: string | null
          team_summary: string | null
          title: string
          updated_at: string
          validation_summary: string | null
        }
        Insert: {
          consensus_total_score?: number | null
          created_at?: string
          created_by: string
          demo_url?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          manager_note?: string | null
          pitch_deck_url?: string | null
          problem_summary?: string | null
          program_id: string
          reference_code?: string | null
          scorecard_id: string
          scoring_anchors?: Json
          solution_summary?: string | null
          team_summary?: string | null
          title: string
          updated_at?: string
          validation_summary?: string | null
        }
        Update: {
          consensus_total_score?: number | null
          created_at?: string
          created_by?: string
          demo_url?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          manager_note?: string | null
          pitch_deck_url?: string | null
          problem_summary?: string | null
          program_id?: string
          reference_code?: string | null
          scorecard_id?: string
          scoring_anchors?: Json
          solution_summary?: string | null
          team_summary?: string | null
          title?: string
          updated_at?: string
          validation_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_calibration_exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_calibration_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_calibration_exercises_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_calibration_scores: {
        Row: {
          calibration_submission_id: string
          created_at: string
          id: string
          numeric_score: number | null
          scorecard_criterion_id: string
          updated_at: string
        }
        Insert: {
          calibration_submission_id: string
          created_at?: string
          id?: string
          numeric_score?: number | null
          scorecard_criterion_id: string
          updated_at?: string
        }
        Update: {
          calibration_submission_id?: string
          created_at?: string
          id?: string
          numeric_score?: number | null
          scorecard_criterion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_calibration_scores_calibration_submission_id_fkey"
            columns: ["calibration_submission_id"]
            isOneToOne: false
            referencedRelation: "judge_calibration_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_calibration_scores_scorecard_criterion_id_fkey"
            columns: ["scorecard_criterion_id"]
            isOneToOne: false
            referencedRelation: "scorecard_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_calibration_submissions: {
        Row: {
          calibration_exercise_id: string
          created_at: string
          id: string
          judge_user_id: string
          notes: string | null
          program_id: string
          status: Database["public"]["Enums"]["score_entry_status"]
          submitted_at: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          calibration_exercise_id: string
          created_at?: string
          id?: string
          judge_user_id: string
          notes?: string | null
          program_id: string
          status?: Database["public"]["Enums"]["score_entry_status"]
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          calibration_exercise_id?: string
          created_at?: string
          id?: string
          judge_user_id?: string
          notes?: string | null
          program_id?: string
          status?: Database["public"]["Enums"]["score_entry_status"]
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_calibration_submissions_calibration_exercise_id_fkey"
            columns: ["calibration_exercise_id"]
            isOneToOne: false
            referencedRelation: "judge_calibration_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_calibration_submissions_judge_user_id_fkey"
            columns: ["judge_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_calibration_submissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_progress: {
        Row: {
          assignments_completed: number
          assignments_total: number
          created_at: string
          id: string
          judge_user_id: string
          last_activity_at: string | null
          program_id: string
          updated_at: string
        }
        Insert: {
          assignments_completed?: number
          assignments_total?: number
          created_at?: string
          id?: string
          judge_user_id: string
          last_activity_at?: string | null
          program_id: string
          updated_at?: string
        }
        Update: {
          assignments_completed?: number
          assignments_total?: number
          created_at?: string
          id?: string
          judge_user_id?: string
          last_activity_at?: string | null
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_progress_judge_user_id_fkey"
            columns: ["judge_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_sections: {
        Row: {
          content: Json
          created_at: string
          display_order: number
          id: string
          is_enabled: boolean
          landing_page_version_id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          display_order: number
          id?: string
          is_enabled?: boolean
          landing_page_version_id: string
          section_key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          landing_page_version_id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_sections_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          id: string
          landing_page_id: string
          status: Database["public"]["Enums"]["landing_page_status"]
          updated_at: string
          version_number: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          id?: string
          landing_page_id: string
          status?: Database["public"]["Enums"]["landing_page_status"]
          updated_at?: string
          version_number: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          landing_page_id?: string
          status?: Database["public"]["Enums"]["landing_page_status"]
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          brand_config: Json
          created_at: string
          created_by: string
          id: string
          program_id: string
          published_at: string | null
          published_by: string | null
          published_slug: string | null
          published_version_id: string | null
          seo_description: string | null
          seo_title: string | null
          social_image_path: string | null
          theme_key: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          brand_config?: Json
          created_at?: string
          created_by: string
          id?: string
          program_id: string
          published_at?: string | null
          published_by?: string | null
          published_slug?: string | null
          published_version_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          social_image_path?: string | null
          theme_key?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          brand_config?: Json
          created_at?: string
          created_by?: string
          id?: string
          program_id?: string
          published_at?: string | null
          published_by?: string | null
          published_slug?: string | null
          published_version_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          social_image_path?: string | null
          theme_key?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_published_version_fk"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability_rules: {
        Row: {
          active: boolean
          availability_window: Json
          blackout_rules: Json
          buffer_minutes: number
          created_at: string
          id: string
          max_bookings_per_day: number | null
          max_bookings_per_week: number | null
          mentor_program_membership_id: string
          recurrence_rule: Json
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          slot_duration_minutes: number
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          availability_window?: Json
          blackout_rules?: Json
          buffer_minutes?: number
          created_at?: string
          id?: string
          max_bookings_per_day?: number | null
          max_bookings_per_week?: number | null
          mentor_program_membership_id: string
          recurrence_rule?: Json
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          slot_duration_minutes: number
          timezone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          availability_window?: Json
          blackout_rules?: Json
          buffer_minutes?: number
          created_at?: string
          id?: string
          max_bookings_per_day?: number | null
          max_bookings_per_week?: number | null
          mentor_program_membership_id?: string
          recurrence_rule?: Json
          session_type?: Database["public"]["Enums"]["mentor_session_type"]
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_rules_mentor_program_membership_id_fkey"
            columns: ["mentor_program_membership_id"]
            isOneToOne: false
            referencedRelation: "mentor_program_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability_slots: {
        Row: {
          capacity: number
          created_at: string
          ends_at: string
          id: string
          is_available: boolean
          mentor_availability_rule_id: string | null
          mentor_program_membership_id: string
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          starts_at: string
          timezone: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          ends_at: string
          id?: string
          is_available?: boolean
          mentor_availability_rule_id?: string | null
          mentor_program_membership_id: string
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          starts_at: string
          timezone: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          ends_at?: string
          id?: string
          is_available?: boolean
          mentor_availability_rule_id?: string | null
          mentor_program_membership_id?: string
          session_type?: Database["public"]["Enums"]["mentor_session_type"]
          starts_at?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_slots_mentor_availability_rule_id_fkey"
            columns: ["mentor_availability_rule_id"]
            isOneToOne: false
            referencedRelation: "mentor_availability_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_availability_slots_mentor_program_membership_id_fkey"
            columns: ["mentor_program_membership_id"]
            isOneToOne: false
            referencedRelation: "mentor_program_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_booking_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          mentor_availability_slot_id: string | null
          mentor_program_membership_id: string
          program_id: string
          request_metadata: Json
          requested_ends_at: string
          requested_starts_at: string
          requester_user_id: string
          session_goals: string | null
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          status: Database["public"]["Enums"]["mentor_booking_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          mentor_availability_slot_id?: string | null
          mentor_program_membership_id: string
          program_id: string
          request_metadata?: Json
          requested_ends_at: string
          requested_starts_at: string
          requester_user_id: string
          session_goals?: string | null
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          status?: Database["public"]["Enums"]["mentor_booking_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          mentor_availability_slot_id?: string | null
          mentor_program_membership_id?: string
          program_id?: string
          request_metadata?: Json
          requested_ends_at?: string
          requested_starts_at?: string
          requester_user_id?: string
          session_goals?: string | null
          session_type?: Database["public"]["Enums"]["mentor_session_type"]
          status?: Database["public"]["Enums"]["mentor_booking_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_booking_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_booking_requests_mentor_availability_slot_id_fkey"
            columns: ["mentor_availability_slot_id"]
            isOneToOne: false
            referencedRelation: "mentor_availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_booking_requests_mentor_program_membership_id_fkey"
            columns: ["mentor_program_membership_id"]
            isOneToOne: false
            referencedRelation: "mentor_program_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_booking_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_booking_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_booking_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_expertise_tags: {
        Row: {
          created_at: string
          id: string
          mentor_profile_id: string
          tag_type: string
          tag_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_profile_id: string
          tag_type: string
          tag_value: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_profile_id?: string
          tag_type?: string
          tag_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_expertise_tags_mentor_profile_id_fkey"
            columns: ["mentor_profile_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_feedback: {
        Row: {
          author_user_id: string
          created_at: string
          feedback_text: string | null
          id: string
          mentor_session_id: string
          rating: number | null
          status: Database["public"]["Enums"]["mentor_feedback_status"]
          subject_type: string
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          mentor_session_id: string
          rating?: number | null
          status?: Database["public"]["Enums"]["mentor_feedback_status"]
          subject_type: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          mentor_session_id?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["mentor_feedback_status"]
          subject_type?: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_feedback_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_feedback_mentor_session_id_fkey"
            columns: ["mentor_session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_feedback_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_match_recommendations: {
        Row: {
          created_at: string
          id: string
          mentor_match_run_id: string
          mentor_program_membership_id: string
          participant_user_id: string | null
          reasoning_summary: string | null
          recommendation_metadata: Json
          score: number | null
          status: Database["public"]["Enums"]["mentor_match_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_match_run_id: string
          mentor_program_membership_id: string
          participant_user_id?: string | null
          reasoning_summary?: string | null
          recommendation_metadata?: Json
          score?: number | null
          status?: Database["public"]["Enums"]["mentor_match_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_match_run_id?: string
          mentor_program_membership_id?: string
          participant_user_id?: string | null
          reasoning_summary?: string | null
          recommendation_metadata?: Json
          score?: number | null
          status?: Database["public"]["Enums"]["mentor_match_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_match_recommendations_mentor_match_run_id_fkey"
            columns: ["mentor_match_run_id"]
            isOneToOne: false
            referencedRelation: "mentor_match_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_match_recommendations_mentor_program_membership_id_fkey"
            columns: ["mentor_program_membership_id"]
            isOneToOne: false
            referencedRelation: "mentor_program_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_match_recommendations_participant_user_id_fkey"
            columns: ["participant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_match_recommendations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_match_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          input_snapshot: Json
          program_id: string
          result_summary: Json
          run_scope: string
          status: Database["public"]["Enums"]["mentor_match_run_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          input_snapshot?: Json
          program_id: string
          result_summary?: Json
          run_scope: string
          status?: Database["public"]["Enums"]["mentor_match_run_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          input_snapshot?: Json
          program_id?: string
          result_summary?: Json
          run_scope?: string
          status?: Database["public"]["Enums"]["mentor_match_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_match_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_match_runs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          availability_preferences: Json
          bio: string | null
          created_at: string
          display_name: string
          id: string
          languages: Json
          max_mentoring_load: number | null
          metadata: Json
          organization_name: string | null
          regions: Json
          session_format_preferences: Json
          stage_preferences: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_preferences?: Json
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          languages?: Json
          max_mentoring_load?: number | null
          metadata?: Json
          organization_name?: string | null
          regions?: Json
          session_format_preferences?: Json
          stage_preferences?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_preferences?: Json
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          languages?: Json
          max_mentoring_load?: number | null
          metadata?: Json
          organization_name?: string | null
          regions?: Json
          session_format_preferences?: Json
          stage_preferences?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_program_memberships: {
        Row: {
          auto_confirm_allowed: boolean
          booking_policy: Json
          created_at: string
          created_by: string | null
          id: string
          max_sessions: number | null
          mentor_profile_id: string
          metadata: Json
          program_id: string
          status: Database["public"]["Enums"]["mentor_membership_status"]
          updated_at: string
          visibility_policy: Json
        }
        Insert: {
          auto_confirm_allowed?: boolean
          booking_policy?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          max_sessions?: number | null
          mentor_profile_id: string
          metadata?: Json
          program_id: string
          status?: Database["public"]["Enums"]["mentor_membership_status"]
          updated_at?: string
          visibility_policy?: Json
        }
        Update: {
          auto_confirm_allowed?: boolean
          booking_policy?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          max_sessions?: number | null
          mentor_profile_id?: string
          metadata?: Json
          program_id?: string
          status?: Database["public"]["Enums"]["mentor_membership_status"]
          updated_at?: string
          visibility_policy?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mentor_program_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_program_memberships_mentor_profile_id_fkey"
            columns: ["mentor_profile_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_program_memberships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_session_notes: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          id: string
          mentor_session_id: string
          note_type: string
          structured_summary: Json
          updated_at: string
          visibility: Database["public"]["Enums"]["mentor_note_visibility"]
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          id?: string
          mentor_session_id: string
          note_type: string
          structured_summary?: Json
          updated_at?: string
          visibility?: Database["public"]["Enums"]["mentor_note_visibility"]
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          id?: string
          mentor_session_id?: string
          note_type?: string
          structured_summary?: Json
          updated_at?: string
          visibility?: Database["public"]["Enums"]["mentor_note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "mentor_session_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_notes_mentor_session_id_fkey"
            columns: ["mentor_session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_session_participants: {
        Row: {
          created_at: string
          id: string
          mentor_session_id: string
          role_in_session: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_session_id: string
          role_in_session?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentor_session_id?: string
          role_in_session?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_session_participants_mentor_session_id_fkey"
            columns: ["mentor_session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          mentor_booking_request_id: string | null
          mentor_program_membership_id: string
          program_id: string
          session_context: Json
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          starts_at: string
          status: Database["public"]["Enums"]["mentor_booking_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          mentor_booking_request_id?: string | null
          mentor_program_membership_id: string
          program_id: string
          session_context?: Json
          session_type: Database["public"]["Enums"]["mentor_session_type"]
          starts_at: string
          status?: Database["public"]["Enums"]["mentor_booking_status"]
          timezone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          mentor_booking_request_id?: string | null
          mentor_program_membership_id?: string
          program_id?: string
          session_context?: Json
          session_type?: Database["public"]["Enums"]["mentor_session_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["mentor_booking_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_mentor_booking_request_id_fkey"
            columns: ["mentor_booking_request_id"]
            isOneToOne: false
            referencedRelation: "mentor_booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_mentor_program_membership_id_fkey"
            columns: ["mentor_program_membership_id"]
            isOneToOne: false
            referencedRelation: "mentor_program_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_statuses: {
        Row: {
          actual_completed_at: string | null
          created_at: string
          ends_at: string | null
          id: string
          milestone_key: string
          milestone_metadata: Json
          milestone_type: string
          program_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["program_health_status"]
          updated_at: string
        }
        Insert: {
          actual_completed_at?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          milestone_key: string
          milestone_metadata?: Json
          milestone_type: string
          program_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["program_health_status"]
          updated_at?: string
        }
        Update: {
          actual_completed_at?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          milestone_key?: string
          milestone_metadata?: Json
          milestone_type?: string
          program_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["program_health_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_statuses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_inbox_items: {
        Row: {
          action_required: boolean
          body: string
          created_at: string
          deep_link: string | null
          expires_at: string | null
          id: string
          organization_id: string | null
          program_id: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["notification_item_status"]
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action_required?: boolean
          body: string
          created_at?: string
          deep_link?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["communication_scope_type"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["notification_item_status"]
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action_required?: boolean
          body?: string
          created_at?: string
          deep_link?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["communication_scope_type"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["notification_item_status"]
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_inbox_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_inbox_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_inbox_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_inbox_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_activity_events: {
        Row: {
          activity_payload: Json
          activity_type: Database["public"]["Enums"]["operational_activity_type"]
          actor_user_id: string | null
          created_at: string
          id: string
          program_id: string
          source_id: string | null
          source_type: string | null
          summary: string | null
          title: string
        }
        Insert: {
          activity_payload?: Json
          activity_type: Database["public"]["Enums"]["operational_activity_type"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          program_id: string
          source_id?: string | null
          source_type?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          activity_payload?: Json
          activity_type?: Database["public"]["Enums"]["operational_activity_type"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          program_id?: string
          source_id?: string | null
          source_type?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_activity_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_activity_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_health_rules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          health_dimension: Database["public"]["Enums"]["program_health_dimension"]
          id: string
          organization_id: string | null
          program_id: string | null
          rule_key: string
          rule_payload: Json
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          health_dimension: Database["public"]["Enums"]["program_health_dimension"]
          id?: string
          organization_id?: string | null
          program_id?: string | null
          rule_key: string
          rule_payload?: Json
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          health_dimension?: Database["public"]["Enums"]["program_health_dimension"]
          id?: string
          organization_id?: string | null
          program_id?: string | null
          rule_key?: string
          rule_payload?: Json
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_health_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_health_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_health_rules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_health_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_recommendations: {
        Row: {
          approval_required: boolean
          created_at: string
          expected_benefit: string | null
          id: string
          program_id: string
          reasoning: string | null
          recommendation_metadata: Json
          recommendation_type: string
          risk_level: Database["public"]["Enums"]["ai_risk_level"]
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["operational_recommendation_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          created_at?: string
          expected_benefit?: string | null
          id?: string
          program_id: string
          reasoning?: string | null
          recommendation_metadata?: Json
          recommendation_type: string
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["operational_recommendation_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          created_at?: string
          expected_benefit?: string | null
          id?: string
          program_id?: string
          reasoning?: string | null
          recommendation_metadata?: Json
          recommendation_type?: string
          risk_level?: Database["public"]["Enums"]["ai_risk_level"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["operational_recommendation_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_recommendations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_enabled: boolean
          billing_email: string | null
          created_at: string
          created_by: string
          id: string
          logo_path: string | null
          name: string
          primary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          billing_email?: string | null
          created_at?: string
          created_by: string
          id?: string
          logo_path?: string | null
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          billing_email?: string | null
          created_at?: string
          created_by?: string
          id?: string
          logo_path?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          id: string
          ip_hash: string | null
          program_id: string | null
          published_page_id: string | null
          referrer: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          program_id?: string | null
          published_page_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string | null
          program_id?: string | null
          published_page_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_published_page_id_fkey"
            columns: ["published_page_id"]
            isOneToOne: false
            referencedRelation: "published_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_profiles: {
        Row: {
          bio: string | null
          created_at: string
          github_url: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          organization_name: string | null
          portfolio_url: string | null
          profile_data: Json
          role_title: string | null
          skills: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          organization_name?: string | null
          portfolio_url?: string | null
          profile_data?: Json
          role_title?: string | null
          skills?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          organization_name?: string | null
          portfolio_url?: string | null
          profile_data?: Json
          role_title?: string | null
          skills?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["participant_status"]
          previous_status:
            | Database["public"]["Enums"]["participant_status"]
            | null
          program_registration_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["participant_status"]
          previous_status?:
            | Database["public"]["Enums"]["participant_status"]
            | null
          program_registration_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["participant_status"]
          previous_status?:
            | Database["public"]["Enums"]["participant_status"]
            | null
          program_registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_status_history_program_registration_id_fkey"
            columns: ["program_registration_id"]
            isOneToOne: false
            referencedRelation: "program_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          action_type: string
          assigned_to: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: string | null
          program_id: string
          resolved_at: string | null
          resolved_by: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["pending_action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string | null
          program_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["pending_action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string | null
          program_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["pending_action_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_platform_super_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_platform_super_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_super_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      program_alert_resolutions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          program_alert_id: string
          resolution_type: string
          resolved_at: string
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          program_alert_id: string
          resolution_type: string
          resolved_at?: string
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          program_alert_id?: string
          resolution_type?: string
          resolved_at?: string
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_alert_resolutions_program_alert_id_fkey"
            columns: ["program_alert_id"]
            isOneToOne: false
            referencedRelation: "program_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_alert_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_alerts: {
        Row: {
          alert_metadata: Json
          alert_type: string
          created_at: string
          description: string | null
          health_dimension:
            | Database["public"]["Enums"]["program_health_dimension"]
            | null
          id: string
          program_id: string
          recommended_action: string | null
          severity: Database["public"]["Enums"]["program_alert_severity"]
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["program_alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          alert_metadata?: Json
          alert_type: string
          created_at?: string
          description?: string | null
          health_dimension?:
            | Database["public"]["Enums"]["program_health_dimension"]
            | null
          id?: string
          program_id: string
          recommended_action?: string | null
          severity?: Database["public"]["Enums"]["program_alert_severity"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["program_alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          alert_metadata?: Json
          alert_type?: string
          created_at?: string
          description?: string | null
          health_dimension?:
            | Database["public"]["Enums"]["program_health_dimension"]
            | null
          id?: string
          program_id?: string
          recommended_action?: string | null
          severity?: Database["public"]["Enums"]["program_alert_severity"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["program_alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_alerts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_brief_versions: {
        Row: {
          assumptions: Json
          brief_id: string
          confidence_level: string
          created_at: string
          created_by: string | null
          id: string
          open_questions: Json
          source: Database["public"]["Enums"]["brief_source"]
          structured_brief: Json
          version_number: number
        }
        Insert: {
          assumptions?: Json
          brief_id: string
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          open_questions?: Json
          source?: Database["public"]["Enums"]["brief_source"]
          structured_brief?: Json
          version_number: number
        }
        Update: {
          assumptions?: Json
          brief_id?: string
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          open_questions?: Json
          source?: Database["public"]["Enums"]["brief_source"]
          structured_brief?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_brief_versions_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_brief_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_briefs: {
        Row: {
          active_plan_id: string | null
          active_version_id: string | null
          assumptions: Json
          confidence_level: string
          created_at: string
          created_by: string
          current_brief: Json
          detected_program_type: string | null
          id: string
          open_questions: Json
          organization_id: string | null
          program_id: string | null
          source: Database["public"]["Enums"]["brief_source"]
          status: Database["public"]["Enums"]["brief_status"]
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_plan_id?: string | null
          active_version_id?: string | null
          assumptions?: Json
          confidence_level?: string
          created_at?: string
          created_by: string
          current_brief?: Json
          detected_program_type?: string | null
          id?: string
          open_questions?: Json
          organization_id?: string | null
          program_id?: string | null
          source?: Database["public"]["Enums"]["brief_source"]
          status?: Database["public"]["Enums"]["brief_status"]
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_plan_id?: string | null
          active_version_id?: string | null
          assumptions?: Json
          confidence_level?: string
          created_at?: string
          created_by?: string
          current_brief?: Json
          detected_program_type?: string | null
          id?: string
          open_questions?: Json
          organization_id?: string | null
          program_id?: string | null
          source?: Database["public"]["Enums"]["brief_source"]
          status?: Database["public"]["Enums"]["brief_status"]
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_briefs_active_plan_fk"
            columns: ["active_plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_briefs_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "program_brief_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_briefs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_briefs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_briefs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      program_health_snapshots: {
        Row: {
          created_at: string
          health_dimension: Database["public"]["Enums"]["program_health_dimension"]
          id: string
          program_id: string
          recorded_at: string
          score: number | null
          signal_payload: Json
          status: Database["public"]["Enums"]["program_health_status"]
          summary: string | null
        }
        Insert: {
          created_at?: string
          health_dimension: Database["public"]["Enums"]["program_health_dimension"]
          id?: string
          program_id: string
          recorded_at?: string
          score?: number | null
          signal_payload?: Json
          status: Database["public"]["Enums"]["program_health_status"]
          summary?: string | null
        }
        Update: {
          created_at?: string
          health_dimension?: Database["public"]["Enums"]["program_health_dimension"]
          id?: string
          program_id?: string
          recorded_at?: string
          score?: number | null
          signal_payload?: Json
          status?: Database["public"]["Enums"]["program_health_status"]
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_health_snapshots_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          program_id: string
          role: Database["public"]["Enums"]["program_membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          program_id: string
          role: Database["public"]["Enums"]["program_membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          program_id?: string
          role?: Database["public"]["Enums"]["program_membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_memberships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_plan_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          item_key: string
          item_type: string
          payload: Json
          plan_id: string
          requires_approval: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          item_key: string
          item_type: string
          payload?: Json
          plan_id: string
          requires_approval?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          item_key?: string
          item_type?: string
          payload?: Json
          plan_id?: string
          requires_approval?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      program_plans: {
        Row: {
          approval_requirements: Json
          assumptions: Json
          brief_id: string
          brief_version_id: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          plan_payload: Json
          program_id: string | null
          status: Database["public"]["Enums"]["plan_status"]
          summary: string | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approval_requirements?: Json
          assumptions?: Json
          brief_id: string
          brief_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          plan_payload?: Json
          program_id?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          summary?: string | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approval_requirements?: Json
          assumptions?: Json
          brief_id?: string
          brief_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          plan_payload?: Json
          program_id?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          summary?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_plans_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "program_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plans_brief_version_id_fkey"
            columns: ["brief_version_id"]
            isOneToOne: false
            referencedRelation: "program_brief_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      program_registrations: {
        Row: {
          accepted_terms_at: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          invited_by: string | null
          participant_profile_id: string | null
          program_id: string
          registration_data: Json
          registration_mode: Database["public"]["Enums"]["registration_mode"]
          status: Database["public"]["Enums"]["participant_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          participant_profile_id?: string | null
          program_id: string
          registration_data?: Json
          registration_mode?: Database["public"]["Enums"]["registration_mode"]
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          participant_profile_id?: string | null
          program_id?: string
          registration_data?: Json
          registration_mode?: Database["public"]["Enums"]["registration_mode"]
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_registrations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_registrations_participant_profile_id_fkey"
            columns: ["participant_profile_id"]
            isOneToOne: false
            referencedRelation: "participant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_template_versions: {
        Row: {
          brief_defaults: Json
          change_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          launch_readiness_defaults: Json
          metadata: Json
          program_template_id: string
          timeline_defaults: Json
          version_number: number
        }
        Insert: {
          brief_defaults?: Json
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          launch_readiness_defaults?: Json
          metadata?: Json
          program_template_id: string
          timeline_defaults?: Json
          version_number: number
        }
        Update: {
          brief_defaults?: Json
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          launch_readiness_defaults?: Json
          metadata?: Json
          program_template_id?: string
          timeline_defaults?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_template_versions_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_templates: {
        Row: {
          active_version_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_official_default: boolean
          name: string
          organization_id: string | null
          program_type: string | null
          scope_type: Database["public"]["Enums"]["template_scope_type"]
          slug: string
          status: Database["public"]["Enums"]["template_status"]
          template_kind: Database["public"]["Enums"]["template_kind"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_official_default?: boolean
          name: string
          organization_id?: string | null
          program_type?: string | null
          scope_type: Database["public"]["Enums"]["template_scope_type"]
          slug: string
          status?: Database["public"]["Enums"]["template_status"]
          template_kind?: Database["public"]["Enums"]["template_kind"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_official_default?: boolean
          name?: string
          organization_id?: string | null
          program_type?: string | null
          scope_type?: Database["public"]["Enums"]["template_scope_type"]
          slug?: string
          status?: Database["public"]["Enums"]["template_status"]
          template_kind?: Database["public"]["Enums"]["template_kind"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_templates_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "program_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          long_description: string | null
          name: string
          program_type: string
          published_at: string | null
          published_by: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          short_description: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["program_status"]
          submission_closes_at: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_scope"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          long_description?: string | null
          name: string
          program_type: string
          published_at?: string | null
          published_by?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          short_description?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          submission_closes_at?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_scope"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          long_description?: string | null
          name?: string
          program_type?: string
          published_at?: string | null
          published_by?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          short_description?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          submission_closes_at?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_scope"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      published_pages: {
        Row: {
          id: string
          is_active: boolean
          landing_page_id: string
          landing_page_version_id: string
          program_id: string
          published_at: string
          published_by: string
          slug: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          landing_page_id: string
          landing_page_version_id: string
          program_id: string
          published_at?: string
          published_by: string
          slug: string
        }
        Update: {
          id?: string
          is_active?: boolean
          landing_page_id?: string
          landing_page_version_id?: string
          program_id?: string
          published_at?: string
          published_by?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_pages_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_pages_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_pages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_pages_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_answers: {
        Row: {
          answer: Json
          created_at: string
          form_field_key: string
          id: string
          program_registration_id: string
          updated_at: string
        }
        Insert: {
          answer: Json
          created_at?: string
          form_field_key: string
          id?: string
          program_registration_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          form_field_key?: string
          id?: string
          program_registration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_answers_program_registration_id_fkey"
            columns: ["program_registration_id"]
            isOneToOne: false
            referencedRelation: "program_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          program_id: string
          template_key: string
          template_schema: Json
          updated_at: string
          visibility: Database["public"]["Enums"]["report_visibility"]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          program_id: string
          template_key: string
          template_schema?: Json
          updated_at?: string
          visibility?: Database["public"]["Enums"]["report_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          program_id?: string
          template_key?: string
          template_schema?: Json
          updated_at?: string
          visibility?: Database["public"]["Enums"]["report_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          policy_payload: Json
          program_id: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          status: Database["public"]["Enums"]["governance_record_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          policy_payload?: Json
          program_id?: string | null
          scope_type: Database["public"]["Enums"]["governance_scope_type"]
          status?: Database["public"]["Enums"]["governance_record_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          policy_payload?: Json
          program_id?: string | null
          scope_type?: Database["public"]["Enums"]["governance_scope_type"]
          status?: Database["public"]["Enums"]["governance_record_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retention_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_policies_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      score_comments: {
        Row: {
          comment_text: string
          created_at: string
          created_by: string
          id: string
          score_submission_id: string
          scorecard_criterion_id: string | null
          updated_at: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          created_by: string
          id?: string
          score_submission_id: string
          scorecard_criterion_id?: string | null
          updated_at?: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          created_by?: string
          id?: string
          score_submission_id?: string
          scorecard_criterion_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_comments_score_submission_id_fkey"
            columns: ["score_submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_comments_scorecard_criterion_id_fkey"
            columns: ["scorecard_criterion_id"]
            isOneToOne: false
            referencedRelation: "scorecard_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      score_submissions: {
        Row: {
          created_at: string
          evaluation_round_id: string | null
          id: string
          judge_assignment_id: string
          judge_user_id: string
          program_id: string
          scorecard_id: string
          status: Database["public"]["Enums"]["score_entry_status"]
          submission_id: string
          submitted_at: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluation_round_id?: string | null
          id?: string
          judge_assignment_id: string
          judge_user_id: string
          program_id: string
          scorecard_id: string
          status?: Database["public"]["Enums"]["score_entry_status"]
          submission_id: string
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluation_round_id?: string | null
          id?: string
          judge_assignment_id?: string
          judge_user_id?: string
          program_id?: string
          scorecard_id?: string
          status?: Database["public"]["Enums"]["score_entry_status"]
          submission_id?: string
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_submissions_evaluation_round_id_fkey"
            columns: ["evaluation_round_id"]
            isOneToOne: false
            referencedRelation: "evaluation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submissions_judge_assignment_id_fkey"
            columns: ["judge_assignment_id"]
            isOneToOne: true
            referencedRelation: "judge_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submissions_judge_user_id_fkey"
            columns: ["judge_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submissions_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submissions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_criteria: {
        Row: {
          created_at: string
          criterion_key: string
          description: string | null
          display_order: number
          id: string
          judge_guidance: string | null
          label: string
          requires_comment: boolean
          scale_config: Json
          scale_type: Database["public"]["Enums"]["score_scale_type"]
          scorecard_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          criterion_key: string
          description?: string | null
          display_order: number
          id?: string
          judge_guidance?: string | null
          label: string
          requires_comment?: boolean
          scale_config?: Json
          scale_type?: Database["public"]["Enums"]["score_scale_type"]
          scorecard_id: string
          updated_at?: string
          weight: number
        }
        Update: {
          created_at?: string
          criterion_key?: string
          description?: string | null
          display_order?: number
          id?: string
          judge_guidance?: string | null
          label?: string
          requires_comment?: boolean
          scale_config?: Json
          scale_type?: Database["public"]["Enums"]["score_scale_type"]
          scorecard_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_criteria_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          evaluation_round_id: string | null
          id: string
          is_active: boolean
          name: string
          program_id: string
          total_weight: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          evaluation_round_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          program_id: string
          total_weight?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          evaluation_round_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          program_id?: string
          total_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_evaluation_round_id_fkey"
            columns: ["evaluation_round_id"]
            isOneToOne: false
            referencedRelation: "evaluation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          boolean_score: boolean | null
          choice_value: string | null
          created_at: string
          id: string
          numeric_score: number | null
          score_submission_id: string
          scorecard_criterion_id: string
          updated_at: string
        }
        Insert: {
          boolean_score?: boolean | null
          choice_value?: string | null
          created_at?: string
          id?: string
          numeric_score?: number | null
          score_submission_id: string
          scorecard_criterion_id: string
          updated_at?: string
        }
        Update: {
          boolean_score?: boolean | null
          choice_value?: string | null
          created_at?: string
          id?: string
          numeric_score?: number | null
          score_submission_id?: string
          scorecard_criterion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_score_submission_id_fkey"
            columns: ["score_submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_scorecard_criterion_id_fkey"
            columns: ["scorecard_criterion_id"]
            isOneToOne: false
            referencedRelation: "scorecard_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_reports: {
        Row: {
          created_at: string
          created_by: string
          generated_report_id: string | null
          id: string
          program_id: string
          report_payload: Json
          sponsor_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          generated_report_id?: string | null
          id?: string
          program_id: string
          report_payload?: Json
          sponsor_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          generated_report_id?: string | null
          id?: string
          program_id?: string
          report_payload?: Json
          sponsor_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_reports_generated_report_fk"
            columns: ["generated_report_id"]
            isOneToOne: false
            referencedRelation: "generated_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_reports_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          created_at: string
          created_by: string
          id: string
          logo_path: string | null
          name: string
          profile: Json
          program_id: string
          sponsor_user_id: string | null
          tier: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          logo_path?: string | null
          name: string
          profile?: Json
          program_id: string
          sponsor_user_id?: string | null
          tier?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          logo_path?: string | null
          name?: string
          profile?: Json
          program_id?: string
          sponsor_user_id?: string | null
          tier?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_answers: {
        Row: {
          answer: Json
          created_at: string
          form_field_key: string
          id: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          answer: Json
          created_at?: string
          form_field_key: string
          id?: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          form_field_key?: string
          id?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_files: {
        Row: {
          created_at: string
          file_kind: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          original_name: string
          storage_path: string
          submission_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_kind: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_name: string
          storage_path: string
          submission_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_kind?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string
          storage_path?: string
          submission_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["submission_status"]
          previous_status:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submission_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["submission_status"]
          previous_status?:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submission_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["submission_status"]
          previous_status?:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_status_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          ai_usage_disclosure: string | null
          created_at: string
          created_by: string
          demo_url: string | null
          github_url: string | null
          id: string
          problem_statement: string | null
          program_id: string
          program_registration_id: string | null
          solution_description: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          submitted_by: string | null
          team_id: string | null
          tech_stack: string[]
          title: string
          updated_at: string
        }
        Insert: {
          ai_usage_disclosure?: string | null
          created_at?: string
          created_by: string
          demo_url?: string | null
          github_url?: string | null
          id?: string
          problem_statement?: string | null
          program_id: string
          program_registration_id?: string | null
          solution_description?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          team_id?: string | null
          tech_stack?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          ai_usage_disclosure?: string | null
          created_at?: string
          created_by?: string
          demo_url?: string | null
          github_url?: string | null
          id?: string
          problem_statement?: string | null
          program_id?: string
          program_registration_id?: string | null
          solution_description?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          team_id?: string | null
          tech_stack?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_program_registration_id_fkey"
            columns: ["program_registration_id"]
            isOneToOne: false
            referencedRelation: "program_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          invited_user_id: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_user_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_user_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_lead: boolean
          joined_at: string
          program_registration_id: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_lead?: boolean
          joined_at?: string
          program_registration_id?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_lead?: boolean
          joined_at?: string
          program_registration_id?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_program_registration_id_fkey"
            columns: ["program_registration_id"]
            isOneToOne: false
            referencedRelation: "program_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          program_id: string
          project_idea: string | null
          skills_needed: string[]
          slug: string
          team_bio: string | null
          team_lock_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          program_id: string
          project_idea?: string | null
          skills_needed?: string[]
          slug: string
          team_bio?: string | null
          team_lock_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          program_id?: string
          project_idea?: string | null
          skills_needed?: string[]
          slug?: string
          team_bio?: string | null
          team_lock_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      template_approvals: {
        Row: {
          decision_notes: string | null
          id: string
          program_template_id: string | null
          program_template_version_id: string | null
          requested_at: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["template_approval_status"]
          template_component_id: string | null
          template_component_version_id: string | null
        }
        Insert: {
          decision_notes?: string | null
          id?: string
          program_template_id?: string | null
          program_template_version_id?: string | null
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["template_approval_status"]
          template_component_id?: string | null
          template_component_version_id?: string | null
        }
        Update: {
          decision_notes?: string | null
          id?: string
          program_template_id?: string | null
          program_template_version_id?: string | null
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["template_approval_status"]
          template_component_id?: string | null
          template_component_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_approvals_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approvals_program_template_version_id_fkey"
            columns: ["program_template_version_id"]
            isOneToOne: false
            referencedRelation: "program_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approvals_template_component_id_fkey"
            columns: ["template_component_id"]
            isOneToOne: false
            referencedRelation: "template_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approvals_template_component_version_id_fkey"
            columns: ["template_component_version_id"]
            isOneToOne: false
            referencedRelation: "template_component_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_clones: {
        Row: {
          clone_metadata: Json
          created_at: string
          created_by: string | null
          id: string
          program_template_id: string
          source_program_id: string
        }
        Insert: {
          clone_metadata?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          program_template_id: string
          source_program_id: string
        }
        Update: {
          clone_metadata?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          program_template_id?: string
          source_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_clones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clones_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clones_source_program_id_fkey"
            columns: ["source_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      template_component_versions: {
        Row: {
          change_summary: string | null
          component_payload: Json
          created_at: string
          created_by: string | null
          id: string
          template_component_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          component_payload?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          template_component_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          component_payload?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          template_component_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_component_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_component_versions_template_component_id_fkey"
            columns: ["template_component_id"]
            isOneToOne: false
            referencedRelation: "template_components"
            referencedColumns: ["id"]
          },
        ]
      }
      template_components: {
        Row: {
          active_version_id: string | null
          component_type: Database["public"]["Enums"]["template_component_type"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string | null
          program_template_id: string | null
          scope_type: Database["public"]["Enums"]["template_scope_type"]
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          active_version_id?: string | null
          component_type: Database["public"]["Enums"]["template_component_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string | null
          program_template_id?: string | null
          scope_type: Database["public"]["Enums"]["template_scope_type"]
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          active_version_id?: string | null
          component_type?: Database["public"]["Enums"]["template_component_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          program_template_id?: string | null
          scope_type?: Database["public"]["Enums"]["template_scope_type"]
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_components_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "template_component_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_components_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_components_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_governance_records: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          organization_id: string
          owner_user_id: string | null
          program_template_id: string | null
          review_required: boolean
          template_component_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          organization_id: string
          owner_user_id?: string | null
          program_template_id?: string | null
          review_required?: boolean
          template_component_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string
          owner_user_id?: string | null
          program_template_id?: string | null
          review_required?: boolean
          template_component_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_governance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_governance_records_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_governance_records_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_governance_records_template_component_id_fkey"
            columns: ["template_component_id"]
            isOneToOne: false
            referencedRelation: "template_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_governance_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_libraries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          scope_type: Database["public"]["Enums"]["template_scope_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          scope_type: Database["public"]["Enums"]["template_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          scope_type?: Database["public"]["Enums"]["template_scope_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_libraries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_libraries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_libraries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_library_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          program_template_id: string | null
          template_component_id: string | null
          template_library_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          program_template_id?: string | null
          template_component_id?: string | null
          template_library_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          program_template_id?: string | null
          template_component_id?: string | null
          template_library_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_library_items_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_items_template_component_id_fkey"
            columns: ["template_component_id"]
            isOneToOne: false
            referencedRelation: "template_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_items_template_library_id_fkey"
            columns: ["template_library_id"]
            isOneToOne: false
            referencedRelation: "template_libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_events: {
        Row: {
          actor_user_id: string | null
          apply_mode: Database["public"]["Enums"]["template_apply_mode"] | null
          created_at: string
          event_name: string
          id: string
          metadata: Json
          organization_id: string
          program_id: string | null
          program_template_id: string | null
          template_component_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          apply_mode?: Database["public"]["Enums"]["template_apply_mode"] | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          organization_id: string
          program_id?: string | null
          program_template_id?: string | null
          template_component_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          apply_mode?: Database["public"]["Enums"]["template_apply_mode"] | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          organization_id?: string
          program_id?: string | null
          program_template_id?: string | null
          template_component_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_events_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_events_template_component_id_fkey"
            columns: ["template_component_id"]
            isOneToOne: false
            referencedRelation: "template_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["workspace_membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ai_settings: Json
          branding_config: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          ai_settings?: Json
          branding_config?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          ai_settings?: Json
          branding_config?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_landing_page_draft: {
        Args: { program_id_input: string }
        Returns: {
          landing_page_id: string
          landing_page_version_id: string
          version_number: number
        }[]
      }
      bootstrap_program_creation: {
        Args: {
          ends_at_input?: string
          name_input: string
          program_type_input: string
          registration_closes_at_input?: string
          registration_opens_at_input?: string
          short_description_input?: string
          slug_input: string
          starts_at_input?: string
          submission_closes_at_input?: string
          visibility_input?: Database["public"]["Enums"]["visibility_scope"]
          workspace_id_input: string
        }
        Returns: {
          program_id: string
        }[]
      }
      bootstrap_workspace_onboarding: {
        Args: {
          billing_email_input?: string
          organization_name_input: string
          organization_slug_input: string
          workspace_name_input: string
          workspace_slug_input: string
        }
        Returns: {
          organization_id: string
          workspace_id: string
        }[]
      }
      can_access_submission: {
        Args: { check_submission_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_approve_automation_execution: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["automation_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_approve_communication: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["communication_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_approve_import_apply: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["import_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_approve_intervention: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_judge_submission: {
        Args: { check_submission_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_manage_automation_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["automation_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_manage_communication_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["communication_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_manage_control_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_manage_governance_scope: {
        Args: {
          check_organization_id?: string
          check_policy_type?: Database["public"]["Enums"]["governance_policy_type"]
          check_program_id?: string
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_manage_import_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["import_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_manage_live_ops_program: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_manage_mentoring_program: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_manage_operational_health_rule: {
        Args: {
          check_organization_id: string
          check_program_id: string
          check_scope_type: Database["public"]["Enums"]["governance_scope_type"]
          check_user_id?: string
          check_workspace_id: string
        }
        Returns: boolean
      }
      can_manage_template_scope: {
        Args: {
          check_organization_id?: string
          check_scope_type: Database["public"]["Enums"]["template_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_review_mentor_match: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_review_template: {
        Args: {
          check_organization_id?: string
          check_scope_type: Database["public"]["Enums"]["template_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_set_official_template_default: {
        Args: {
          check_organization_id?: string
          check_scope_type: Database["public"]["Enums"]["template_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_automation_escalation: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type?: Database["public"]["Enums"]["automation_scope_type"]
          check_target_user_id?: string
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_automation_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["automation_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_communication_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["communication_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_control_scope: {
        Args: {
          check_created_by?: string
          check_organization_id?: string
          check_program_id?: string
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_governance_scope: {
        Args: {
          check_organization_id?: string
          check_policy_type?: Database["public"]["Enums"]["governance_policy_type"]
          check_program_id?: string
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_import_scope: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["import_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_live_ops_program: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_view_mentor_session: {
        Args: { check_session_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_view_mentoring_program: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_view_notification_item: {
        Args: {
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["communication_scope_type"]
          check_user_id?: string
          check_user_id_target: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      can_view_program: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_view_template_scope: {
        Args: {
          check_organization_id?: string
          check_scope_type: Database["public"]["Enums"]["template_scope_type"]
          check_user_id?: string
          check_workspace_id?: string
        }
        Returns: boolean
      }
      current_user_id: { Args: never; Returns: string }
      has_organization_role: {
        Args: {
          check_organization_id: string
          check_user_id?: string
          expected_role: Database["public"]["Enums"]["organization_membership_role"]
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          check_user_id?: string
          check_workspace_id: string
          expected_role: Database["public"]["Enums"]["workspace_membership_role"]
        }
        Returns: boolean
      }
      is_ai_governance_admin: {
        Args: { check_organization_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_assigned_judge: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_communications_manager: {
        Args: { check_user_id?: string; check_workspace_id: string }
        Returns: boolean
      }
      is_judge_manager: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_mentor_manager: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_mentor_membership_owner: {
        Args: {
          check_mentor_program_membership_id: string
          check_user_id?: string
        }
        Returns: boolean
      }
      is_organization_admin: {
        Args: { check_organization_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_organization_owner: {
        Args: { check_organization_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_platform_super_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_program_editor: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_program_manager: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_program_participant: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_program_role: {
        Args: {
          check_program_id: string
          check_user_id?: string
          expected_role: Database["public"]["Enums"]["program_membership_role"]
        }
        Returns: boolean
      }
      is_security_compliance_admin: {
        Args: { check_organization_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_sponsor_user: {
        Args: { check_program_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_team_lead: {
        Args: { check_team_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { check_team_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { check_user_id?: string; check_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { check_user_id?: string; check_workspace_id: string }
        Returns: boolean
      }
      is_workspace_operator: {
        Args: { check_user_id?: string; check_workspace_id: string }
        Returns: boolean
      }
      log_automation_run_step: {
        Args: {
          check_action_type?: Database["public"]["Enums"]["automation_action_type"]
          check_automation_run_id: string
          check_error_summary?: string
          check_status?: Database["public"]["Enums"]["automation_step_status"]
          check_step_order: number
          check_step_payload?: Json
          check_step_type: string
          check_target_id?: string
          check_target_type?: string
        }
        Returns: string
      }
      log_communication_event: {
        Args: {
          check_actor_user_id?: string
          check_campaign_id?: string
          check_delivery_id?: string
          check_event_payload?: Json
          check_event_type?: Database["public"]["Enums"]["communication_event_type"]
          check_message_id?: string
          check_organization_id?: string
          check_program_id?: string
          check_scope_type: Database["public"]["Enums"]["communication_scope_type"]
          check_workspace_id?: string
        }
        Returns: string
      }
      log_import_apply_action: {
        Args: {
          check_action_type: string
          check_approved_by?: string
          check_error_summary?: string
          check_executed_by?: string
          check_import_run_id: string
          check_payload?: Json
          check_status?: Database["public"]["Enums"]["import_apply_status"]
          check_target_id?: string
          check_target_type: string
        }
        Returns: string
      }
      log_operational_activity_event: {
        Args: {
          p_activity_payload?: Json
          p_activity_type: Database["public"]["Enums"]["operational_activity_type"]
          p_actor_user_id?: string
          p_program_id: string
          p_source_id?: string
          p_source_type?: string
          p_summary?: string
          p_title: string
        }
        Returns: string
      }
      log_template_usage_event: {
        Args: {
          check_actor_user_id?: string
          check_apply_mode?: Database["public"]["Enums"]["template_apply_mode"]
          check_event_name?: string
          check_metadata?: Json
          check_organization_id?: string
          check_program_id?: string
          check_program_template_id?: string
          check_template_component_id?: string
          check_workspace_id?: string
        }
        Returns: string
      }
      publish_landing_page_version: {
        Args: {
          landing_page_version_id_input: string
          program_id_input: string
          published_slug_input: string
        }
        Returns: {
          published_page_id: string
        }[]
      }
    }
    Enums: {
      access_review_item_state: "pending" | "approved" | "revoked" | "flagged"
      access_review_status: "draft" | "in_progress" | "completed" | "cancelled"
      agent_message_kind:
        | "chat"
        | "brief_update"
        | "plan_summary"
        | "approval_summary"
        | "execution_update"
        | "question"
        | "answer"
        | "tool_trace"
      agent_message_role: "user" | "assistant" | "system" | "tool"
      agent_session_status: "active" | "paused" | "completed" | "archived"
      agent_run_type:
        | "program_bootstrap"
        | "brief_revision"
        | "plan_generation"
        | "launch_kit_generation"
        | "approval_preparation"
        | "execution_readiness_review"
        | "operational_analysis"
        | "live_ops_intervention"
        | "artifact_regeneration"
        | "conversation_followup"
      agent_run_status:
        | "queued"
        | "planning"
        | "running"
        | "waiting_for_input"
        | "waiting_for_approval"
        | "blocked"
        | "completed"
        | "failed"
        | "cancelled"
      agent_task_type:
        | "inspect_context"
        | "retrieve_domain_state"
        | "update_memory"
        | "draft_brief"
        | "draft_plan"
        | "draft_asset"
        | "validate_output"
        | "identify_open_questions"
        | "summarize_risks"
        | "prepare_approval_checkpoint"
        | "prepare_execution_package"
        | "emit_recommendation"
        | "analyze_operational_health"
        | "human_followup"
      agent_task_status:
        | "pending"
        | "running"
        | "waiting_for_input"
        | "waiting_for_approval"
        | "blocked"
        | "completed"
        | "failed"
        | "cancelled"
      agent_tool_risk_level: "low" | "medium" | "high"
      agent_tool_call_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "skipped"
        | "cancelled"
      agent_event_type:
        | "run_started"
        | "run_planned"
        | "run_status_changed"
        | "task_started"
        | "task_completed"
        | "task_failed"
        | "tool_call_started"
        | "tool_call_completed"
        | "tool_call_failed"
        | "artifact_updated"
        | "memory_updated"
        | "needs_input"
        | "needs_approval"
        | "approval_resolved"
        | "execution_started"
        | "execution_completed"
        | "execution_failed"
        | "recommendation_created"
        | "run_completed"
        | "run_failed"
      agent_event_severity: "info" | "warning" | "critical"
      agent_memory_scope:
        | "session"
        | "program"
        | "workspace"
        | "organization"
        | "artifact"
        | "decision"
      agent_memory_confidence: "low" | "medium" | "high"
      agent_memory_source_type:
        | "human_input"
        | "agent_inference"
        | "tool_output"
        | "approved_decision"
        | "derived_summary"
        | "system_sync"
      agent_artifact_type:
        | "brief"
        | "plan"
        | "landing_page"
        | "registration_form"
        | "submission_form"
        | "judging_setup"
        | "communications_pack"
        | "mentor_setup"
        | "sponsor_report"
        | "launch_readiness"
        | "operations_summary"
        | "approval_packet"
        | "execution_package"
      agent_artifact_status:
        | "draft"
        | "ready_for_review"
        | "approved"
        | "rejected"
        | "executed"
        | "superseded"
        | "archived"
      agent_checkpoint_type:
        | "approval_request"
        | "clarification_request"
        | "publish_gate"
        | "execution_gate"
        | "policy_gate"
      agent_checkpoint_status: "open" | "resolved" | "rejected" | "cancelled"
      ai_approval_mode: "always_require" | "policy_based" | "not_required"
      ai_review_status: "pending" | "approved" | "rejected"
      ai_risk_level: "low" | "medium" | "high"
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
      assignment_mode:
        | "manual"
        | "random"
        | "round_robin"
        | "category_based"
        | "track_based"
      assignment_status:
        | "assigned"
        | "accepted"
        | "declined"
        | "completed"
        | "reassigned"
      audit_scope: "platform" | "organization" | "workspace" | "program"
      automation_action_type:
        | "send_communication"
        | "create_notification"
        | "create_alert"
        | "generate_report_draft"
        | "request_approval"
        | "create_follow_up"
        | "propose_intervention"
        | "sync_external"
      automation_escalation_status:
        | "pending"
        | "sent"
        | "acknowledged"
        | "resolved"
        | "cancelled"
      automation_failure_status: "open" | "retrying" | "resolved" | "ignored"
      automation_rule_status: "draft" | "active" | "paused" | "archived"
      automation_run_status:
        | "queued"
        | "running"
        | "awaiting_approval"
        | "completed"
        | "failed"
        | "cancelled"
        | "skipped"
      automation_safety_mode:
        | "suggestion_only"
        | "auto_prepare"
        | "policy_auto_execute"
      automation_scope_type: "organization" | "workspace" | "program"
      automation_step_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
        | "skipped"
      automation_trigger_type:
        | "time_based"
        | "schedule_based"
        | "state_change"
        | "threshold"
        | "approval_completion"
        | "ai_risk_signal"
      brief_source: "chat" | "template" | "imported_doc" | "mixed"
      brief_status:
        | "collecting_requirements"
        | "ready_for_plan"
        | "plan_generated"
        | "ready_for_draft_generation"
        | "drafts_generated"
        | "ready_for_execution"
        | "executing"
        | "live"
        | "archived"
      certificate_type:
        | "participation"
        | "finalist"
        | "winner"
        | "special_award"
        | "judge_appreciation"
        | "mentor_appreciation"
        | "sponsor_recognition"
      communication_campaign_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "scheduled"
        | "sending"
        | "completed"
        | "cancelled"
        | "failed"
      communication_channel: "email" | "in_app" | "internal_feed"
      communication_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "failed"
        | "suppressed"
      communication_event_type:
        | "campaign_created"
        | "approval_requested"
        | "approval_decided"
        | "scheduled"
        | "send_started"
        | "message_created"
        | "delivery_updated"
        | "inbox_created"
        | "failed"
        | "cancelled"
      communication_message_status:
        | "draft"
        | "queued"
        | "sent"
        | "failed"
        | "cancelled"
      communication_recipient_type:
        | "user"
        | "email_address"
        | "team"
        | "segment_snapshot"
      communication_scope_type: "organization" | "workspace" | "program"
      communication_segment_status: "draft" | "active" | "archived"
      communication_template_type:
        | "lifecycle"
        | "announcement"
        | "reminder"
        | "transactional"
        | "operational"
      execution_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
        | "partial"
      export_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      form_field_type:
        | "short_text"
        | "long_text"
        | "email"
        | "phone"
        | "url"
        | "number"
        | "date"
        | "single_choice"
        | "multiple_choice"
        | "dropdown"
        | "file_upload"
        | "image_upload"
        | "video_link"
        | "pitch_deck_upload"
        | "section_header"
        | "page_break"
        | "consent_checkbox"
        | "ai_usage_disclosure"
      form_kind: "registration" | "submission"
      form_status: "draft" | "active" | "archived"
      governance_policy_type:
        | "approval_policy"
        | "ai_policy"
        | "export_policy"
        | "retention_policy"
        | "template_governance_policy"
        | "automation_governance_policy"
        | "communication_governance_policy"
        | "integration_policy"
      governance_record_status: "draft" | "active" | "deprecated" | "archived"
      governance_scope_type: "organization" | "workspace" | "program"
      import_apply_status:
        | "pending"
        | "approved"
        | "executed"
        | "failed"
        | "cancelled"
      import_confidence_level: "low" | "medium" | "high"
      import_extraction_type:
        | "document_structure"
        | "brief_field"
        | "timeline_block"
        | "landing_content"
        | "faq_block"
        | "form_question"
        | "scorecard_criterion"
        | "sponsor_content"
        | "policy_content"
        | "other"
      import_goal_type:
        | "brief_intake"
        | "asset_extraction"
        | "form_extraction"
        | "scorecard_extraction"
        | "template_creation"
        | "general_context"
      import_mapping_status:
        | "suggested"
        | "confirmed"
        | "rejected"
        | "superseded"
      import_review_item_status: "pending" | "resolved" | "skipped"
      import_run_status:
        | "queued"
        | "running"
        | "awaiting_review"
        | "approved"
        | "applied"
        | "failed"
        | "cancelled"
      import_scope_type: "organization" | "workspace" | "program"
      import_source_type:
        | "pdf"
        | "docx"
        | "pptx"
        | "spreadsheet"
        | "csv"
        | "markdown"
        | "plain_text"
        | "url"
        | "program_export"
        | "manual_paste"
      integration_config_status:
        | "not_configured"
        | "configured"
        | "disabled"
        | "error"
      intervention_execution_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      intervention_request_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "executed"
        | "failed"
        | "cancelled"
      landing_page_status: "draft" | "preview" | "published" | "archived"
      membership_status: "invited" | "active" | "suspended" | "revoked"
      mentor_booking_status:
        | "draft"
        | "requested"
        | "pending_approval"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
      mentor_feedback_status: "pending" | "submitted" | "reviewed"
      mentor_match_run_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      mentor_match_status:
        | "suggested"
        | "approved"
        | "rejected"
        | "booked"
        | "expired"
      mentor_membership_status: "invited" | "active" | "paused" | "archived"
      mentor_note_visibility:
        | "private_mentor"
        | "shared_with_pm"
        | "shared_with_participant"
      mentor_session_type:
        | "one_to_one"
        | "team_office_hour"
        | "expert_review"
        | "pitch_coaching"
        | "group_clinic"
        | "panel_session"
      notification_item_status: "unread" | "read" | "archived"
      operational_activity_type:
        | "health_snapshot_recorded"
        | "alert_created"
        | "alert_resolved"
        | "pending_action_created"
        | "milestone_updated"
        | "recommendation_created"
        | "recommendation_actioned"
        | "intervention_requested"
        | "intervention_executed"
        | "communication_outcome"
        | "automation_outcome"
      operational_recommendation_status:
        | "suggested"
        | "approved"
        | "rejected"
        | "executed"
        | "expired"
      organization_membership_role:
        | "organization_owner"
        | "organization_admin"
        | "security_compliance_admin"
        | "ai_governance_admin"
      participant_status:
        | "registered"
        | "profile_incomplete"
        | "waitlisted"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "submitted"
        | "finalist"
        | "winner"
      pending_action_status: "open" | "in_progress" | "completed" | "dismissed"
      plan_status:
        | "draft"
        | "proposed"
        | "approved"
        | "superseded"
        | "rejected"
        | "archived"
      program_alert_severity: "low" | "medium" | "high" | "critical"
      program_alert_status: "open" | "acknowledged" | "resolved" | "ignored"
      program_health_dimension:
        | "registration"
        | "submission"
        | "judging"
        | "mentoring"
        | "communications"
        | "automation"
        | "sponsor_deliverables"
        | "overall"
      program_health_status: "on_track" | "at_risk" | "blocked" | "overdue"
      program_membership_role:
        | "program_manager"
        | "judge"
        | "sponsor"
        | "participant"
        | "team_lead"
        | "program_editor"
        | "mentor_manager"
        | "mentor"
        | "judge_manager"
      program_status:
        | "draft"
        | "configured"
        | "published"
        | "in_review"
        | "completed"
        | "archived"
      registration_mode:
        | "open"
        | "invite_only"
        | "domain_restricted"
        | "approval_based"
        | "waitlist"
      report_status:
        | "draft"
        | "generated"
        | "approved"
        | "published"
        | "archived"
      report_visibility: "internal" | "sponsor"
      score_entry_status: "draft" | "submitted"
      score_scale_type: "numeric" | "boolean" | "choice"
      submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "needs_revision"
        | "shortlisted"
        | "finalist"
        | "winner"
        | "rejected"
        | "withdrawn"
      team_invite_status:
        | "pending"
        | "accepted"
        | "declined"
        | "revoked"
        | "expired"
      template_apply_mode:
        | "full_start"
        | "component_attach"
        | "hybrid_with_brief"
        | "clone_from_program"
      template_approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      template_component_type:
        | "landing_page"
        | "registration_form"
        | "submission_form"
        | "scorecard"
        | "communications_pack"
        | "mentoring_pack"
        | "sponsor_package"
        | "report_pack"
        | "approval_policy"
        | "automation_pack"
        | "ai_policy"
      template_kind: "program" | "component" | "policy"
      template_scope_type: "platform" | "organization" | "workspace"
      template_status:
        | "draft"
        | "internal_review"
        | "approved"
        | "deprecated"
        | "archived"
      visibility_scope: "private" | "workspace" | "organization" | "public"
      workspace_membership_role:
        | "workspace_admin"
        | "workspace_operator"
        | "communications_manager"
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
    Enums: {
      access_review_item_state: ["pending", "approved", "revoked", "flagged"],
      access_review_status: ["draft", "in_progress", "completed", "cancelled"],
      agent_message_kind: [
        "chat",
        "brief_update",
        "plan_summary",
        "approval_summary",
        "execution_update",
        "question",
        "answer",
        "tool_trace",
      ],
      agent_message_role: ["user", "assistant", "system", "tool"],
      agent_session_status: ["active", "paused", "completed", "archived"],
      agent_run_type: [
        "program_bootstrap",
        "brief_revision",
        "plan_generation",
        "launch_kit_generation",
        "approval_preparation",
        "execution_readiness_review",
        "operational_analysis",
        "live_ops_intervention",
        "artifact_regeneration",
        "conversation_followup",
      ],
      agent_run_status: [
        "queued",
        "planning",
        "running",
        "waiting_for_input",
        "waiting_for_approval",
        "blocked",
        "completed",
        "failed",
        "cancelled",
      ],
      agent_task_type: [
        "inspect_context",
        "retrieve_domain_state",
        "update_memory",
        "draft_brief",
        "draft_plan",
        "draft_asset",
        "validate_output",
        "identify_open_questions",
        "summarize_risks",
        "prepare_approval_checkpoint",
        "prepare_execution_package",
        "emit_recommendation",
        "analyze_operational_health",
        "human_followup",
      ],
      agent_task_status: [
        "pending",
        "running",
        "waiting_for_input",
        "waiting_for_approval",
        "blocked",
        "completed",
        "failed",
        "cancelled",
      ],
      agent_tool_risk_level: ["low", "medium", "high"],
      agent_tool_call_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "skipped",
        "cancelled",
      ],
      agent_event_type: [
        "run_started",
        "run_planned",
        "run_status_changed",
        "task_started",
        "task_completed",
        "task_failed",
        "tool_call_started",
        "tool_call_completed",
        "tool_call_failed",
        "artifact_updated",
        "memory_updated",
        "needs_input",
        "needs_approval",
        "approval_resolved",
        "execution_started",
        "execution_completed",
        "execution_failed",
        "recommendation_created",
        "run_completed",
        "run_failed",
      ],
      agent_event_severity: ["info", "warning", "critical"],
      agent_memory_scope: [
        "session",
        "program",
        "workspace",
        "organization",
        "artifact",
        "decision",
      ],
      agent_memory_confidence: ["low", "medium", "high"],
      agent_memory_source_type: [
        "human_input",
        "agent_inference",
        "tool_output",
        "approved_decision",
        "derived_summary",
        "system_sync",
      ],
      agent_artifact_type: [
        "brief",
        "plan",
        "landing_page",
        "registration_form",
        "submission_form",
        "judging_setup",
        "communications_pack",
        "mentor_setup",
        "sponsor_report",
        "launch_readiness",
        "operations_summary",
        "approval_packet",
        "execution_package",
      ],
      agent_artifact_status: [
        "draft",
        "ready_for_review",
        "approved",
        "rejected",
        "executed",
        "superseded",
        "archived",
      ],
      agent_checkpoint_type: [
        "approval_request",
        "clarification_request",
        "publish_gate",
        "execution_gate",
        "policy_gate",
      ],
      agent_checkpoint_status: ["open", "resolved", "rejected", "cancelled"],
      ai_approval_mode: ["always_require", "policy_based", "not_required"],
      ai_review_status: ["pending", "approved", "rejected"],
      ai_risk_level: ["low", "medium", "high"],
      approval_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "expired",
      ],
      assignment_mode: [
        "manual",
        "random",
        "round_robin",
        "category_based",
        "track_based",
      ],
      assignment_status: [
        "assigned",
        "accepted",
        "declined",
        "completed",
        "reassigned",
      ],
      audit_scope: ["platform", "organization", "workspace", "program"],
      automation_action_type: [
        "send_communication",
        "create_notification",
        "create_alert",
        "generate_report_draft",
        "request_approval",
        "create_follow_up",
        "propose_intervention",
        "sync_external",
      ],
      automation_escalation_status: [
        "pending",
        "sent",
        "acknowledged",
        "resolved",
        "cancelled",
      ],
      automation_failure_status: ["open", "retrying", "resolved", "ignored"],
      automation_rule_status: ["draft", "active", "paused", "archived"],
      automation_run_status: [
        "queued",
        "running",
        "awaiting_approval",
        "completed",
        "failed",
        "cancelled",
        "skipped",
      ],
      automation_safety_mode: [
        "suggestion_only",
        "auto_prepare",
        "policy_auto_execute",
      ],
      automation_scope_type: ["organization", "workspace", "program"],
      automation_step_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
        "skipped",
      ],
      automation_trigger_type: [
        "time_based",
        "schedule_based",
        "state_change",
        "threshold",
        "approval_completion",
        "ai_risk_signal",
      ],
      brief_source: ["chat", "template", "imported_doc", "mixed"],
      brief_status: [
        "collecting_requirements",
        "ready_for_plan",
        "plan_generated",
        "ready_for_draft_generation",
        "drafts_generated",
        "ready_for_execution",
        "executing",
        "live",
        "archived",
      ],
      certificate_type: [
        "participation",
        "finalist",
        "winner",
        "special_award",
        "judge_appreciation",
        "mentor_appreciation",
        "sponsor_recognition",
      ],
      communication_campaign_status: [
        "draft",
        "pending_approval",
        "approved",
        "scheduled",
        "sending",
        "completed",
        "cancelled",
        "failed",
      ],
      communication_channel: ["email", "in_app", "internal_feed"],
      communication_delivery_status: [
        "pending",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "failed",
        "suppressed",
      ],
      communication_event_type: [
        "campaign_created",
        "approval_requested",
        "approval_decided",
        "scheduled",
        "send_started",
        "message_created",
        "delivery_updated",
        "inbox_created",
        "failed",
        "cancelled",
      ],
      communication_message_status: [
        "draft",
        "queued",
        "sent",
        "failed",
        "cancelled",
      ],
      communication_recipient_type: [
        "user",
        "email_address",
        "team",
        "segment_snapshot",
      ],
      communication_scope_type: ["organization", "workspace", "program"],
      communication_segment_status: ["draft", "active", "archived"],
      communication_template_type: [
        "lifecycle",
        "announcement",
        "reminder",
        "transactional",
        "operational",
      ],
      execution_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
        "partial",
      ],
      export_request_status: [
        "pending",
        "approved",
        "rejected",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      form_field_type: [
        "short_text",
        "long_text",
        "email",
        "phone",
        "url",
        "number",
        "date",
        "single_choice",
        "multiple_choice",
        "dropdown",
        "file_upload",
        "image_upload",
        "video_link",
        "pitch_deck_upload",
        "section_header",
        "page_break",
        "consent_checkbox",
        "ai_usage_disclosure",
      ],
      form_kind: ["registration", "submission"],
      form_status: ["draft", "active", "archived"],
      governance_policy_type: [
        "approval_policy",
        "ai_policy",
        "export_policy",
        "retention_policy",
        "template_governance_policy",
        "automation_governance_policy",
        "communication_governance_policy",
        "integration_policy",
      ],
      governance_record_status: ["draft", "active", "deprecated", "archived"],
      governance_scope_type: ["organization", "workspace", "program"],
      import_apply_status: [
        "pending",
        "approved",
        "executed",
        "failed",
        "cancelled",
      ],
      import_confidence_level: ["low", "medium", "high"],
      import_extraction_type: [
        "document_structure",
        "brief_field",
        "timeline_block",
        "landing_content",
        "faq_block",
        "form_question",
        "scorecard_criterion",
        "sponsor_content",
        "policy_content",
        "other",
      ],
      import_goal_type: [
        "brief_intake",
        "asset_extraction",
        "form_extraction",
        "scorecard_extraction",
        "template_creation",
        "general_context",
      ],
      import_mapping_status: [
        "suggested",
        "confirmed",
        "rejected",
        "superseded",
      ],
      import_review_item_status: ["pending", "resolved", "skipped"],
      import_run_status: [
        "queued",
        "running",
        "awaiting_review",
        "approved",
        "applied",
        "failed",
        "cancelled",
      ],
      import_scope_type: ["organization", "workspace", "program"],
      import_source_type: [
        "pdf",
        "docx",
        "pptx",
        "spreadsheet",
        "csv",
        "markdown",
        "plain_text",
        "url",
        "program_export",
        "manual_paste",
      ],
      integration_config_status: [
        "not_configured",
        "configured",
        "disabled",
        "error",
      ],
      intervention_execution_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      intervention_request_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "executed",
        "failed",
        "cancelled",
      ],
      landing_page_status: ["draft", "preview", "published", "archived"],
      membership_status: ["invited", "active", "suspended", "revoked"],
      mentor_booking_status: [
        "draft",
        "requested",
        "pending_approval",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      mentor_feedback_status: ["pending", "submitted", "reviewed"],
      mentor_match_run_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      mentor_match_status: [
        "suggested",
        "approved",
        "rejected",
        "booked",
        "expired",
      ],
      mentor_membership_status: ["invited", "active", "paused", "archived"],
      mentor_note_visibility: [
        "private_mentor",
        "shared_with_pm",
        "shared_with_participant",
      ],
      mentor_session_type: [
        "one_to_one",
        "team_office_hour",
        "expert_review",
        "pitch_coaching",
        "group_clinic",
        "panel_session",
      ],
      notification_item_status: ["unread", "read", "archived"],
      operational_activity_type: [
        "health_snapshot_recorded",
        "alert_created",
        "alert_resolved",
        "pending_action_created",
        "milestone_updated",
        "recommendation_created",
        "recommendation_actioned",
        "intervention_requested",
        "intervention_executed",
        "communication_outcome",
        "automation_outcome",
      ],
      operational_recommendation_status: [
        "suggested",
        "approved",
        "rejected",
        "executed",
        "expired",
      ],
      organization_membership_role: [
        "organization_owner",
        "organization_admin",
        "security_compliance_admin",
        "ai_governance_admin",
      ],
      participant_status: [
        "registered",
        "profile_incomplete",
        "waitlisted",
        "approved",
        "rejected",
        "withdrawn",
        "submitted",
        "finalist",
        "winner",
      ],
      pending_action_status: ["open", "in_progress", "completed", "dismissed"],
      plan_status: [
        "draft",
        "proposed",
        "approved",
        "superseded",
        "rejected",
        "archived",
      ],
      program_alert_severity: ["low", "medium", "high", "critical"],
      program_alert_status: ["open", "acknowledged", "resolved", "ignored"],
      program_health_dimension: [
        "registration",
        "submission",
        "judging",
        "mentoring",
        "communications",
        "automation",
        "sponsor_deliverables",
        "overall",
      ],
      program_health_status: ["on_track", "at_risk", "blocked", "overdue"],
      program_membership_role: [
        "program_manager",
        "judge",
        "sponsor",
        "participant",
        "team_lead",
        "program_editor",
        "mentor_manager",
        "mentor",
        "judge_manager",
      ],
      program_status: [
        "draft",
        "configured",
        "published",
        "in_review",
        "completed",
        "archived",
      ],
      registration_mode: [
        "open",
        "invite_only",
        "domain_restricted",
        "approval_based",
        "waitlist",
      ],
      report_status: [
        "draft",
        "generated",
        "approved",
        "published",
        "archived",
      ],
      report_visibility: ["internal", "sponsor"],
      score_entry_status: ["draft", "submitted"],
      score_scale_type: ["numeric", "boolean", "choice"],
      submission_status: [
        "draft",
        "submitted",
        "under_review",
        "needs_revision",
        "shortlisted",
        "finalist",
        "winner",
        "rejected",
        "withdrawn",
      ],
      team_invite_status: [
        "pending",
        "accepted",
        "declined",
        "revoked",
        "expired",
      ],
      template_apply_mode: [
        "full_start",
        "component_attach",
        "hybrid_with_brief",
        "clone_from_program",
      ],
      template_approval_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      template_component_type: [
        "landing_page",
        "registration_form",
        "submission_form",
        "scorecard",
        "communications_pack",
        "mentoring_pack",
        "sponsor_package",
        "report_pack",
        "approval_policy",
        "automation_pack",
        "ai_policy",
      ],
      template_kind: ["program", "component", "policy"],
      template_scope_type: ["platform", "organization", "workspace"],
      template_status: [
        "draft",
        "internal_review",
        "approved",
        "deprecated",
        "archived",
      ],
      visibility_scope: ["private", "workspace", "organization", "public"],
      workspace_membership_role: [
        "workspace_admin",
        "workspace_operator",
        "communications_manager",
      ],
    },
  },
} as const
