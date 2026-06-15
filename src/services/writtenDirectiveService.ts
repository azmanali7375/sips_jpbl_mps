import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type WrittenDirective = Database["public"]["Tables"]["written_directives"]["Row"];
type WrittenDirectiveInsert = Database["public"]["Tables"]["written_directives"]["Insert"];

export interface WrittenDirectiveFormData {
  application_id: string;
  jenis_borang: string;
  tarikh_dikeluarkan: string;
  arahan: string;
  tarikh_pematuhan_dikehendaki: string;
  tarikh_pematuhan_diterima?: string;
  status_pematuhan: string;
  catatan?: string;
}

export const JENIS_BORANG_OPTIONS = [
  "Borang A1 KPPA – Arahan Bertulis",
  "Borang A2 KPPA – Pematuhan Arahan",
] as const;

export const STATUS_PEMATUHAN_OPTIONS = [
  "Menunggu",
  "Patuh",
  "Gagal Patuh",
] as const;

/**
 * Create a new written directive
 */
export async function createWrittenDirective(
  formData: WrittenDirectiveFormData,
  userId: string
): Promise<WrittenDirective> {
  // Generate directive number (format: AB/[YEAR]/[sequence])
  const year = new Date().getFullYear();
  
  // Get last directive number for this year
  const { data: existing } = await supabase
    .from("written_directives")
    .select("directive_number")
    .like("directive_number", `AB/${year}/%`)
    .order("created_at", { ascending: false })
    .limit(1);

  let sequence = 1;
  if (existing && existing.length > 0) {
    const lastNumber = existing[0].directive_number;
    const match = lastNumber?.match(/AB\/\d+\/(\d+)/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  const directiveNumber = `AB/${year}/${String(sequence).padStart(3, "0")}`;

  const directiveData: WrittenDirectiveInsert = {
    application_id: formData.application_id,
    directive_number: directiveNumber,
    jenis_borang: formData.jenis_borang,
    tarikh_dikeluarkan: formData.tarikh_dikeluarkan,
    arahan: formData.arahan,
    directive_content: formData.arahan, // Store in both fields for compatibility
    tarikh_pematuhan_dikehendaki: formData.tarikh_pematuhan_dikehendaki,
    tarikh_pematuhan_diterima: formData.tarikh_pematuhan_diterima || null,
    status_pematuhan: formData.status_pematuhan,
    catatan: formData.catatan || null,
    prepared_by: userId,
    status: "draft",
    prepared_date: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("written_directives")
    .insert(directiveData)
    .select()
    .single();

  if (error) {
    console.error("Error creating written directive:", error);
    throw error;
  }

  // Insert workflow history
  await supabase.from("workflow_history").insert({
    application_id: formData.application_id,
    to_status: "Arahan Bertulis Dikeluarkan",
    changed_by: userId,
    comment: `${formData.jenis_borang} - No. ${directiveNumber}`,
  });

  return data;
}

/**
 * Update an existing written directive
 */
export async function updateWrittenDirective(
  directiveId: string,
  formData: Partial<WrittenDirectiveFormData>,
  userId: string
): Promise<WrittenDirective> {
  const updateData: any = {
    ...formData,
    directive_content: formData.arahan, // Sync both fields
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("written_directives")
    .update(updateData)
    .eq("id", directiveId)
    .select()
    .single();

  if (error) {
    console.error("Error updating written directive:", error);
    throw error;
  }

  return data;
}

/**
 * Get all written directives for an application
 */
export async function getWrittenDirectives(
  applicationId: string
): Promise<WrittenDirective[]> {
  const { data, error } = await supabase
    .from("written_directives")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching written directives:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single written directive by ID
 */
export async function getWrittenDirective(
  directiveId: string
): Promise<WrittenDirective | null> {
  const { data, error } = await supabase
    .from("written_directives")
    .select("*")
    .eq("id", directiveId)
    .single();

  if (error) {
    console.error("Error fetching written directive:", error);
    return null;
  }

  return data;
}

/**
 * Delete a written directive
 */
export async function deleteWrittenDirective(
  directiveId: string
): Promise<void> {
  const { error } = await supabase
    .from("written_directives")
    .delete()
    .eq("id", directiveId);

  if (error) {
    console.error("Error deleting written directive:", error);
    throw error;
  }
}

/**
 * Check if a directive is overdue (today > tarikh_pematuhan_dikehendaki and status = Menunggu)
 */
export function isDirectiveOverdue(directive: WrittenDirective): boolean {
  if (!directive.tarikh_pematuhan_dikehendaki || directive.status_pematuhan !== "Menunggu") {
    return false;
  }

  const deadline = new Date(directive.tarikh_pematuhan_dikehendaki);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  return today > deadline;
}