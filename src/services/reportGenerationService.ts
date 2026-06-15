import { supabase } from "@/integrations/supabase/client";

interface ReportData {
  no_fail: string;
  nama_pemohon: string;
  alamat: string;
  kategori: string;
  tarikh_terima: string;
  ringkasan: string;
  ulasan: string;
  syor: string;
  pegawai: string;
  tarikh: string;
}

export const reportGenerationService = {
  /**
   * Get all active report templates
   */
  async getTemplates() {
    const { data, error } = await supabase
      .from("report_templates")
      .select("*")
      .eq("is_active", true)
      .order("template_name");

    if (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch application data for report generation
   */
  async fetchApplicationData(applicationId: string): Promise<ReportData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get application details
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("no_fail_jpl, nama_sp, tarikh_lengkap_diterima_osc, skala_pembangunan, mukim")
      .eq("id", applicationId)
      .single();

    if (appError) throw appError;

    // Get land lot information for address
    const { data: landLots } = await supabase
      .from("land_lots")
      .select("no_lot")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    const lotNumbers = landLots?.map(lot => lot.no_lot).join(", ") || "";
    const alamat = lotNumbers && application.mukim 
      ? `${lotNumbers}, ${application.mukim}`
      : lotNumbers || application.mukim || "";

    // Get latest review
    const { data: reviews } = await supabase
      .from("reviews")
      .select("ringkasan_ulasan, cadangan_kepada_osc, keputusan_semakan")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestReview = reviews?.[0];

    // Get current user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    return {
      no_fail: application.no_fail_jpl || "",
      nama_pemohon: application.nama_sp || "",
      alamat,
      kategori: application.skala_pembangunan || "",
      tarikh_terima: application.tarikh_lengkap_diterima_osc 
        ? new Date(application.tarikh_lengkap_diterima_osc).toLocaleDateString("ms-MY", {
            day: "numeric",
            month: "long",
            year: "numeric"
          })
        : "",
      ringkasan: latestReview?.ringkasan_ulasan || "",
      ulasan: latestReview?.cadangan_kepada_osc || "",
      syor: latestReview?.keputusan_semakan || "",
      pegawai: profile?.full_name || "",
      tarikh: new Date().toLocaleDateString("ms-MY", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    };
  },

  /**
   * Merge template with application data
   */
  mergeTemplate(templateContent: string, data: ReportData): string {
    let merged = templateContent;

    merged = merged.replace(/\[NO_FAIL\]/g, data.no_fail);
    merged = merged.replace(/\[NAMA_PEMOHON\]/g, data.nama_pemohon);
    merged = merged.replace(/\[ALAMAT\]/g, data.alamat);
    merged = merged.replace(/\[KATEGORI\]/g, data.kategori);
    merged = merged.replace(/\[TARIKH_TERIMA\]/g, data.tarikh_terima);
    merged = merged.replace(/\[RINGKASAN\]/g, data.ringkasan);
    merged = merged.replace(/\[ULASAN\]/g, data.ulasan);
    merged = merged.replace(/\[SYOR\]/g, data.syor);
    merged = merged.replace(/\[PEGAWAI\]/g, data.pegawai);
    merged = merged.replace(/\[TARIKH\]/g, data.tarikh);

    return merged;
  },

  /**
   * Save generated report
   */
  async saveReport(
    applicationId: string,
    templateId: string,
    reportType: string,
    reportContent: string,
    status: "Draf" | "Muktamad"
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("generated_reports")
      .insert({
        application_id: applicationId,
        template_id: templateId,
        report_type: reportType,
        report_content: reportContent,
        generated_by: user.id,
        status,
        is_finalized: status === "Muktamad"
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving report:", error);
      throw error;
    }

    return data;
  },

  /**
   * Update existing report
   */
  async updateReport(
    reportId: string,
    reportContent: string,
    status: "Draf" | "Muktamad"
  ) {
    const { data, error } = await supabase
      .from("generated_reports")
      .update({
        report_content: reportContent,
        status,
        is_finalized: status === "Muktamad",
        updated_at: new Date().toISOString()
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      console.error("Error updating report:", error);
      throw error;
    }

    return data;
  },

  /**
   * Get all generated reports for an application
   */
  async getGeneratedReports(applicationId: string) {
    const { data, error } = await supabase
      .from("generated_reports")
      .select(`
        *,
        report_templates:template_id (template_name, template_type),
        profiles:generated_by (full_name)
      `)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching generated reports:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Delete a generated report
   */
  async deleteReport(reportId: string) {
    const { error } = await supabase
      .from("generated_reports")
      .delete()
      .eq("id", reportId);

    if (error) throw error;
  },

  async createReport(params: {
    application_id: string;
    report_type: string;
    report_content: any;
    status: string;
    generated_by: string;
  }) {
    const { data, error } = await supabase
      .from("generated_reports")
      .insert({
        application_id: params.application_id,
        report_type: params.report_type,
        report_content: params.report_content,
        status: params.status,
        generated_by: params.generated_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};