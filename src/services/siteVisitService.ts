import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const siteVisitService = {
  // Create a new site visit
  async createSiteVisit(
    applicationId: string,
    visitDate: string,
    observations: string
  ): Promise<Tables<"site_visits"> | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("site_visits")
      .insert({
        application_id: applicationId,
        officer_id: user.id,
        visit_date: visitDate,
        observations: observations,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating site visit:", error);
      return null;
    }

    return data;
  },

  // Upload site photos
  async uploadSitePhoto(
    siteVisitId: string,
    file: File,
    caption?: string,
    location?: string
  ): Promise<boolean> {
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${siteVisitId}/${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from("site-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("site-photos")
        .getPublicUrl(fileName);

      // Save photo record
      const { error: dbError } = await supabase.from("site_photos").insert({
        site_visit_id: siteVisitId,
        photo_url: urlData.publicUrl,
        caption: caption || undefined,
        location_description: location || undefined,
      });

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error("Error uploading site photo:", error);
      return false;
    }
  },

  // Get site visits for an application
  async getSiteVisits(applicationId: string): Promise<Tables<"site_visits">[]> {
    const { data, error } = await supabase
      .from("site_visits")
      .select("*, profiles!site_visits_officer_id_fkey(full_name, role)")
      .eq("application_id", applicationId)
      .order("visit_date", { ascending: false });

    if (error) {
      console.error("Error fetching site visits:", error);
      return [];
    }

    return data || [];
  },

  // Get photos for a site visit
  async getSitePhotos(siteVisitId: string): Promise<Tables<"site_photos">[]> {
    const { data, error } = await supabase
      .from("site_photos")
      .select("*")
      .eq("site_visit_id", siteVisitId)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("Error fetching site photos:", error);
      return [];
    }

    return data || [];
  },

  // Complete site visit
  async completeSiteVisit(siteVisitId: string): Promise<boolean> {
    const { error } = await supabase
      .from("site_visits")
      .update({ is_completed: true })
      .eq("id", siteVisitId);

    if (error) {
      console.error("Error completing site visit:", error);
      return false;
    }

    return true;
  },
};