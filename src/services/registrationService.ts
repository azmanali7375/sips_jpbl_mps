import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];
type WorkflowHistoryInsert = Database["public"]["Tables"]["workflow_history"]["Insert"];

export interface RegistrationFormData {
  // Section 1: Rujukan OSC
  no_permohonan_osc: string;
  kategori_permohonan?: string;
  skala_pembangunan: "Kecil" | "Sederhana" | "Besar A" | "Besar B";
  jenis_proses_pr: "Ya" | "Tidak";
  status_semakan_osc?: string;

  // Section 2: Tarikh Penting
  tarikh_penghantaran: string;
  tarikh_lengkap_diterima_osc: string;

  // Section 3: Maklumat Pemohon
  nama_sp: string;
  no_kp_sp?: string;
  nama_pemaju_pemilik?: string;

  // Section 4: Maklumat Pembangunan
  tajuk_permohonan: string;
  lokasi?: string;
  lokasi_mercu_tanda?: string;
  mukim?: string;
  daerah?: string;
  negeri?: string;
  rancangan_tempatan: "Ya" | "Tidak";
  zoning?: string;
  longitud?: number;
  latitud?: number;

  // Section 5: Penugasan Dalaman
  kategori?: string;
  assigned_to?: string;
  pegawai_bertanggungjawab?: string;
  status_dalaman: string;
  catatan_dalaman?: string;
  
  // External references
  no_rujukan_jkr?: string;
  no_rujukan_jps?: string;
  no_rujukan_tnb?: string;
  no_rujukan_telekom?: string;
  no_rujukan_pbt_lain?: string;
}

export interface RegistrationResponse {
  success: boolean;
  no_fail_jpl?: string;
  tarikh_kpi?: string;
  application_id?: string;
  error?: string;
}

/**
 * Calculate KPI deadline date (57 calendar days from tarikh_lengkap_diterima_osc)
 */
function calculateKPIDate(startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + 57);
  return date.toISOString().split("T")[0];
}

/**
 * Register a new KM application into SIPS
 */
export async function registerNewApplication(
  formData: RegistrationFormData,
  userId: string
): Promise<RegistrationResponse> {
  try {
    // Calculate KPI date
    const tarikh_kpi = calculateKPIDate(formData.tarikh_lengkap_diterima_osc);

    // Generate JPL file number using database function
    const { data: fileNumberData, error: fileNumberError } = await supabase.rpc(
      "generate_jpl_file_number"
    );

    if (fileNumberError) {
      console.error("Error generating JPL file number:", fileNumberError);
      return {
        success: false,
        error: "Gagal menjana nombor fail JPL",
      };
    }

    const no_fail_jpl = fileNumberData as string;

    // Extract additional fields from formData if they exist (from OSC import)
    const additionalFields = {
      kawasan_pembangunan_m2: (formData as any).kawasan_pembangunan_m2 || null,
      nisbah_plot: (formData as any).nisbah_plot || null,
      kawasan_lantai_kasar_m2: (formData as any).kawasan_lantai_kasar_m2 || null,
      bil_tempat_letak_kereta: (formData as any).bil_tempat_letak_kereta || null,
      bil_tempat_letak_motosikal: (formData as any).bil_tempat_letak_motosikal || null,
      bil_tempat_letak_oku: (formData as any).bil_tempat_letak_oku || null,
      bil_unit: (formData as any).bil_unit || null,
      bil_tingkat: (formData as any).bil_tingkat || null,
      ketinggian_bangunan_m: (formData as any).ketinggian_bangunan_m || null,
      jenis_guna_tanah: (formData as any).jenis_guna_tanah || null,
      komponen: (formData as any).komponen || null,
    };

    // Insert application record - jenis_aplikasi and kpi_hari will be auto-set by trigger
    const { data: appData, error: appError } = await supabase
      .from("applications")
      .insert({
        applicant_id: userId,
        no_permohonan_osc: formData.no_permohonan_osc.trim(),
        no_fail_jpl: no_fail_jpl,
        project_name: formData.tajuk_permohonan.trim(),
        location: formData.lokasi_mercu_tanda || formData.mukim || "Segamat",
        tarikh_penghantaran: formData.tarikh_penghantaran,
        tarikh_lengkap_diterima_osc: formData.tarikh_lengkap_diterima_osc,
        tarikh_kpi: tarikh_kpi,
        nama_sp: formData.nama_sp.trim(),
        nama_pemaju_pemilik: formData.nama_pemaju_pemilik?.trim() || formData.nama_sp.trim(),
        tajuk_permohonan: formData.tajuk_permohonan.trim(),
        mukim: formData.mukim?.trim() || null,
        daerah: "Segamat",
        skala_pembangunan: formData.skala_pembangunan,
        status: "pending",
        assigned_officer_id: formData.assigned_to || null,
        ...additionalFields,
      })
      .select()
      .single();

    if (appError) {
      console.error("Error inserting application:", appError);
      return {
        success: false,
        error: `Gagal mendaftar permohonan: ${appError.message}`,
      };
    }

    // Insert workflow history
    const workflowData: WorkflowHistoryInsert = {
      application_id: appData.id,
      to_status: "Diterima",
      changed_by: userId,
      comment: `Permohonan Didaftar dalam SIPS - No. OSC: ${formData.no_permohonan_osc}`,
    };

    const { error: workflowError } = await supabase
      .from("workflow_history")
      .insert(workflowData);

    if (workflowError) {
      console.error("Error inserting workflow history:", workflowError);
      // Don't fail the whole operation for workflow history
    }

    return {
      success: true,
      no_fail_jpl,
      tarikh_kpi,
      application_id: appData.id,
    };
  } catch (error) {
    console.error("Unexpected error during registration:", error);
    return {
      success: false,
      error: "Ralat tidak dijangka semasa pendaftaran",
    };
  }
}

/**
 * Get all officers (for assignment dropdown)
 */
export async function getOfficers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["officer", "head"])
    .order("full_name");

  if (error) {
    console.error("Error fetching officers:", error);
    return [];
  }

  return data || [];
}