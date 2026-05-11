import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ReportType = 
  | "technical_report"
  | "recommendation_report"
  | "written_directive"
  | "form_c1"
  | "form_c2";

export interface ReportTemplate {
  type: ReportType;
  name: string;
  sections: string[];
  required_data: string[];
}

export interface GenerateReportParams {
  application_id: string;
  report_type: ReportType;
  additional_data?: Record<string, unknown>;
}

export interface TechnicalReportData {
  application: Tables<"applications">;
  site_visit?: Tables<"site_visits">;
  compliance_checks: Tables<"compliance_checks">[];
  policy_references: string[];
}

export interface RecommendationReportData {
  application: Tables<"applications">;
  review: Tables<"reviews">;
  site_visit?: Tables<"site_visits">;
  recommendations: string[];
}

/**
 * Get all available report templates
 */
export async function getReportTemplates() {
  const { data, error } = await supabase
    .from("report_templates")
    .select("*")
    .order("type");

  if (error) {
    console.error("Error fetching report templates:", error);
    throw error;
  }

  return data;
}

/**
 * Get report template by type
 */
export async function getReportTemplate(type: ReportType) {
  const { data, error } = await supabase
    .from("report_templates")
    .select("*")
    .eq("type", type)
    .single();

  if (error) {
    console.error("Error fetching report template:", error);
    throw error;
  }

  return data;
}

/**
 * Gather data for technical report generation
 */
export async function gatherTechnicalReportData(
  application_id: string
): Promise<TechnicalReportData> {
  // Fetch application data
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("*, profiles!applications_applicant_id_fkey(full_name, email)")
    .eq("id", application_id)
    .single();

  if (appError) throw appError;

  // Fetch site visit data
  const { data: site_visit } = await supabase
    .from("site_visits")
    .select("*")
    .eq("application_id", application_id)
    .single();

  // Fetch compliance checks
  const { data: compliance_checks, error: compError } = await supabase
    .from("compliance_checks")
    .select("*")
    .eq("application_id", application_id);

  if (compError) throw compError;

  // Policy references (hardcoded for now, could be from database)
  const policy_references = [
    "Rancangan Fizikal Negara (RFN) 2040",
    "Rancangan Struktur Negeri (RSN) Johor 2020-2030",
    "Rancangan Tempatan Daerah (RTD) Segamat 2025-2035",
    "Pelan Tindakan Perubahan Iklim MPS Segamat",
    "Pelan Bandar Pintar MPS Segamat",
    "Peta Jalan SDG MPS Segamat"
  ];

  return {
    application,
    site_visit: site_visit || undefined,
    compliance_checks: compliance_checks || [],
    policy_references
  };
}

/**
 * Gather data for recommendation report
 */
export async function gatherRecommendationReportData(
  application_id: string
): Promise<RecommendationReportData> {
  // Fetch application data
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("*, profiles!applications_applicant_id_fkey(full_name, email)")
    .eq("id", application_id)
    .single();

  if (appError) throw appError;

  // Fetch review data
  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .select("*")
    .eq("application_id", application_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (reviewError && reviewError.code !== "PGRST116") throw reviewError;

  // Fetch site visit data
  const { data: site_visit } = await supabase
    .from("site_visits")
    .select("*")
    .eq("application_id", application_id)
    .single();

  return {
    application,
    review: review!,
    site_visit: site_visit || undefined,
    recommendations: review?.recommendations || []
  };
}

/**
 * Generate technical report content
 */
export function generateTechnicalReportContent(data: TechnicalReportData): string {
  const { application, site_visit, compliance_checks, policy_references } = data;

  let content = `# LAPORAN TEKNIKAL
# JABATAN PERANCANG BANDAR & LANDSKAP
# MAJLIS PERBANDARAN SEGAMAT

## 1. MAKLUMAT PERMOHONAN

**Nombor Rujukan:** ${application.reference_number}
**Tarikh Permohonan:** ${new Date(application.created_at).toLocaleDateString("ms-MY")}
**Jenis Permohonan:** ${application.application_type}
**Status:** ${application.status}

**Pemohon:** ${application.profiles?.full_name || "N/A"}
**Emel:** ${application.profiles?.email || "N/A"}

**Lokasi:** ${application.location || "N/A"}
**Lot/PT:** ${application.lot_number || "N/A"}
**Mukim:** ${application.mukim || "N/A"}
**Daerah:** Segamat, Johor

**Keluasan Tapak:** ${application.site_area || "N/A"} m²
**Zon:** ${application.zone || "N/A"}

## 2. PERIHAL PEMBANGUNAN

${application.development_description || "Tiada maklumat perihal pembangunan."}

## 3. LAWATAN TAPAK

`;

  if (site_visit) {
    content += `**Tarikh Lawatan:** ${new Date(site_visit.visit_date).toLocaleDateString("ms-MY")}
**Pegawai:** ${site_visit.officer_name}

**Pemerhatian:**
${site_visit.observations || "Tiada pemerhatian khusus."}

**Keadaan Tapak:** ${site_visit.site_conditions || "N/A"}
**Akses:** ${site_visit.access_conditions || "N/A"}
**Kemudahan Sekitar:** ${site_visit.surrounding_facilities || "N/A"}

`;
  } else {
    content += "Lawatan tapak belum dilaksanakan.\n\n";
  }

  content += `## 4. PEMATUHAN GARIS PANDUAN

`;

  if (compliance_checks.length > 0) {
    compliance_checks.forEach((check) => {
      const status = check.is_compliant ? "✓ PATUH" : "✗ TIDAK PATUH";
      content += `**${check.check_type}:** ${status}
${check.comments ? `Catatan: ${check.comments}` : ""}

`;
    });
  } else {
    content += "Semakan pematuhan belum dijalankan.\n\n";
  }

  content += `## 5. RUJUKAN DASAR DAN PERANCANGAN

Cadangan pembangunan ini dinilai berdasarkan dasar dan dokumen perancangan berikut:

`;

  policy_references.forEach((policy, index) => {
    content += `${index + 1}. ${policy}\n`;
  });

  content += `
## 6. ANALISIS TEKNIKAL

Berdasarkan lawatan tapak dan semakan pematuhan:
- Tapak berada dalam zon ${application.zone || "N/A"}
- Keluasan tapak adalah ${application.site_area || "N/A"} m²
- Cadangan pembangunan adalah untuk ${application.application_type}

## 7. PENUTUP

Laporan ini disediakan untuk tujuan semakan dan pertimbangan Ketua Jabatan Perancang Bandar & Landskap.

---
**Disediakan oleh:** Pembantu Perancang Bandar J5
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}
**Majlis Perbandaran Segamat**
`;

  return content;
}

/**
 * Generate recommendation report content (Laporan Syor)
 */
export function generateRecommendationReportContent(data: RecommendationReportData): string {
  const { application, review, site_visit } = data;

  let content = `# LAPORAN SYOR
# JABATAN PERANCANG BANDAR & LANDSKAP
# MAJLIS PERBANDARAN SEGAMAT

## 1. MAKLUMAT PERMOHONAN

**Nombor Rujukan:** ${application.reference_number}
**Jenis Permohonan:** ${application.application_type}
**Lokasi:** ${application.location || "N/A"}
**Lot/PT:** ${application.lot_number || "N/A"}
**Keluasan:** ${application.site_area || "N/A"} m²

**Pemohon:** ${application.profiles?.full_name || "N/A"}

## 2. RINGKASAN PEMBANGUNAN

${application.development_description || "Tiada maklumat."}

## 3. PENEMUAN TEKNIKAL

${site_visit?.observations || "Lawatan tapak belum dilaksanakan."}

## 4. SYOR KETUA JABATAN

${review?.recommendations || "Tiada syor khusus."}

**Status Semakan:** ${review?.status || "Dalam Proses"}
**Catatan:** ${review?.notes || "Tiada catatan tambahan."}

## 5. SYARAT DAN PERAKUAN

`;

  if (review?.status === "approved") {
    content += `Permohonan ini DISYORKAN untuk kelulusan tertakluk kepada syarat-syarat berikut:

1. Pelan yang dikemukakan hendaklah mematuhi semua garis panduan perancangan yang berkuat kuasa
2. Pemaju hendaklah mendapatkan kelulusan daripada Jabatan Teknikal yang berkaitan
3. Pelan bangunan yang lengkap hendaklah dikemukakan untuk kelulusan
4. Pembangunan hendaklah siap dalam tempoh yang ditetapkan

`;
  } else if (review?.status === "rejected") {
    content += `Permohonan ini TIDAK DISYORKAN untuk kelulusan atas sebab-sebab berikut:

${review?.notes || "Sebab penolakan tidak dinyatakan."}

`;
  } else {
    content += "Status kelulusan: Dalam proses semakan.\n\n";
  }

  content += `---
**Yang Benar,**

**Ketua Jabatan Perancang Bandar & Landskap**
**Majlis Perbandaran Segamat**
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}
`;

  return content;
}

/**
 * Generate written directive content (Arahan Bertulis)
 */
export function generateWrittenDirectiveContent(
  application: Tables<"applications">,
  amendments_required: string[]
): string {
  return `# ARAHAN BERTULIS
# MAJLIS PERBANDARAN SEGAMAT

**Rujukan:** ${application.reference_number}
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}

**Kepada:** ${application.profiles?.full_name || "Pemohon"}
**Alamat:** ${application.location || "N/A"}

**Perkara: Arahan Pindaan Pelan**

Tuan/Puan,

Dengan segala hormatnya perkara di atas adalah dirujuk.

2. Adalah dimaklumkan bahawa permohonan pembangunan tuan/puan bagi:
   - **Jenis Pembangunan:** ${application.application_type}
   - **Lokasi:** ${application.location || "N/A"}
   - **Lot/PT:** ${application.lot_number || "N/A"}

telah disemak oleh Jabatan Perancang Bandar & Landskap.

3. Berikut adalah pindaan yang dikehendaki:

${amendments_required.map((item, index) => `   ${index + 1}. ${item}`).join("\n")}

4. Tuan/Puan dikehendaki mengemukakan pelan yang dipinda dalam tempoh **14 hari** dari tarikh surat ini.

5. Kegagalan mengemukakan pelan yang dipinda dalam tempoh yang ditetapkan akan menyebabkan permohonan ini dibatalkan.

Sekian, terima kasih.

**Yang Benar,**

**..........................................**
**Ketua Jabatan Perancang Bandar & Landskap**
**Majlis Perbandaran Segamat**

untuk **YANG DI-PERTUA**
**MAJLIS PERBANDARAN SEGAMAT**
`;
}

/**
 * Generate Form C1 (Approval with Conditions)
 */
export function generateFormC1Content(
  application: Tables<"applications">,
  conditions: string[]
): string {
  return `# BORANG C1
# KELULUSAN PERANCANGAN BERSYARAT
# AKTA PERANCANGAN BANDAR DAN DESA 1976 (AKTA 172)

**Nombor Rujukan:** ${application.reference_number}
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}

**Kepada:** ${application.profiles?.full_name || "Pemohon"}

Tuan/Puan,

**KELULUSAN PERANCANGAN**

Adalah dimaklumkan bahawa permohonan tuan/puan bagi:

**Jenis Pembangunan:** ${application.application_type}
**Lokasi:** ${application.location || "N/A"}
**Lot/PT:** ${application.lot_number || "N/A"}
**Mukim:** ${application.mukim || "N/A"}
**Keluasan:** ${application.site_area || "N/A"} m²

telah **DILULUSKAN** oleh Mesyuarat Jawatankuasa Perancang (One Stop Centre) tertakluk kepada syarat-syarat berikut:

## SYARAT-SYARAT KELULUSAN

${conditions.map((condition, index) => `${index + 1}. ${condition}`).join("\n\n")}

## CATATAN PENTING

1. Kelulusan ini adalah sah selama **2 TAHUN** dari tarikh surat ini
2. Pembangunan hendaklah bermula dalam tempoh yang ditetapkan
3. Sebarang perubahan kepada pelan yang diluluskan memerlukan kelulusan baharu
4. Kelulusan ini tidak membebaskan pemohon daripada mendapatkan kelulusan lain yang diperlukan

Sekian, terima kasih.

**Yang Benar,**

**..........................................**
**Setiausaha Mesyuarat OSC**
**Majlis Perbandaran Segamat**

untuk **YANG DI-PERTUA**
**MAJLIS PERBANDARAN SEGAMAT**

---
**Salinan kepada:**
1. Fail
2. Pemohon
3. Jabatan Teknikal (untuk makluman)
`;
}

/**
 * Generate Form C2 (Rejection)
 */
export function generateFormC2Content(
  application: Tables<"applications">,
  rejection_reasons: string[]
): string {
  return `# BORANG C2
# PENOLAKAN PERMOHONAN PERANCANGAN
# AKTA PERANCANGAN BANDAR DAN DESA 1976 (AKTA 172)

**Nombor Rujukan:** ${application.reference_number}
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}

**Kepada:** ${application.profiles?.full_name || "Pemohon"}

Tuan/Puan,

**PENOLAKAN PERMOHONAN PERANCANGAN**

Dengan segala hormatnya saya diarah merujuk kepada perkara di atas.

2. Adalah dimaklumkan bahawa permohonan tuan/puan bagi:

**Jenis Pembangunan:** ${application.application_type}
**Lokasi:** ${application.location || "N/A"}
**Lot/PT:** ${application.lot_number || "N/A"}
**Mukim:** ${application.mukim || "N/A"}

telah **DITOLAK** oleh Mesyuarat Jawatankuasa Perancang (One Stop Centre) atas sebab-sebab berikut:

## ALASAN PENOLAKAN

${rejection_reasons.map((reason, index) => `${index + 1}. ${reason}`).join("\n\n")}

## HAK RAYUAN

3. Tuan/Puan berhak membuat rayuan kepada Lembaga Rayuan Negeri dalam tempoh **30 HARI** dari tarikh penerimaan surat ini.

4. Rayuan hendaklah dibuat secara bertulis dan dikemukakan kepada:

   **Setiausaha Lembaga Rayuan Negeri**
   Jabatan Perancang Bandar dan Desa Negeri Johor
   Aras 3, Bangunan Sultan Ibrahim
   80000 Johor Bahru, Johor

Sekian untuk makluman dan tindakan tuan/puan.

**Yang Benar,**

**..........................................**
**Setiausaha Mesyuarat OSC**
**Majlis Perbandaran Segamat**

untuk **YANG DI-PERTUA**
**MAJLIS PERBANDARAN SEGAMAT**

---
**Salinan kepada:**
1. Fail
2. Pemohon
3. Jabatan Perancang Bandar dan Desa Negeri Johor (untuk makluman)
`;
}

/**
 * Save generated report to database
 */
export async function saveGeneratedReport(
  application_id: string,
  report_type: ReportType,
  content: string,
  title: string
) {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      application_id,
      document_type: report_type,
      file_name: `${report_type}_${new Date().getTime()}.txt`,
      file_path: content, // Store content directly for now
      file_size: content.length,
      uploaded_by: (await supabase.auth.getSession()).data.session?.user.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving report:", error);
    throw error;
  }

  return data;
}

/**
 * Get generated reports for an application
 */
export async function getApplicationReports(application_id: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("application_id", application_id)
    .in("document_type", [
      "technical_report",
      "recommendation_report",
      "written_directive",
      "form_c1",
      "form_c2"
    ])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }

  return data;
}