import { Injectable, Logger } from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name)
  private supabase: SupabaseClient

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.warn(
        "Supabase credentials not found. Chat functionality will be disabled."
      )
      return
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    this.logger.log("Supabase service initialized")
  }

  async createChatSession(
    liveSessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.supabase) {
        this.logger.warn(
          "Supabase not initialized, skipping chat session creation"
        )
        return { success: true }
      }

      const { data, error } = await this.supabase
        .from("chat_sessions")
        .insert({
          live_session_id: liveSessionId,
          session_title: `Live Session ${liveSessionId}`,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        this.logger.error("Error creating chat session:", error)
        return { success: false, error: error.message }
      }

      this.logger.log(`Chat session created for live session: ${liveSessionId}`)
      return { success: true }
    } catch (error) {
      this.logger.error("Unexpected error creating chat session:", error)
      return { success: false, error: "Failed to create chat session" }
    }
  }

  async endChatSession(
    liveSessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.supabase) {
        this.logger.warn(
          "Supabase not initialized, skipping chat session ending"
        )
        return { success: true }
      }

      const { error } = await this.supabase
        .from("chat_sessions")
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString() 
        })
        .eq("live_session_id", liveSessionId)

      if (error) {
        this.logger.error("Error ending chat session:", error)
        return { success: false, error: error.message }
      }

      this.logger.log(`Chat session ended for live session: ${liveSessionId}`)
      return { success: true }
    } catch (error) {
      this.logger.error("Unexpected error ending chat session:", error)
      return { success: false, error: "Failed to end chat session" }
    }
  }

  async deleteChatSession(
    liveSessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.supabase) {
        this.logger.warn(
          "Supabase not initialized, skipping chat session deletion"
        )
        return { success: true }
      }

      // First, find the chat session by live_session_id
      const { data: chatSession, error: findError } = await this.supabase
        .from("chat_sessions")
        .select("id")
        .eq("live_session_id", liveSessionId)
        .single()

      if (findError) {
        this.logger.warn(`No chat session found for live session: ${liveSessionId}`)
        return { success: true } // Not an error if no chat session exists
      }

      if (!chatSession) {
        this.logger.warn(`No chat session found for live session: ${liveSessionId}`)
        return { success: true }
      }

      const chatSessionId = chatSession.id

      // Delete messages first
      const { error: messagesError } = await this.supabase
        .from("chat_messages")
        .delete()
        .eq("chat_session_id", chatSessionId)

      if (messagesError) {
        this.logger.error("Error deleting chat messages:", messagesError)
      } else {
        this.logger.log(`Deleted chat messages for chat session: ${chatSessionId}`)
      }

      // Delete participants
      const { error: participantsError } = await this.supabase
        .from("chat_participants")
        .delete()
        .eq("chat_session_id", chatSessionId)

      if (participantsError) {
        this.logger.error(
          "Error deleting chat participants:",
          participantsError
        )
      } else {
        this.logger.log(`Deleted chat participants for chat session: ${chatSessionId}`)
      }

      // Delete chat session
      const { error: sessionError } = await this.supabase
        .from("chat_sessions")
        .delete()
        .eq("id", chatSessionId)

      if (sessionError) {
        this.logger.error("Error deleting chat session:", sessionError)
        return { success: false, error: sessionError.message }
      }

      this.logger.log(
        `Successfully deleted chat data for live session: ${liveSessionId}`
      )
      return { success: true }
    } catch (error) {
      this.logger.error("Unexpected error deleting chat session:", error)
      return { success: false, error: "Failed to delete chat session" }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.supabase) {
        return { success: false, error: "Supabase not initialized" }
      }

      const { data, error } = await this.supabase
        .from("chat_sessions")
        .select("count")
        .limit(1)

      if (error) {
        this.logger.error("Supabase connection test failed:", error)
        return { success: false, error: error.message }
      }

      this.logger.log("Supabase connection test successful")
      return { success: true }
    } catch (error) {
      this.logger.error("Unexpected error testing Supabase connection:", error)
      return { success: false, error: "Failed to test connection" }
    }
  }
}
