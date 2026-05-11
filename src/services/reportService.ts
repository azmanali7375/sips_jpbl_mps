import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ReportType = 
  | "technical_report"
  | "recommendation_report"
  | "written_directive"
  | "form_c1"
  | "form_c2";

export interface TechnicalReportData {
  application: Tables<"applications"> & { profiles?: { full_name: string; email: string } };
  site_visit?: Tables<"site_visits">;
  reviews: Tables<"reviews">[];
  policy_references: string[];
}

export interface RecommendationReportData {
  application: Tables<"applications"> & { profiles?: { full_name: string; email: string } };
  review: Tables<"reviews">;
  site_visit?: Tables<"site_visits">;
}

/**
 * Get all available report templates
 */
export async function getReportTemplates() {
  const { data, error } = await supabase
    .from("report_templates")
    .select("*")
    .order("template_type");

  if (error) {
    console.error("Error fetching report templates:", error);
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

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("application_id", application_id)
    .order("created_at", { ascending: false });

  // Policy references
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
    reviews: reviews || [],
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
    site_visit: site_visit || undefined
  };
}

/**
 * Generate technical report content
 */
export function generateTechnicalReportContent(data: TechnicalReportData): string {
  const { application, site_visit, reviews, policy_references } = data;

  let content = `# LAPORAN TEKNIKAL
# JABATAN PERANCANG BANDAR & LANDSKAP
# MAJLIS PERBANDARAN SEGAMAT

## 1. MAKLUMAT PERMOHONAN

**Nombor Rujukan:** ${application.tracking_number}
**Tarikh Permohonan:** ${new Date(application.submitted_at || application.created_at).toLocaleDateString("ms-MY")}
**Jenis Projek:** ${application.project_type || "N/A"}
**Status:** ${application.status}

**Pemohon:** ${application.profiles?.full_name || "N/A"}
**Emel:** ${application.profiles?.email || "N/A"}

**Nama Projek:** ${application.project_name}
**Lokasi:** ${application.location}
**Lot/PT:** ${application.lot_number || "N/A"}
**Daerah:** Segamat, Johor

**Keluasan Tapak:** ${application.plot_area ? `${application.plot_area} m²` : "N/A"}
**Zon Guna Tanah:** ${application.land_use_zone || "N/A"}
**Plot Ratio:** ${application.plot_ratio || "N/A"}
**Ketinggian Bangunan:** ${application.building_height ? `${application.building_height}m` : "N/A"}

## 2. PERIHAL PEMBANGUNAN

Projek: ${application.project_name}
Jenis: ${application.project_type || "N/A"}
Lokasi: ${application.location}

## 3. LAWATAN TAPAK

`;

  if (site_visit) {
    content += `**Tarikh Lawatan:** ${new Date(site_visit.visit_date).toLocaleDateString("ms-MY")}

**Pemerhatian:**
${site_visit.observations || "Tiada pemerhatian khusus."}

**Nota Teknikal:**
${site_visit.technical_notes || "Tiada nota teknikal."}

**Keadaan Tapak:** ${site_visit.site_condition || "N/A"}
**Nota Akses:** ${site_visit.access_notes || "N/A"}
**Pembangunan Sekitar:** ${site_visit.surrounding_development || "N/A"}

`;
  } else {
    content += "Lawatan tapak belum dilaksanakan.\n\n";
  }

  content += `## 4. PEMATUHAN PARAMETER PERANCANGAN

**Plot Ratio:** ${application.plot_ratio || "N/A"}
**Ketinggian:** ${application.building_height || "N/A"}m
**Setback Hadapan:** ${application.setback_front || "N/A"}m
**Setback Belakang:** ${application.setback_rear || "N/A"}m
**Setback Sisi:** ${application.setback_side || "N/A"}m

`;

  if (reviews.length > 0) {
    content += `## 5. ULASAN PEGAWAI

`;
    reviews.forEach((review, index) => {
      content += `**Ulasan ${index + 1}:**
Keputusan: ${review.decision || "Pending"}
Komen: ${review.comment}

`;
    });
  }

  content += `## 6. RUJUKAN DASAR DAN PERANCANGAN

Cadangan pembangunan ini dinilai berdasarkan dasar dan dokumen perancangan berikut:

`;

  policy_references.forEach((policy, index) => {
    content += `${index + 1}. ${policy}\n`;
  });

  content += `
## 7. ANALISIS TEKNIKAL

Berdasarkan lawatan tapak dan semakan parameter:
- Tapak berada dalam zon guna tanah ${application.land_use_zone || "N/A"}
- Keluasan plot adalah ${application.plot_area || "N/A"} m²
- Cadangan pembangunan adalah untuk ${application.project_type || "pembangunan"}

## 8. PENUTUP

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

**Nombor Rujukan:** ${application.tracking_number}
**Jenis Projek:** ${application.project_type || "N/A"}
**Nama Projek:** ${application.project_name}
**Lokasi:** ${application.location}
**Lot/PT:** ${application.lot_number || "N/A"}
**Keluasan:** ${application.plot_area ? `${application.plot_area} m²` : "N/A"}

**Pemohon:** ${application.profiles?.full_name || "N/A"}

## 2. RINGKASAN PEMBANGUNAN

Projek ${application.project_name} di ${application.location} melibatkan pembangunan ${application.project_type || "N/A"} di atas tanah seluas ${application.plot_area || "N/A"} m².

## 3. PENEMUAN TEKNIKAL

${site_visit?.observations || "Lawatan tapak belum dilaksanakan."}

${site_visit?.technical_notes ? `\n**Nota Teknikal:**\n${site_visit.technical_notes}` : ""}

## 4. SYOR KETUA JABATAN

${review?.comment || "Tiada syor khusus."}

**Status Semakan:** ${review?.decision || "Pending"}
**Keputusan:** ${review?.decision === "approve" ? "DISYORKAN UNTUK DILULUSKAN" : review?.decision === "reject" ? "TIDAK DISYORKAN" : "DALAM PROSES"}

## 5. SYARAT DAN PERAKUAN

`;

  if (review?.decision === "approve") {
    content += `Permohonan ini DISYORKAN untuk kelulusan tertakluk kepada syarat-syarat berikut:

1. Pelan yang dikemukakan hendaklah mematuhi semua garis panduan perancangan yang berkuat kuasa
2. Pemaju hendaklah mendapatkan kelulusan daripada Jabatan Teknikal yang berkaitan
3. Pelan bangunan yang lengkap hendaklah dikemukakan untuk kelulusan
4. Pembangunan hendaklah siap dalam tempoh yang ditetapkan
5. Plot ratio, setback dan parameter lain hendaklah mematuhi garis panduan

`;
  } else if (review?.decision === "reject") {
    content += `Permohonan ini TIDAK DISYORKAN untuk kelulusan.

**Alasan:** ${review?.comment || "Sebab penolakan tidak dinyatakan."}

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
  application: Tables<"applications"> & { profiles?: { full_name: string } },
  amendments_required: string[]
): string {
  return `# ARAHAN BERTULIS
# MAJLIS PERBANDARAN SEGAMAT

**Rujukan:** ${application.tracking_number}
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}

**Kepada:** ${application.profiles?.full_name || "Pemohon"}
**Alamat:** ${application.location}

**Perkara: Arahan Pindaan Pelan**

Tuan/Puan,

Dengan segala hormatnya perkara di atas adalah dirujuk.

2. Adalah dimaklumkan bahawa permohonan pembangunan tuan/puan bagi:
   - **Projek:** ${application.project_name}
   - **Jenis Pembangunan:** ${application.project_type || "N/A"}
   - **Lokasi:** ${application.location}
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
  application: Tables<"applications"> & { profiles?: { full_name: string } },
  conditions: string[]
): string {
  return `# BORANG C1
# KELULUSAN PERANCANGAN BERSYARAT
# AKTA PERANCANGAN BANDAR DAN DESA 1976 (AKTA 172)

**Nombor Rujukan:** ${application.tracking_number}
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}

**Kepada:** ${application.profiles?.full_name || "Pemohon"}

Tuan/Puan,

**KELULUSAN PERANCANGAN**

Adalah dimaklumkan bahawa permohonan tuan/puan bagi:

**Projek:** ${application.project_name}
**Jenis Pembangunan:** ${application.project_type || "N/A"}
**Lokasi:** ${application.location}
**Lot/PT:** ${application.lot_number || "N/A"}
**Keluasan:** ${application.plot_area ? `${application.plot_area} m²` : "N/A"}

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
  application: Tables<"applications"> & { profiles?: { full_name: string } },
  rejection_reasons: string[]
): string {
  return `# BORANG C2
# PENOLAKAN PERMOHONAN PERANCANGAN
# AKTA PERANCANGAN BANDAR DAN DESA 1976 (AKTA 172)

**Nombor Rujukan:** ${application.tracking_number}
**Tarikh:** ${new Date().toLocaleDateString("ms-MY")}

**Kepada:** ${application.profiles?.full_name || "Pemohon"}

Tuan/Puan,

**PENOLAKAN PERMOHONAN PERANCANGAN**

Dengan segala hormatnya saya diarah merujuk kepada perkara di atas.

2. Adalah dimaklumkan bahawa permohonan tuan/puan bagi:

**Projek:** ${application.project_name}
**Jenis Pembangunan:** ${application.project_type || "N/A"}
**Lokasi:** ${application.location}
**Lot/PT:** ${application.lot_number || "N/A"}

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
  content: string
) {
  const session = await supabase.auth.getSession();
  
  const { data, error } = await supabase
    .from("generated_reports")
    .insert({
      application_id,
      report_type,
      report_content: content,
      generated_by: session.data.session?.user.id!,
      is_finalized: false
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
    .from("generated_reports")
    .select("*, profiles!generated_reports_generated_by_fkey(full_name)")
    .eq("application_id", application_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update generated report
 */
export async function updateGeneratedReport(
  report_id: string,
  content: string,
  is_finalized: boolean = false
) {
  const { data, error } = await supabase
    .from("generated_reports")
    .update({
      report_content: content,
      is_finalized,
      updated_at: new Date().toISOString()
    })
    .eq("id", report_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating report:", error);
    throw error;
  }

  return data;
}