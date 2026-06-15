import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Document = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];

export const JENIS_DOKUMEN_OPTIONS = [
  "Pelan Susun Atur",
  "Pelan Bangunan",
  "Pelan CAD",
  "Kebenaran Tanah",
  "Laporan Teknikal",
  "Surat Pemohon",
  "Dokumen OSC",
  "Lain-lain",
] as const;

export interface DocumentFormData {
  jenis_dokumen: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_extension?: string;
  file_size?: number;
  versi?: string;
  catatan?: string;
}

/**
 * Get all documents for an application, grouped by jenis_dokumen
 */
export async function getApplicationDocuments(
  applicationId: string
): Promise<Record<string, Document[]>> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      `
      *,
      uploaded_by_profile:uploaded_by(id, full_name, email)
    `
    )
    .eq("application_id", applicationId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }

  // Group by jenis_dokumen
  const grouped: Record<string, Document[]> = {};
  (data || []).forEach((doc) => {
    const category = doc.jenis_dokumen || "Lain-lain";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(doc);
  });

  return grouped;
}

/**
 * Upload a new document
 */
export async function uploadDocument(
  applicationId: string,
  formData: DocumentFormData,
  userId: string
): Promise<Document> {
  const documentData: DocumentInsert = {
    application_id: applicationId,
    file_name: formData.file_name,
    file_path: formData.file_path,
    file_type: formData.file_type,
    file_extension: formData.file_extension,
    file_size: formData.file_size,
    jenis_dokumen: formData.jenis_dokumen,
    versi: formData.versi,
    catatan: formData.catatan,
    uploaded_by: userId,
  };

  const { data, error } = await supabase
    .from("documents")
    .insert(documentData)
    .select()
    .single();

  if (error) {
    console.error("Error uploading document:", error);
    throw error;
  }

  // Insert workflow history
  await supabase.from("workflow_history").insert({
    application_id: applicationId,
    to_status: "Dokumen Dimuat Naik",
    changed_by: userId,
    comment: `Dokumen dimuat naik: ${formData.jenis_dokumen} - ${formData.file_name}`,
  });

  return data;
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Validate file type for document upload
 */
export function isValidFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  const validExtensions = ["pdf", "dwg", "dxf", "jpg", "jpeg", "png"];
  return validExtensions.includes(ext);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}