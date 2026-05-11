import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type NotificationType = "status_change" | "assignment" | "comment" | "submission";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
}

export const notificationService = {
  // Create a notification
  async create(params: CreateNotificationParams): Promise<boolean> {
    const { error } = await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      application_id: params.applicationId,
    });

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }

    return true;
  },

  // Bulk create notifications (e.g., notify multiple users)
  async createBulk(notifications: CreateNotificationParams[]): Promise<boolean> {
    const { error } = await supabase.from("notifications").insert(
      notifications.map(n => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        application_id: n.applicationId,
      }))
    );

    if (error) {
      console.error("Error creating bulk notifications:", error);
      return false;
    }

    return true;
  },

  // Get user notifications
  async getMyNotifications(): Promise<Tables<"notifications">[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*, applications(tracking_number, project_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    return data || [];
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }

    return count || 0;
  },

  // Mark as read
  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  },

  // Mark all as read
  async markAllAsRead(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  },

  // Delete notification
  async delete(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      return false;
    }

    return true;
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },

  // Unsubscribe from notifications
  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  },

  // Notification templates for different events
  templates: {
    statusChange(trackingNumber: string, newStatus: string): { title: string; message: string } {
      const statusLabels: Record<string, string> = {
        registered: "Berdaftar",
        assigned: "Ditugaskan",
        site_visit: "Lawatan Tapak",
        technical_report: "Laporan Teknikal",
        head_review: "Semakan Ketua",
        recommendation: "Cadangan",
        osc_meeting: "Mesyuarat OSC",
        approved: "Diluluskan",
        rejected: "Ditolak",
        approved_with_amendments: "Lulus Dengan Pindaan",
      };

      return {
        title: "Status Dikemas Kini",
        message: `Permohonan ${trackingNumber} telah dikemas kini kepada: ${statusLabels[newStatus] || newStatus}`,
      };
    },

    assignment(trackingNumber: string, assignerName: string): { title: string; message: string } {
      return {
        title: "Tugasan Baru",
        message: `Anda telah diberikan tugasan untuk menyemak permohonan ${trackingNumber} oleh ${assignerName}`,
      };
    },

    comment(trackingNumber: string, commenterName: string): { title: string; message: string } {
      return {
        title: "Komen Baru",
        message: `${commenterName} telah menambah komen pada permohonan ${trackingNumber}`,
      };
    },

    submission(trackingNumber: string, applicantName: string): { title: string; message: string } {
      return {
        title: "Permohonan Baru",
        message: `Permohonan baru ${trackingNumber} telah dikemukakan oleh ${applicantName}`,
      };
    },
  },
};