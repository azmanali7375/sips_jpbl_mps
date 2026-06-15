import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "./notificationService";

export const kpiWarningService = {
  /**
   * Check applications for KPI warnings and create notifications
   * Called on page load or can be scheduled
   */
  async checkAndNotify(): Promise<void> {
    try {
      // Get all active applications with remaining days calculated
      const { data: applications, error } = await supabase
        .from("applications")
        .select(`
          id,
          tracking_number,
          assigned_officer_id,
          created_at,
          status
        `)
        .in("status", ["registered", "assigned", "site_visit", "technical_report", "head_review", "under_review"])
        .order("created_at", { ascending: true });

      if (error || !applications) {
        console.error("Error fetching applications for KPI check:", error);
        return;
      }

      // Get admin users to send all notifications to them
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      const adminIds = adminProfiles?.map(p => p.id) || [];

      const notificationsToCreate: Array<{
        userId: string;
        type: "status_change";
        title: string;
        message: string;
        applicationId: string;
      }> = [];

      // Check each application
      for (const app of applications) {
        const baki_hari = this.calculateRemainingDays(app.created_at);

        // Check if notification already exists for this warning level today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("application_id", app.id)
          .gte("created_at", `${today}T00:00:00`)
          .limit(1)
          .maybeSingle();

        // Skip if already notified today
        if (existingNotif) continue;

        let shouldNotify = false;
        let message = "";
        let title = "";

        if (baki_hari === 0) {
          shouldNotify = true;
          title = "🔴 KPI TERLEPAS";
          message = `KPI TERLEPAS: Permohonan ${app.tracking_number} telah melebihi 57 hari.`;
        } else if (baki_hari === 3) {
          shouldNotify = true;
          title = "🔴 AMARAN MERAH";
          message = `MERAH: Permohonan ${app.tracking_number} akan tamat KPI dalam 3 hari. Lapor kepada Ketua Unit segera.`;
        } else if (baki_hari === 7) {
          shouldNotify = true;
          title = "⚠️ AMARAN KRITIKAL";
          message = `KRITIKAL: Permohonan ${app.tracking_number} akan tamat KPI dalam 7 hari. Tindakan segera diperlukan.`;
        } else if (baki_hari === 14) {
          shouldNotify = true;
          title = "⏰ Amaran KPI";
          message = `Amaran KPI: Permohonan ${app.tracking_number} perlu diselesaikan dalam 14 hari bekerja.`;
        }

        if (shouldNotify) {
          // Notify assigned officer
          if (app.assigned_officer_id) {
            notificationsToCreate.push({
              userId: app.assigned_officer_id,
              type: "status_change",
              title,
              message,
              applicationId: app.id,
            });
          }

          // Notify all admins
          for (const adminId of adminIds) {
            notificationsToCreate.push({
              userId: adminId,
              type: "status_change",
              title,
              message,
              applicationId: app.id,
            });
          }
        }
      }

      // Bulk create notifications
      if (notificationsToCreate.length > 0) {
        await notificationService.createBulk(notificationsToCreate);
        console.log(`Created ${notificationsToCreate.length} KPI warning notifications`);
      }
    } catch (error) {
      console.error("Error in KPI warning check:", error);
    }
  },

  /**
   * Calculate remaining working days until KPI deadline (57 days from creation)
   */
  calculateRemainingDays(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const kpiDeadline = new Date(created);
    kpiDeadline.setDate(kpiDeadline.getDate() + 57);

    // Calculate working days between now and deadline
    let workingDays = 0;
    const current = new Date(now);

    while (current <= kpiDeadline) {
      const dayOfWeek = current.getDay();
      // Count only weekdays (Monday-Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // If deadline has passed, return 0
    return Math.max(0, workingDays);
  },

  /**
   * Get KPI status for an application
   */
  getKPIStatus(createdAt: string): {
    remainingDays: number;
    status: "on_track" | "warning" | "critical" | "red" | "overdue";
    color: string;
  } {
    const remainingDays = this.calculateRemainingDays(createdAt);

    if (remainingDays === 0) {
      return { remainingDays, status: "overdue", color: "bg-destructive" };
    } else if (remainingDays <= 3) {
      return { remainingDays, status: "red", color: "bg-destructive" };
    } else if (remainingDays <= 7) {
      return { remainingDays, status: "critical", color: "bg-amber-600" };
    } else if (remainingDays <= 14) {
      return { remainingDays, status: "warning", color: "bg-amber-500" };
    } else {
      return { remainingDays, status: "on_track", color: "bg-success" };
    }
  },
};