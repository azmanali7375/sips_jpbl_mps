import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type SiteVisit = Database["public"]["Tables"]["site_visits"]["Row"];
type SitePhoto = Database["public"]["Tables"]["site_photos"]["Row"];

export interface SiteVisitFormData {
  application_id: string;
  tarikh_lawatan: string;
  masa_lawatan?: string;
  pegawai_lawatan: string;
  tujuan_lawatan: string;
  penemuan?: string;
  tindakan_susulan?: string;
  status_lawatan: string;
}

export interface SitePhotoFormData {
  site_visit_id: string;
  photo_url: string;
  caption?: string;
  tarikh_gambar?: string;
}

export interface SiteVisitWithPhotos extends SiteVisit {
  site_photos?: SitePhoto[];
  officer?: {
    id: string;
    full_name: string;
    role: string;
  };
}

export const TUJUAN_LAWATAN_OPTIONS = [
  "Semakan Zon Tapak",
  "Pengesahan Setback",
  "Pemantauan Kepatuhan",
  "Lawatan Umum",
] as const;

export const STATUS_LAWATAN_OPTIONS = [
  "Dirancang",
  "Selesai",
  "Ditunda",
  "Dibatalkan",
] as const;

/**
 * Get all site visits for an application
 */
export async function getSiteVisits(
  applicationId: string
): Promise<SiteVisitWithPhotos[]> {
  const { data, error } = await supabase
    .from("site_visits")
    .select(`
      *,
      officer:officer_id(id, full_name, role),
      site_photos(*)
    `)
    .eq("application_id", applicationId)
    .order("visit_date", { ascending: false });

  if (error) {
    console.error("Error fetching site visits:", error);
    throw error;
  }

  return (data as unknown as SiteVisitWithPhotos[]) || [];
}

/**
 * Get a single site visit by ID
 */
export async function getSiteVisit(
  visitId: string
): Promise<SiteVisitWithPhotos | null> {
  const { data, error } = await supabase
    .from("site_visits")
    .select(`
      *,
      officer:officer_id(id, full_name, role),
      site_photos(*)
    `)
    .eq("id", visitId)
    .single();

  if (error) {
    console.error("Error fetching site visit:", error);
    throw error;
  }

  return data as unknown as SiteVisitWithPhotos;
}

/**
 * Create a new site visit
 */
export async function createSiteVisit(
  formData: SiteVisitFormData,
  userId: string
): Promise<SiteVisit> {
  const { data, error } = await supabase
    .from("site_visits")
    .insert({
      application_id: formData.application_id,
      officer_id: formData.pegawai_lawatan,
      visit_date: formData.tarikh_lawatan,
      masa_lawatan: formData.masa_lawatan || null,
      tujuan_lawatan: formData.tujuan_lawatan,
      penemuan: formData.penemuan || null,
      tindakan_susulan: formData.tindakan_susulan || null,
      status_lawatan: formData.status_lawatan,
      is_completed: formData.status_lawatan === "Selesai",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating site visit:", error);
    throw error;
  }

  // Create workflow history entry
  await supabase.from("workflow_history").insert({
    application_id: formData.application_id,
    to_status: `Lawatan Tapak (${formData.status_lawatan})`,
    changed_by: userId,
    comment: `Lawatan tapak didaftarkan - ${formData.tujuan_lawatan}. Tarikh: ${formData.tarikh_lawatan}`,
  });

  return data;
}

/**
 * Update an existing site visit
 */
export async function updateSiteVisit(
  visitId: string,
  formData: Partial<SiteVisitFormData>,
  userId: string
): Promise<SiteVisit> {
  const updateData: any = {};

  if (formData.tarikh_lawatan) updateData.visit_date = formData.tarikh_lawatan;
  if (formData.masa_lawatan !== undefined) updateData.masa_lawatan = formData.masa_lawatan || null;
  if (formData.pegawai_lawatan) updateData.officer_id = formData.pegawai_lawatan;
  if (formData.tujuan_lawatan) updateData.tujuan_lawatan = formData.tujuan_lawatan;
  if (formData.penemuan !== undefined) updateData.penemuan = formData.penemuan || null;
  if (formData.tindakan_susulan !== undefined) updateData.tindakan_susulan = formData.tindakan_susulan || null;
  if (formData.status_lawatan) {
    updateData.status_lawatan = formData.status_lawatan;
    updateData.is_completed = formData.status_lawatan === "Selesai";
  }

  const { data, error } = await supabase
    .from("site_visits")
    .update(updateData)
    .eq("id", visitId)
    .select()
    .single();

  if (error) {
    console.error("Error updating site visit:", error);
    throw error;
  }

  // Get application_id for workflow history
  if (formData.application_id) {
    await supabase.from("workflow_history").insert({
      application_id: formData.application_id,
      to_status: `Lawatan Tapak Dikemaskini (${formData.status_lawatan})`,
      changed_by: userId,
      comment: `Lawatan tapak dikemaskini`,
    });
  }

  return data;
}

/**
 * Upload site photo
 */
export async function uploadSitePhoto(
  formData: SitePhotoFormData
): Promise<SitePhoto> {
  const { data, error } = await supabase
    .from("site_photos")
    .insert({
      site_visit_id: formData.site_visit_id,
      photo_url: formData.photo_url,
      caption: formData.caption || null,
      tarikh_gambar: formData.tarikh_gambar || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    console.error("Error uploading site photo:", error);
    throw error;
  }

  return data;
}

/**
 * Delete site photo
 */
export async function deleteSitePhoto(photoId: string): Promise<void> {
  const { error } = await supabase
    .from("site_photos")
    .delete()
    .eq("id", photoId);

  if (error) {
    console.error("Error deleting site photo:", error);
    throw error;
  }
}

/**
 * Get available officers for assignment
 */
export async function getAvailableOfficersForVisit(): Promise<any[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["officer", "assistant_planner_j5", "department_head"])
    .order("full_name");

  if (error) {
    console.error("Error fetching officers:", error);
    return [];
  }

  return data || [];
}