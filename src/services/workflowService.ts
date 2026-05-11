import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { notificationService } from "./notificationService";

type WorkflowStatus = 
  | "osc_received"
  | "registered"
  | "assigned"
  | "site_visit"
  | "technical_report"
  | "head_review"
  | "recommendation"
  | "osc_meeting"
  | "approved"
  | "rejected"
  | "approved_with_amendments";

export const workflowService = {
  // Get workflow history for an application
  async getWorkflowHistory(applicationId: string): Promise<Tables<"workflow_history">[]> {
    const { data, error } = await supabase
      .from("workflow_history")
      .select("*, profiles!workflow_history_changed_by_fkey(full_name, role)")
      .eq("application_id", applicationId)
      .order("changed_at", { ascending: false });

    if (error) {
      console.error("Error fetching workflow history:", error);
      return [];
    }

    return data || [];
  },

  // Record workflow status change
  async updateStatus(
    applicationId: string,
    newStatus: WorkflowStatus,
    notes?: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Get current application data
    const { data: app } = await supabase
      .from("applications")
      .select("*, profiles!applications_applicant_id_fkey(full_name)")
      .eq("id", applicationId)
      .single();

    if (!app) return false;

    const oldStatus = app.status;

    // Update application status
    const { error: appError } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (appError) {
      console.error("Error updating application status:", appError);
      return false;
    }

    // Record in workflow history
    const { error: historyError } = await supabase
      .from("workflow_history")
      .insert({
        application_id: applicationId,
        from_status: oldStatus,
        to_status: newStatus,
        changed_by: user.id,
        comment: notes || undefined,
      });

    if (historyError) {
      console.error("Error recording workflow history:", historyError);
      return false;
    }

    // Create status change notification for applicant
    const statusTemplate = notificationService.templates.statusChange(
      app.tracking_number,
      newStatus
    );
    await notificationService.create({
      userId: app.applicant_id,
      type: "status_change",
      title: statusTemplate.title,
      message: statusTemplate.message,
      applicationId,
    });

    return true;
  },

  // Admin Assistant: Register application
  async registerApplication(applicationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("applications")
      .update({
        status: "registered",
        registered_by: user.id,
      } as any)
      .eq("id", applicationId);

    if (error) {
      console.error("Error registering application:", error);
      return false;
    }

    await this.updateStatus(applicationId, "registered", "Permohonan didaftarkan oleh Pembantu Tadbir");
    return true;
  },

  // Unit Head: Assign to Assistant Planner
  async assignToPlanner(
    applicationId: string,
    plannerId: string,
    notes?: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Get application and assigner profile
    const { data: app } = await supabase
      .from("applications")
      .select("tracking_number")
      .eq("id", applicationId)
      .single();

    const { data: assigner } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (!app) return false;

    const { error } = await supabase
      .from("applications")
      .update({
        status: "assigned",
        assigned_officer_id: plannerId,
        unit_head_id: user.id,
        assigned_at: new Date().toISOString(),
      } as any)
      .eq("id", applicationId);

    if (error) {
      console.error("Error assigning application:", error);
      return false;
    }

    await this.updateStatus(applicationId, "assigned", notes || `Ditugaskan kepada perancang oleh Ketua Unit`);
    
    // Create assignment notification for planner
    const assignmentTemplate = notificationService.templates.assignment(
      app.tracking_number,
      assigner?.full_name || "Ketua Unit"
    );
    await notificationService.create({
      userId: plannerId,
      type: "assignment",
      title: assignmentTemplate.title,
      message: assignmentTemplate.message,
      applicationId,
    });

    return true;
  },

  // Assistant Planner: Start site visit
  async startSiteVisit(applicationId: string): Promise<boolean> {
    const { error } = await supabase
      .from("applications")
      .update({
        status: "site_visit",
      } as any)
      .eq("id", applicationId);

    if (error) {
      console.error("Error starting site visit:", error);
      return false;
    }

    return await this.updateStatus(
      applicationId,
      "site_visit",
      "Lawatan tapak sedang dijalankan"
    );
  },

  // Assistant Planner: Submit technical report
  async submitTechnicalReport(applicationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("applications")
      .update({
        status: "technical_report",
        technical_report_completed_at: new Date().toISOString(),
      } as any)
      .eq("id", applicationId);

    if (error) {
      console.error("Error submitting technical report:", error);
      return false;
    }

    await this.updateStatus(applicationId, "technical_report", "Laporan teknikal dikemukakan untuk semakan");
    
    // Notify Department Head
    const { data: app } = await supabase
      .from("applications")
      .select("department_head_id, unit_head_id")
      .eq("id", applicationId)
      .single();

    if (app?.department_head_id) {
      await notificationService.create({
        userId: app.department_head_id,
        type: "status_change",
        title: "Laporan Teknikal Sedia",
        message: "Laporan teknikal sedia untuk disemak oleh Ketua Jabatan",
        applicationId,
      });
    }

    // Also notify Unit Head
    if (app?.unit_head_id) {
      await notificationService.create({
        userId: app.unit_head_id,
        type: "status_change",
        title: "Laporan Teknikal Dikemukakan",
        message: "Laporan teknikal telah dikemukakan untuk semakan",
        applicationId,
      });
    }

    return true;
  },

  // Department Head: Submit recommendation
  async submitRecommendation(
    applicationId: string,
    recommendation: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("applications")
      .update({
        status: "recommendation",
        department_head_id: user.id,
        head_review_completed_at: new Date().toISOString(),
      } as any)
      .eq("id", applicationId);

    if (error) {
      console.error("Error submitting recommendation:", error);
      return false;
    }

    await this.updateStatus(
      applicationId,
      "recommendation",
      `Syor Ketua Jabatan: ${recommendation}`
    );

    // Notify Unit Head and assigned officer
    const { data: app } = await supabase
      .from("applications")
      .select("unit_head_id, assigned_officer_id")
      .eq("id", applicationId)
      .single();

    const notificationsToCreate = [];
    if (app?.unit_head_id) {
      notificationsToCreate.push({
        userId: app.unit_head_id,
        type: "status_change" as const,
        title: "Syor Ketua Jabatan Selesai",
        message: "Ketua Jabatan telah mengemukakan syor untuk permohonan ini",
        applicationId,
      });
    }
    if (app?.assigned_officer_id) {
      notificationsToCreate.push({
        userId: app.assigned_officer_id,
        type: "status_change" as const,
        title: "Syor Ketua Jabatan Selesai",
        message: "Ketua Jabatan telah mengemukakan syor untuk permohonan ini",
        applicationId,
      });
    }

    if (notificationsToCreate.length > 0) {
      await notificationService.createBulk(notificationsToCreate);
    }

    return true;
  },

  // Record OSC meeting decision
  async recordOSCDecision(
    applicationId: string,
    decision: "approved" | "rejected" | "approved_with_amendments",
    meetingDate: string,
    reasons?: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const decisionPayload: any = {
      application_id: applicationId,
      meeting_date: meetingDate,
      decision_type: decision === "approved" ? "lulus" : decision === "rejected" ? "tolak" : "lulus_dengan_pindaan",
      recorded_by: user.id,
    };
    
    if (decision === "rejected") decisionPayload.rejection_reasons = reasons;
    else if (decision === "approved_with_amendments") decisionPayload.amendment_requirements = reasons;
    else if (decision === "approved") decisionPayload.approval_conditions = reasons;

    // Record decision in osc_decisions table
    const { error: decisionError } = await supabase
      .from("osc_decisions")
      .insert(decisionPayload);

    if (decisionError) {
      console.error("Error recording OSC decision:", decisionError);
      return false;
    }

    // Update application status
    const statusMap: Record<typeof decision, WorkflowStatus> = {
      approved: "approved",
      rejected: "rejected",
      approved_with_amendments: "approved_with_amendments",
    };

    await this.updateStatus(
      applicationId,
      statusMap[decision],
      `Keputusan OSC: ${decision === "approved" ? "Diluluskan" : decision === "rejected" ? "Ditolak" : "Lulus Dengan Pindaan"}`
    );

    // Notify all involved parties
    const { data: app } = await supabase
      .from("applications")
      .select("applicant_id, assigned_officer_id, unit_head_id, department_head_id")
      .eq("id", applicationId)
      .single();

    if (app) {
      const notificationsToCreate = [];
      const decisionLabels = {
        approved: "DILULUSKAN",
        rejected: "DITOLAK",
        approved_with_amendments: "LULUS DENGAN PINDAAN",
      };

      // Notify applicant
      notificationsToCreate.push({
        userId: app.applicant_id,
        type: "status_change" as const,
        title: `Permohonan ${decisionLabels[decision]}`,
        message: `Permohonan anda telah ${decisionLabels[decision].toLowerCase()} dalam mesyuarat OSC`,
        applicationId,
      });

      // Notify all officers involved
      [app.assigned_officer_id, app.unit_head_id, app.department_head_id]
        .filter(Boolean)
        .forEach(officerId => {
          notificationsToCreate.push({
            userId: officerId!,
            type: "status_change" as const,
            title: "Keputusan OSC Direkod",
            message: `Keputusan OSC: ${decisionLabels[decision]}`,
            applicationId,
          });
        });

      await notificationService.createBulk(notificationsToCreate);
    }

    return true;
  },

  // Get applications by status and role
  async getApplicationsByRole(): Promise<Tables<"applications">[]> {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, id")
      .single();

    if (!profile) return [];

    let query = supabase
      .from("applications")
      .select("*, profiles!applications_applicant_id_fkey(full_name, email)");

    // Filter based on role
    switch (profile.role) {
      case "admin_assistant":
        // See osc_received applications
        query = query.eq("status", "osc_received");
        break;
      case "unit_head":
        // See registered and pending assignment
        query = query.in("status", ["registered", "assigned"]);
        break;
      case "assistant_planner_j5":
        // See assigned to me
        query = query.eq("assigned_officer_id", profile.id);
        break;
      case "department_head":
        // See technical_report status
        query = query.eq("status", "technical_report");
        break;
      default:
        // Applicants see their own
        query = query.eq("applicant_id", profile.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  },

  // Get applications assigned to current user
  async getAssignedToMe(): Promise<Tables<"applications">[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("applications")
      .select("*, profiles!applications_applicant_id_fkey(full_name, email)")
      .eq("assigned_officer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching assigned applications:", error);
      return [];
    }

    return data || [];
  },

  // Get available assistant planners for assignment
  async getAvailablePlanners(): Promise<Tables<"profiles">[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["assistant_planner_j5", "unit_head"])
      .order("full_name");

    if (error) {
      console.error("Error fetching planners:", error);
      return [];
    }

    return data || [];
  },
};