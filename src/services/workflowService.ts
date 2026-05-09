import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
        from_status: newStatus,
        to_status: newStatus,
        changed_by: user.id,
        comment: notes || undefined,
      });

    if (historyError) {
      console.error("Error recording workflow history:", historyError);
      return false;
    }

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

    await this.updateStatus(applicationId, "registered", "Application registered by Admin Assistant");
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

    await this.updateStatus(applicationId, "assigned", notes || `Assigned to planner by Unit Head`);
    
    // Create notification for planner
    await supabase.from("notifications").insert({
      user_id: plannerId,
      application_id: applicationId,
      type: "assignment",
      title: "Tugasan Baru",
      message: `Anda telah diberikan tugasan baru untuk menyemak permohonan`,
    });

    return true;
  },

  // Assistant Planner: Start site visit
  async startSiteVisit(applicationId: string): Promise<boolean> {
    return await this.updateStatus(
      applicationId,
      "site_visit",
      "Site visit in progress"
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

    await this.updateStatus(applicationId, "technical_report", "Technical report submitted for review");
    
    // Notify Department Head
    const { data: app } = await supabase
      .from("applications")
      .select("department_head_id")
      .eq("id", applicationId)
      .single();

    if (app?.department_head_id) {
      await supabase.from("notifications").insert({
        user_id: app.department_head_id,
        application_id: applicationId,
        type: "status_change",
        title: "Laporan Teknikal Sedia",
        message: "Laporan teknikal sedia untuk disemak oleh Ketua Jabatan",
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
      `Department Head recommendation: ${recommendation}`
    );

    return true;
  },

  // Record OSC meeting decision
  async recordOSCDecision(
    applicationId: string,
    decision: "approved" | "rejected" | "approved_with_amendments",
    meetingDate: string,
    reasons?: string
  ): Promise<boolean> {
    const decisionPayload: any = {
      application_id: applicationId,
      meeting_date: meetingDate,
      decision_type: decision,
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
      `OSC Decision: ${decision}`
    );

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

  // Get available assistant planners for assignment
  async getAvailablePlanners(): Promise<Tables<"profiles">[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "assistant_planner_j5")
      .order("full_name");

    if (error) {
      console.error("Error fetching planners:", error);
      return [];
    }

    return data || [];
  },
};