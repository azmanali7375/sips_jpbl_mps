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
  nama_pemohon?: string;
  tajuk_permohonan?: string;
  alamat_pemohon?: string;
  yang_dipertua_name?: string;
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
    nama_pemohon: formData.nama_pemohon || null,
    tajuk_permohonan: formData.tajuk_permohonan || null,
    alamat_pemohon: formData.alamat_pemohon || null,
    yang_dipertua_name: formData.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah",
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

/**
 * Generate Borang A(1) PDF HTML
 */
export function generateDirectivePDF(directive: WrittenDirective): string {
  const dateFormatted = new Date(directive.tarikh_dikeluarkan).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate 1 week deadline for plan return
  const planReturnDate = new Date(directive.tarikh_dikeluarkan);
  planReturnDate.setDate(planReturnDate.getDate() + 7);
  const planReturnDateFormatted = planReturnDate.toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Format compliance deadline (tarikh_pematuhan_dikehendaki)
  const complianceDeadline = directive.tarikh_pematuhan_dikehendaki
    ? new Date(directive.tarikh_pematuhan_dikehendaki).toLocaleDateString("ms-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // Format address lines
  const addressLines = directive.alamat_pemohon
    ? directive.alamat_pemohon.split("\n").map((line) => `<div>${line}</div>`).join("")
    : "";

  // Format directives as numbered list
  const directiveContent = directive.arahan || directive.directive_content || "";
  const directivesList = directiveContent
    .split("\n")
    .filter((line) => line.trim())
    .map((line, idx) => `<p>${idx + 1}. ${line}</p>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Borang A(1) - Arahan Bertulis</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      margin: 30px 50px;
      color: #000;
    }
    .letterhead {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 3px solid #000;
      padding-bottom: 10px;
    }
    .letterhead h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 5px 0;
    }
    .letterhead p {
      font-size: 9pt;
      margin: 2px 0;
    }
    .header-block {
      text-align: center;
      margin: 30px 0 20px 0;
      font-weight: bold;
    }
    .header-block div {
      margin: 3px 0;
    }
    .form-title {
      font-size: 14pt;
      margin: 5px 0;
    }
    .reference {
      text-align: right;
      margin: 20px 0;
    }
    .address-block {
      margin: 20px 0;
    }
    .body-text {
      text-align: justify;
      margin: 15px 0;
    }
    .body-text p {
      margin: 10px 0;
    }
    .signature-block {
      margin-top: 40px;
      display: table;
      width: 100%;
    }
    .signature-left {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .signature-right {
      display: table-cell;
      width: 50%;
      text-align: center;
      vertical-align: top;
      padding-top: 60px;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 200px;
      margin: 0 auto 5px auto;
    }
    .asterisk-note {
      text-align: center;
      font-style: italic;
      font-size: 10pt;
      margin-top: 10px;
    }
    .lampiran {
      page-break-before: always;
      margin-top: 50px;
    }
    .lampiran h2 {
      text-align: center;
      font-size: 14pt;
      margin-bottom: 20px;
    }
    .lampiran-content {
      margin: 20px 0;
    }
    .lampiran-content p {
      margin: 8px 0;
      text-align: justify;
    }
    @media print {
      body { margin: 20px 40px; }
      .lampiran { page-break-before: always; }
    }
  </style>
</head>
<body>
  <!-- Letterhead -->
  <div class="letterhead">
    <h1>MAJLIS PERBANDARAN SEGAMAT</h1>
    <p>NO. 1, JALAN ABDULLAH, 85000 SEGAMAT, JOHOR DARUL TA'ZIM</p>
    <p>Tel: 07-9312222 | Faks: 07-9324888 | Email: mps@mps.gov.my | www.mps.gov.my</p>
  </div>

  <!-- Header Block -->
  <div class="header-block">
    <div>JADUAL PERTAMA</div>
    <div>AKTA PERANCANGAN BANDAR DAN DESA 1976</div>
    <div>KAEDAH-KAEDAH PENGAWALAN PERANCANGAN (AM) 2008</div>
    <div>NEGERI JOHOR</div>
    <div style="margin-top: 15px;" class="form-title">BORANG A(1)</div>
    <div style="margin-top: 10px;">ARAHAN BERTULIS</div>
    <div style="font-size: 11pt; margin-top: 5px;">[Subkaedah 2(3)]</div>
    <div style="font-size: 11pt; font-weight: normal; margin-top: 5px;">Mengikut</div>
    <div style="font-size: 11pt;">Seksyen 21(3) Akta Perancangan Bandar dan Desa, 1976</div>
  </div>

  <!-- Reference -->
  <div class="reference">
    <strong>No. Rujukan:</strong> MPS/JPL.600-3/${directive.directive_number || ""}
  </div>

  <!-- Address Block -->
  <div class="address-block">
    <div><strong>Kepada,</strong></div>
    <div style="margin-top: 10px;">
      <strong>${directive.nama_pemohon || "[NAMA PEMOHON]"}</strong><br>
      ${addressLines || "[ALAMAT PEMOHON]"}
    </div>
  </div>

  <!-- Body Text -->
  <div class="body-text">
    <p>
      Setelah membuat semakan ke atas permohonan tuan dan mengambil kira perkara-perkara yang 
      dikehendaki oleh undang-undang, keperluan teknikal serta dokumen rancangan pemajuan yang ada, 
      arahan bertulis seperti di Lampiran A dengan ini dikenakan kepada <strong>${directive.nama_pemohon || "[NAMA PEMOHON]"}</strong> 
      beralamat ${directive.alamat_pemohon || "[ALAMAT]"} bagi tujuan <strong>${directive.tajuk_permohonan || "[TAJUK PERMOHONAN]"}</strong>
    </p>

    <p>
      2. Tuan dikehendaki mengembalikan rancangan (pelan) yang dipinda dalam tempoh <strong>satu (1) minggu</strong> 
      dari tarikh notis ini dikeluarkan. Kegagalan untuk menyampaikan semula rancangan (pelan) yang telah 
      dipinda dalam tempoh tersebut atau tempoh kebenaran yang dilanjutkan, permohonan kebenaran 
      merancang itu disifatkan telah ditarik balik.
    </p>
  </div>

  <!-- Signature Block -->
  <div class="signature-block">
    <div class="signature-left">
      <div><strong>Tarikh:</strong> ${dateFormatted}</div>
    </div>
    <div class="signature-right">
      <div class="signature-line"></div>
      <div>(${directive.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah"})</div>
      <div><strong>Yang Dipertua</strong></div>
      <div>Majlis Perbandaran Segamat</div>
    </div>
  </div>

  <!-- Asterisk Note -->
  <div class="asterisk-note">
    *Potong mana yang tidak berkenaan*
  </div>

  <!-- Lampiran A -->
  <div class="lampiran">
    <h2>LAMPIRAN A</h2>
    <div style="text-align: center; margin-bottom: 20px;">
      <strong>ARAHAN BERTULIS</strong><br>
      (No. Rujukan: MPS/JPL.600-3/${directive.directive_number || ""})
    </div>
    
    <div class="lampiran-content">
      ${directivesList}
    </div>

    ${complianceDeadline ? `
    <div style="margin-top: 30px;">
      <p><strong>Tarikh pematuhan penuh:</strong> ${complianceDeadline}</p>
      <p style="font-size: 10pt; font-style: italic;">
        (Tarikh akhir untuk mengembalikan pelan yang telah dipinda mengikut semua arahan di atas)
      </p>
    </div>
    ` : ""}
  </div>
</body>
</html>`;

  return html;
}