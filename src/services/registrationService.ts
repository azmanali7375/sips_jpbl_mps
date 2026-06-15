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
  lokasi_mercu_tanda?: string;
  mukim?: string;
  daerah?: string;
  negeri?: string;
  rancangan_tempatan: "Ya" | "Tidak";
  zoning?: string;
  longitud?: number;
  latitud?: number;

  // Section 5: Penugasan Dalaman
  pegawai_bertanggungjawab?: string;
  status_dalaman: string;
  catatan_dalaman?: string;
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

    // Prepare application data
    const applicationData: ApplicationInsert = {
      no_fail_jpl,
      applicant_id: userId, // Officer registering on behalf of applicant
      project_name: formData.tajuk_permohonan,
      location: formData.lokasi_mercu_tanda || formData.mukim || "Segamat",
      no_permohonan_osc: formData.no_permohonan_osc,
      kategori_permohonan: formData.kategori_permohonan,
      skala_pembangunan: formData.skala_pembangunan,
      jenis_proses_pr: formData.jenis_proses_pr,
      status_semakan_osc: formData.status_semakan_osc,
      tarikh_penghantaran: formData.tarikh_penghantaran,
      tarikh_lengkap_diterima_osc: formData.tarikh_lengkap_diterima_osc,
      tarikh_kpi,
      nama_sp: formData.nama_sp,
      no_kp_sp: formData.no_kp_sp,
      nama_pemaju_pemilik: formData.nama_pemaju_pemilik,
      tajuk_permohonan: formData.tajuk_permohonan,
      lokasi_mercu_tanda: formData.lokasi_mercu_tanda,
      mukim: formData.mukim,
      daerah: formData.daerah || "Segamat",
      negeri: formData.negeri || "Johor",
      rancangan_tempatan: formData.rancangan_tempatan,
      zoning: formData.zoning,
      longitud: formData.longitud,
      latitud: formData.latitud,
      jabatan_memperaku: "Jabatan Perancangan Bandar & Desa (JPBL)",
      assigned_officer_id: formData.pegawai_bertanggungjawab || null,
      status_dalaman: formData.status_dalaman,
      catatan_dalaman: formData.catatan_dalaman,
      status: "Pending",
      submitted_at: new Date().toISOString(),
    };

    // Insert application
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert(applicationData)
      .select("id")
      .single();

    if (applicationError) {
      console.error("Error inserting application:", applicationError);
      return {
        success: false,
        error: `Gagal mendaftar permohonan: ${applicationError.message}`,
      };
    }

    // Insert workflow history
    const workflowData: WorkflowHistoryInsert = {
      application_id: application.id,
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
      application_id: application.id,
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