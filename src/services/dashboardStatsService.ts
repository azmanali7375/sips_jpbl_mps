/**
 * Dashboard Statistics Service
 * Provides aggregated statistics for admin dashboard
 */

import { supabase } from "@/integrations/supabase/client";
import { publicHolidayService } from "./publicHolidayService";

export interface AdminStats {
  total_applications: number;
  active_applications: number;
  pending_approval: number;
  approved_this_month: number;
  rejected_this_month: number;
  kpi_compliance_rate: number;
  avg_processing_days: number;
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
  keputusan: string;
  updated_at: string;
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
   * Get admin-level statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      // Total applications
      const { count: total } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });

      // Active applications (not approved/rejected)
      const { count: active } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("approved","rejected")');

      // Pending approval
      const { count: pending } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");

      // This month's stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: approvedThisMonth } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("updated_at", startOfMonth.toISOString());

      const { count: rejectedThisMonth } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected")
        .gte("updated_at", startOfMonth.toISOString());

      // KPI compliance calculation
      const { data: allApps } = await supabase
        .from("applications")
        .select("skala_km, tarikh_lengkap_diterima_osc, status, updated_at")
        .not("status", "in", '("approved","rejected")');

      let compliantCount = 0;
      let totalProcessingDays = 0;
      const today = new Date().toISOString().split("T")[0];

      for (const app of allApps || []) {
        if (!app.tarikh_lengkap_diterima_osc) continue;

        let bakiHari = 0;
        
        if (app.skala_km) {
          // KM: Use working days (53 working days)
          const deadlineDate = await publicHolidayService.addWorkingDays(
            app.tarikh_lengkap_diterima_osc,
            53
          );
          bakiHari = await publicHolidayService.calculateWorkingDays(today, deadlineDate);
        } else {
          // PB: Use calendar days (14 days)
          const startDate = new Date(app.tarikh_lengkap_diterima_osc);
          const deadlineDate = new Date(startDate);
          deadlineDate.setDate(deadlineDate.getDate() + 14);
          const diffTime = deadlineDate.getTime() - new Date(today).getTime();
          bakiHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        if (bakiHari >= 0) {
          compliantCount++;
        }

        // Calculate processing days
        const startDate = new Date(app.tarikh_lengkap_diterima_osc);
        const endDate = app.status === "approved" || app.status === "rejected" 
          ? new Date(app.updated_at)
          : new Date();
        
        if (app.skala_km) {
          const workingDays = await publicHolidayService.calculateWorkingDays(
            app.tarikh_lengkap_diterima_osc,
            endDate.toISOString().split("T")[0]
          );
          totalProcessingDays += workingDays;
        } else {
          const diffTime = endDate.getTime() - startDate.getTime();
          totalProcessingDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      const kpiCompliance =
        (allApps?.length || 0) > 0
          ? Math.round((compliantCount / (allApps?.length || 1)) * 100)
          : 100;

      const avgProcessingDays =
        (allApps?.length || 0) > 0
          ? Math.round(totalProcessingDays / (allApps?.length || 1))
          : 0;

      return {
        total_applications: total || 0,
        active_applications: active || 0,
        pending_approval: pending || 0,
        approved_this_month: approvedThisMonth || 0,
        rejected_this_month: rejectedThisMonth || 0,
        kpi_compliance_rate: kpiCompliance,
        avg_processing_days: avgProcessingDays,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return {
        total_applications: 0,
        active_applications: 0,
        pending_approval: 0,
        approved_this_month: 0,
        rejected_this_month: 0,
        kpi_compliance_rate: 0,
        avg_processing_days: 0,
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