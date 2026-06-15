import { supabase } from "@/integrations/supabase/client";
import { workflowService } from "./workflowService";

export interface BahagianBData {
  // b_a: Maklumat Asas
  b_a_i_lots: Array<{ no_lot: string; mukim: string }>; // No. Lot / Hakmilik
  b_a_ii_pemilik: string; // Pemilik
  b_a_iii_pemohon: string; // Pemohon
  b_a_iv_luas: string; // Luas Lot
  b_a_v_syarat_nyata: string; // Syarat Nyata
  b_a_vi_syarat_khas: string; // Syarat Khas
  
  // b_b: Gadaian
  b_b_gadaian: string;
  
  // b_c: Pengesahan Pelan
  b_c_pengesahan_pelan: "YA" | "TIDAK" | null;
  
  // b_d: Akses
  b_d_akses: string;
  
  // b_e: Aktiviti Sedia Ada
  b_e_aktiviti: string;
  
  // Lawatan Tapak
  tarikh_lawatan: string;
  masa_lawatan: string;
}

export const laporanTeknikalService = {
  /**
   * Get laporan teknikal for an application
   */
  async getLaporanTeknikal(applicationId: string) {
    const { data, error } = await supabase
      .from("laporan_teknikal")
      .select("*")
      .eq("application_id", applicationId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching laporan teknikal:", error);
      throw error;
    }

    return data;
  },

  /**
   * Get application data for pre-filling the form
   */
  async getApplicationData(applicationId: string) {
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("no_permohonan_osc, nama_pemaju_pemilik, nama_sp")
      .eq("id", applicationId)
      .single();

    if (appError) {
      console.error("Error fetching application:", appError);
      throw appError;
    }

    // Get land lots
    const { data: landLots, error: lotError } = await supabase
      .from("land_lots")
      .select("no_lot, mukim, syarat_nyata")
      .eq("application_id", applicationId);

    if (lotError) {
      console.error("Error fetching land lots:", lotError);
    }

    return {
      application,
      landLots: landLots || [],
    };
  },

  /**
   * Create or update laporan teknikal
   */
  async saveLaporanTeknikal(
    applicationId: string,
    data: {
      no_rujukan_fail?: string;
      is_kmt?: boolean;
      status_laporan?: string;
      bahagian_a?: string;
      bahagian_b?: BahagianBData;
      bahagian_c?: any;
      bahagian_d?: any;
      bahagian_e?: any;
      bahagian_f?: any;
      bahagian_g?: any;
      ulasan_syor_f?: string;
      ulasan_syor_g?: string;
      disediakan_oleh?: string;
      jawatan_penyedia?: string;
      tarikh_disediakan?: string;
    }
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if laporan exists
    const existing = await this.getLaporanTeknikal(applicationId);

    let result;
    if (existing) {
      // Update existing
      const { data: updated, error } = await supabase
        .from("laporan_teknikal")
        .update({
          ...data,
          bahagian_b: data.bahagian_b as any,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating laporan teknikal:", error);
        throw error;
      }
      result = updated;
    } else {
      // Create new
      const { data: created, error } = await supabase
        .from("laporan_teknikal")
        .insert({
          application_id: applicationId,
          ...data,
          bahagian_b: data.bahagian_b as any,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating laporan teknikal:", error);
        throw error;
      }
      result = created;
    }

    // Create workflow history entry using updateStatus
    await workflowService.updateStatus(
      applicationId,
      "technical_report" as any,
      "Laporan Teknikal — Bahagian A & B Disimpan"
    );

    return result;
  },

  /**
   * Update status laporan
   */
  async updateStatus(laporanId: string, status: string) {
    const { error } = await supabase
      .from("laporan_teknikal")
      .update({ status_laporan: status })
      .eq("id", laporanId);

    if (error) {
      console.error("Error updating status:", error);
      throw error;
    }

    return true;
  },

  /**
   * Delete laporan teknikal
   */
  async deleteLaporanTeknikal(laporanId: string) {
    const { error } = await supabase
      .from("laporan_teknikal")
      .delete()
      .eq("id", laporanId);

    if (error) {
      console.error("Error deleting laporan teknikal:", error);
      throw error;
    }

    return true;
  },
};