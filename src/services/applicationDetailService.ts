import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Application = Database["public"]["Tables"]["applications"]["Row"];
type WorkflowHistory = Database["public"]["Tables"]["workflow_history"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface ApplicationDetailData extends Application {
  assigned_officer?: Profile | null;
  applicant?: Profile | null;
}

export interface WorkflowHistoryWithProfile extends WorkflowHistory {
  changed_by_profile?: Profile | null;
}

/**
 * Fetch full application details with related data
 */
export async function getApplicationDetail(
  applicationId: string
): Promise<ApplicationDetailData | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      assigned_officer:assigned_officer_id(id, full_name, email, role),
      applicant:applicant_id(id, full_name, email)
    `
    )
    .eq("id", applicationId)
    .single();

  if (error) {
    console.error("Error fetching application detail:", error);
    throw error;
  }

  return data as ApplicationDetailData;
}

/**
 * Fetch workflow history for an application
 */
export async function getWorkflowHistory(
  applicationId: string
): Promise<WorkflowHistoryWithProfile[]> {
  const { data, error } = await supabase
    .from("workflow_history")
    .select(
      `
      *,
      changed_by_profile:changed_by(id, full_name, role)
    `
    )
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workflow history:", error);
    return [];
  }

  return (data as WorkflowHistoryWithProfile[]) || [];
}

/**
 * Update application status and create workflow history entry
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string,
  userId: string,
  comment?: string
): Promise<void> {
  // Update the application status
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status_dalaman: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    console.error("Error updating status:", updateError);
    throw updateError;
  }

  // Create workflow history entry
  const { error: historyError } = await supabase
    .from("workflow_history")
    .insert({
      application_id: applicationId,
      to_status: newStatus,
      changed_by: userId,
      comment: comment || `Status dikemaskini kepada: ${newStatus}`,
    });

  if (historyError) {
    console.error("Error creating workflow history:", historyError);
    throw historyError;
  }
}

/**
 * Reassign application to another officer
 */
export async function reassignApplication(
  applicationId: string,
  newOfficerId: string,
  userId: string
): Promise<void> {
  // Update the assigned officer
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      assigned_officer_id: newOfficerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    console.error("Error reassigning application:", updateError);
    throw updateError;
  }

  // Create workflow history entry
  const { error: historyError } = await supabase
    .from("workflow_history")
    .insert({
      application_id: applicationId,
      to_status: "Reassigned",
      changed_by: userId,
      comment: "Permohonan diagihkan kepada pegawai lain",
    });

  if (historyError) {
    console.error("Error creating workflow history:", historyError);
    throw historyError;
  }
}

/**
 * Update application notes
 */
export async function updateApplicationNotes(
  applicationId: string,
  notes: string,
  userId: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      catatan_dalaman: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    console.error("Error updating notes:", updateError);
    throw updateError;
  }

  // Create workflow history entry
  const { error: historyError } = await supabase
    .from("workflow_history")
    .insert({
      application_id: applicationId,
      to_status: "Notes Updated",
      changed_by: userId,
      comment: "Catatan dalaman dikemaskini",
    });

  if (historyError) {
    console.error("Error creating workflow history:", historyError);
    throw historyError;
  }
}

/**
 * Fetch available officers for reassignment
 */
export async function getAvailableOfficers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "officer", "department_head"])
    .order("full_name");

  if (error) {
    console.error("Error fetching officers:", error);
    return [];
  }

  return data || [];
}

/**
 * Calculate KPI progress
 */
export function calculateKPIProgress(
  tarikhLengkap: string,
  tarikhKPI: string
): {
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  progressPercentage: number;
  status: "good" | "warning" | "critical" | "overdue";
} {
  const startDate = new Date(tarikhLengkap);
  const kpiDate = new Date(tarikhKPI);
  const today = new Date();

  const totalDays = 57; // Fixed 57 days KPI
  const msPerDay = 1000 * 60 * 60 * 24;

  const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / msPerDay);
  const daysRemaining = Math.floor((kpiDate.getTime() - today.getTime()) / msPerDay);
  
  const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  let status: "good" | "warning" | "critical" | "overdue" = "good";
  
  if (daysRemaining < 0) {
    status = "overdue";
  } else if (daysElapsed > 50) {
    status = "critical";
  } else if (daysElapsed >= 40) {
    status = "warning";
  }

  return {
    daysElapsed,
    daysRemaining,
    totalDays,
    progressPercentage,
    status,
  };
}