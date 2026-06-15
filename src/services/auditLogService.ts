/**
 * Audit Log Service
 * Records sensitive admin actions for compliance tracking
 */

import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  user_id: string;
  action: string;
  target_user_id?: string | null;
  target_record_id?: string | null;
  details?: Record<string, any> | null;
}

export const auditLogService = {
  /**
   * Log an admin action
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await supabase.from("audit_log").insert({
        user_id: entry.user_id,
        action: entry.action,
        target_user_id: entry.target_user_id || null,
        target_record_id: entry.target_record_id || null,
        details: entry.details || null,
      });

      if (error) {
        console.error("Error logging audit entry:", error);
      }
    } catch (error) {
      console.error("Audit log error:", error);
    }
  },

  /**
   * Get audit logs (admin only)
   */
  async getLogs(filters?: {
    user_id?: string;
    action?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from("audit_log")
        .select("*, profiles!audit_log_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }

      if (filters?.action) {
        query = query.eq("action", filters.action);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return [];
    }
  },

  /**
   * Common audit actions
   */
  actions: {
    USER_APPROVED: "user_approved",
    USER_REJECTED: "user_rejected",
    USER_DEACTIVATED: "user_deactivated",
    USER_ROLE_CHANGED: "user_role_changed",
    C1_GENERATED: "c1_generated",
    C2_GENERATED: "c2_generated",
    A1_GENERATED: "a1_generated",
    KERTAS_PERAKUAN_SUBMITTED: "kertas_perakuan_submitted",
    OSC_DECISION_RECORDED: "osc_decision_recorded",
    APPLICATION_DELETED: "application_deleted",
  },
};