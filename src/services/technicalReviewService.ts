import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type ComplianceRule = Database["public"]["Tables"]["compliance_rules"]["Row"];
type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

export interface ComplianceCheckItem {
  rule_id: string;
  rule_name: string;
  rule_type: string;
  required_value: string;
  proposed_value: string;
  status: "Patuh" | "Tidak Patuh" | "Tidak Berkaitan";
  catatan: string;
}

export interface TechnicalReviewFormData {
  application_id: string;
  jenis_semakan: string;
  tarikh_semakan: string;
  pegawai_penyemak: string;
  kaedah_semakan: string;
  compliance_checks: ComplianceCheckItem[];
  keputusan_semakan: string;
  ringkasan_ulasan: string;
  syarat_syarat?: string;
  cadangan_kepada_osc?: string;
}

/**
 * Fetch all active compliance rules
 */
export async function getComplianceRules(): Promise<ComplianceRule[]> {
  const { data, error } = await supabase
    .from("compliance_rules")
    .select("*")
    .eq("is_active", true)
    .order("rule_name");

  if (error) {
    console.error("Error fetching compliance rules:", error);
    throw error;
  }

  return data || [];
}

/**
 * Format required value for display
 */
export function formatRequiredValue(rule: ComplianceRule): string {
  if (rule.min_value !== null && rule.max_value !== null) {
    return `${rule.min_value} - ${rule.max_value}`;
  } else if (rule.min_value !== null) {
    return `Min: ${rule.min_value}`;
  } else if (rule.max_value !== null) {
    return `Max: ${rule.max_value}`;
  }
  return "-";
}

/**
 * Submit technical review
 */
export async function submitTechnicalReview(
  formData: TechnicalReviewFormData,
  currentUserId: string
): Promise<string> {
  try {
    // 1. Prepare compliance results as JSON
    const complianceResults = formData.compliance_checks.reduce((acc, check) => {
      acc[check.rule_id] = {
        rule_name: check.rule_name,
        required_value: check.required_value,
        proposed_value: check.proposed_value,
        status: check.status,
        catatan: check.catatan,
      };
      return acc;
    }, {} as Record<string, any>);

    // 2. Insert review record
    const reviewData: ReviewInsert = {
      application_id: formData.application_id,
      officer_id: formData.pegawai_penyemak,
      jenis_semakan: formData.jenis_semakan,
      tarikh_semakan: formData.tarikh_semakan,
      kaedah_semakan: formData.kaedah_semakan,
      keputusan_semakan: formData.keputusan_semakan,
      ringkasan_ulasan: formData.ringkasan_ulasan,
      syarat_syarat: formData.syarat_syarat || null,
      cadangan_kepada_osc: formData.cadangan_kepada_osc || null,
      compliance_results: complianceResults,
      comment: formData.ringkasan_ulasan,
      decision: mapKeputusanToDecision(formData.keputusan_semakan),
    };

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert(reviewData)
      .select()
      .single();

    if (reviewError) throw reviewError;

    // 3. Update application status to match keputusan_semakan
    const newStatusDalaman = mapKeputusanToStatusDalaman(formData.keputusan_semakan);
    
    const { error: appError } = await supabase
      .from("applications")
      .update({
        status_dalaman: newStatusDalaman,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formData.application_id);

    if (appError) throw appError;

    // 4. Insert workflow history
    const { error: workflowError } = await supabase
      .from("workflow_history")
      .insert({
        application_id: formData.application_id,
        to_status: newStatusDalaman,
        changed_by: currentUserId,
        comment: `Semakan Teknikal Selesai – ${formData.keputusan_semakan}`,
      });

    if (workflowError) throw workflowError;

    // 5. If "Pindaan Diperlukan", create notification for assigned officer
    if (formData.keputusan_semakan === "Pindaan Diperlukan") {
      // Get application details for notification
      const { data: app } = await supabase
        .from("applications")
        .select("assigned_officer_id, no_fail_jpl")
        .eq("id", formData.application_id)
        .single();

      if (app?.assigned_officer_id) {
        await supabase.from("notifications").insert({
          user_id: app.assigned_officer_id,
          type: "status_change",
          title: "Pindaan Pelan Diperlukan",
          message: `Pindaan pelan diperlukan untuk No. Fail ${app.no_fail_jpl}. Sila maklumkan kepada pemohon.`,
          application_id: formData.application_id,
        });
      }
    }

    return review.id;
  } catch (error) {
    console.error("Error submitting technical review:", error);
    throw error;
  }
}

/**
 * Map keputusan_semakan to old decision field values
 */
function mapKeputusanToDecision(keputusan: string): string {
  switch (keputusan) {
    case "Lulus":
    case "Lulus Bersyarat":
      return "approve";
    case "Tolak":
      return "reject";
    case "Pindaan Diperlukan":
      return "request_revision";
    default:
      return "pending";
  }
}

/**
 * Map keputusan_semakan to status_dalaman
 */
function mapKeputusanToStatusDalaman(keputusan: string): string {
  switch (keputusan) {
    case "Lulus":
      return "Lulus";
    case "Lulus Bersyarat":
      return "Lulus Bersyarat";
    case "Tolak":
      return "Ditolak";
    case "Pindaan Diperlukan":
      return "Dalam Semakan Teknikal";
    default:
      return "Dalam Semakan Teknikal";
  }
}

export const JENIS_SEMAKAN_OPTIONS = [
  "Semakan Pertama",
  "Semakan Pindaan",
  "Semakan Ulangan",
] as const;

export const KAEDAH_SEMAKAN_OPTIONS = [
  "Manual",
  "SIPS Auto-Check",
  "GIS Overlay",
  "Hybrid",
] as const;

export const KEPUTUSAN_SEMAKAN_OPTIONS = [
  "Lulus",
  "Lulus Bersyarat",
  "Pindaan Diperlukan",
  "Tolak",
] as const;

export const STATUS_PEMATUHAN_OPTIONS = [
  "Patuh",
  "Tidak Patuh",
  "Tidak Berkaitan",
] as const;