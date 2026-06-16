/**
 * Dashboard Statistics Service
 * Provides aggregated statistics for admin dashboard
 */

import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  total_applications: number;
  active_applications: number;
  pending_approval: number;
  approved_this_month: number;
  rejected_this_month: number;
  avg_processing_days: number;
  kpi_compliance_rate: number;
}

export interface WorkflowStats {
  status: string;
  count: number;
  percentage: number;
}

export interface RecentApproval {
  id: string;
  no_fail_jpl: string;
  nama_pemaju_pemilik: string;
  status: string;
  updated_at: string;
  keputusan: string;
}

export interface UserActivityStats {
  user_id: string;
  full_name: string;
  role: string;
  assigned_count: number;
  completed_count: number;
  pending_count: number;
}

export const dashboardStatsService = {
  /**
   * Get admin summary statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      // Get total applications
      const { count: total, error: totalError } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Get active applications (not approved/rejected)
      const { count: active, error: activeError } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("approved","rejected")');

      if (activeError) throw activeError;

      // Get pending approval
      const { count: pending, error: pendingError } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");

      if (pendingError) throw pendingError;

      // Get approved this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { count: approvedMonth, error: approvedError } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("updated_at", firstDayOfMonth.toISOString());

      if (approvedError) throw approvedError;

      // Get rejected this month
      const { count: rejectedMonth, error: rejectedError } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected")
        .gte("updated_at", firstDayOfMonth.toISOString());

      if (rejectedError) throw rejectedError;

      // Calculate average processing days (for completed applications)
      const { data: completedApps, error: completedError } = await supabase
        .from("applications")
        .select("tarikh_lengkap_diterima_osc, updated_at")
        .in("status", ["approved", "rejected"])
        .not("tarikh_lengkap_diterima_osc", "is", null)
        .limit(100);

      if (completedError) throw completedError;

      let avgDays = 0;
      if (completedApps && completedApps.length > 0) {
        const totalDays = completedApps.reduce((sum, app) => {
          const start = new Date(app.tarikh_lengkap_diterima_osc!);
          const end = new Date(app.updated_at!);
          const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        avgDays = Math.round(totalDays / completedApps.length);
      }

      // Calculate KPI compliance rate (completed within KPI deadline)
      const { data: kpiApps, error: kpiError } = await supabase
        .from("applications")
        .select("tarikh_lengkap_diterima_osc, tarikh_kpi, updated_at")
        .in("status", ["approved", "rejected"])
        .not("tarikh_kpi", "is", null);

      if (kpiError) throw kpiError;

      let kpiCompliance = 0;
      if (kpiApps && kpiApps.length > 0) {
        const compliantCount = kpiApps.filter((app) => {
          const completedDate = new Date(app.updated_at!);
          const kpiDate = new Date(app.tarikh_kpi!);
          return completedDate <= kpiDate;
        }).length;
        kpiCompliance = Math.round((compliantCount / kpiApps.length) * 100);
      }

      return {
        total_applications: total || 0,
        active_applications: active || 0,
        pending_approval: pending || 0,
        approved_this_month: approvedMonth || 0,
        rejected_this_month: rejectedMonth || 0,
        avg_processing_days: avgDays,
        kpi_compliance_rate: kpiCompliance,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return {
        total_applications: 0,
        active_applications: 0,
        pending_approval: 0,
        approved_this_month: 0,
        rejected_this_month: 0,
        avg_processing_days: 0,
        kpi_compliance_rate: 0,
      };
    }
  },

  /**
   * Get workflow status distribution
   */
  async getWorkflowStats(): Promise<WorkflowStats[]> {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("status");

      if (error) throw error;

      const statusCounts: { [key: string]: number } = {};
      let total = 0;

      data?.forEach((app) => {
        const status = app.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        total++;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }));
    } catch (error) {
      console.error("Error fetching workflow stats:", error);
      return [];
    }
  },

  /**
   * Get recent approvals and rejections
   */
  async getRecentApprovals(limit: number = 10): Promise<RecentApproval[]> {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("id, no_fail_jpl, nama_pemaju_pemilik, status, updated_at")
        .in("status", ["approved", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((app) => ({
        id: app.id,
        no_fail_jpl: app.no_fail_jpl || "",
        nama_pemaju_pemilik: app.nama_pemaju_pemilik || "",
        status: app.status || "",
        updated_at: app.updated_at || "",
        keputusan: app.status === "approved" ? "Diluluskan" : "Ditolak",
      }));
    } catch (error) {
      console.error("Error fetching recent approvals:", error);
      return [];
    }
  },

  /**
   * Get user activity statistics (admin only)
   */
  async getUserActivity(): Promise<UserActivityStats[]> {
    try {
      // Get all pegawai with their assignments
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["pegawai", "penolong", "ketua_unit"]);

      if (usersError) throw usersError;

      const stats: UserActivityStats[] = [];

      for (const user of users || []) {
        // Count assigned applications
        const { count: assigned } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("assigned_officer_id", user.id);

        // Count completed
        const { count: completed } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("assigned_officer_id", user.id)
          .in("status", ["approved", "rejected"]);

        // Count pending
        const { count: pending } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("assigned_officer_id", user.id)
          .not("status", "in", '("approved","rejected")');

        stats.push({
          user_id: user.id,
          full_name: user.full_name || "",
          role: user.role || "",
          assigned_count: assigned || 0,
          completed_count: completed || 0,
          pending_count: pending || 0,
        });
      }

      return stats.sort((a, b) => b.pending_count - a.pending_count);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      return [];
    }
  },

  /**
   * Get monthly submission trend
   */
  async getMonthlyTrend(months: number = 6): Promise<{ month: string; count: number }[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      startDate.setDate(1);

      const { data, error } = await supabase
        .from("applications")
        .select("tarikh_lengkap_diterima_osc")
        .gte("tarikh_lengkap_diterima_osc", startDate.toISOString())
        .not("tarikh_lengkap_diterima_osc", "is", null);

      if (error) throw error;

      const monthlyCounts: { [key: string]: number } = {};

      data?.forEach((app) => {
        const date = new Date(app.tarikh_lengkap_diterima_osc!);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      });

      return Object.entries(monthlyCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error("Error fetching monthly trend:", error);
      return [];
    }
  },
};