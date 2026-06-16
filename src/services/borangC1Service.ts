import { supabase } from "@/integrations/supabase/client";
import { auditLogService } from "./auditLogService";

export interface BorangC1Data {
  no_fail_jpl: string;
  no_permohonan_osc: string;
  nama_pemaju_pemilik: string;
  alamat_pemohon: string;
  tajuk_permohonan: string;
  no_mesyuarat: string;
  tarikh_mesyuarat_osc: string;
  no_pelan_lulus: string;
  tarikh_kelulusan: string;
  jenis_permohonan: string;
  yang_dipertua_name: string;
  syarat_kelulusan: string;
  additional_sk_recipients?: string[];
}

export const borangC1Service = {
  async checkPaymentStatus(applicationId: string): Promise<{
    canGenerate: boolean;
    message?: string;
    isPaid?: boolean;
    isExempt?: boolean;
  }> {
    // Check if application has osc_decision with Lulus
    const { data: decision } = await supabase
      .from("osc_decisions")
      .select("decision_type")
      .eq("application_id", applicationId)
      .eq("decision_type", "Lulus")
      .single();

    if (!decision) {
      return {
        canGenerate: false,
        message: "Tiada keputusan lulus OSC dijumpai",
      };
    }

    // Check caj_pemajuan status
    const { data: caj } = await supabase
      .from("caj_pemajuan")
      .select("status_caj")
      .eq("application_id", applicationId)
      .single();

    if (!caj) {
      return {
        canGenerate: false,
        message: "Rekod Caj Pemajuan tidak dijumpai. Sistem akan mewujudkannya secara automatik.",
      };
    }

    // Allow generation if paid or exempt
    if (caj.status_caj === "Dibayar") {
      return {
        canGenerate: true,
        isPaid: true,
      };
    }

    if (caj.status_caj === "Dikecualikan") {
      return {
        canGenerate: true,
        isExempt: true,
      };
    }

    // Block if not yet calculated or awaiting payment
    if (caj.status_caj === "Belum Dikira") {
      return {
        canGenerate: false,
        message: "Caj Pemajuan belum dikira. Sila kemukakan kepada JPPH untuk pengiraan.",
      };
    }

    if (caj.status_caj === "Menunggu Bayaran") {
      return {
        canGenerate: false,
        message: "Sila selesaikan pembayaran Caj Pemajuan dahulu. Jana Borang A (Notis Caj Pemajuan) terlebih dahulu.",
      };
    }

    return {
      canGenerate: false,
      message: "Status Caj Pemajuan tidak sah",
    };
  },

  async getC1Data(applicationId: string): Promise<BorangC1Data | null> {
    const { data: app, error } = await supabase
      .from("applications")
      .select(
        `
        no_fail_jpl,
        no_permohonan_osc,
        nama_pemaju_pemilik,
        tajuk_permohonan,
        osc_decisions!inner (
          decision_type,
          meeting_number,
          meeting_date,
          approval_conditions,
          no_pelan_lulus,
          tarikh_kelulusan,
          alamat_pemohon,
          jenis_permohonan,
          yang_dipertua_name,
          additional_sk_recipients
        )
      `
      )
      .eq("id", applicationId)
      .eq("osc_decisions.decision_type", "Lulus")
      .single();

    if (error || !app || !app.osc_decisions) {
      return null;
    }

    const decision = Array.isArray(app.osc_decisions) 
      ? app.osc_decisions[0] 
      : app.osc_decisions;

    return {
      no_fail_jpl: app.no_fail_jpl || "",
      no_permohonan_osc: app.no_permohonan_osc || "",
      nama_pemaju_pemilik: app.nama_pemaju_pemilik || "",
      alamat_pemohon: decision.alamat_pemohon || "",
      tajuk_permohonan: app.tajuk_permohonan || "",
      no_mesyuarat: decision.meeting_number || "",
      tarikh_mesyuarat_osc: decision.meeting_date || "",
      no_pelan_lulus: decision.no_pelan_lulus || "",
      tarikh_kelulusan: decision.tarikh_kelulusan || "",
      jenis_permohonan: decision.jenis_permohonan || "",
      yang_dipertua_name: decision.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah",
      syarat_kelulusan: decision.approval_conditions || "",
      additional_sk_recipients: decision.additional_sk_recipients || [],
    };
  },

  generateC1HTML(data: BorangC1Data): string {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("ms-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const formatDateShort = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB");
    };

    // Calculate expiry date (12 months from approval for Pembinaan)
    let expiryText = "";
    if (data.jenis_permohonan === "Pembinaan" && data.tarikh_kelulusan) {
      const approvalDate = new Date(data.tarikh_kelulusan);
      const expiryDate = new Date(approvalDate);
      expiryDate.setMonth(expiryDate.getMonth() + 12);
      expiryText = `Kebenaran Merancang tersebut adalah dengan ini diberi dari tarikh ${formatDate(
        data.tarikh_kelulusan
      )} hingga ${formatDate(expiryDate.toISOString())}.`;
    }

    // Parse and format syarat_kelulusan
    const syaratLines = data.syarat_kelulusan
      .split("\n")
      .filter((line) => line.trim())
      .map((line, idx) => {
        const trimmed = line.trim();
        // If line doesn't start with a number, add it
        if (!/^\d+\./.test(trimmed)) {
          return `${idx + 1}. ${trimmed}`;
        }
        return trimmed;
      })
      .join("\n");

    // Build SK list
    const skRecipients = [
      "PLANMalaysia@Johor, Jabatan Perancang Bandar & Desa Negeri Johor, Kota Iskandar, Johor",
      "Pejabat Tanah dan Galian Negeri Johor",
      "Pentadbir Tanah Daerah, Pejabat Tanah Segamat",
      data.nama_pemaju_pemilik,
      "Jabatan Pengairan & Saliran Negeri Johor",
      "Jabatan Penilaian & Pengurusan Harta, MPS",
      "Ketua Unit OSC, MPS",
      ...(data.additional_sk_recipients || []),
    ];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Borang C(1) - ${data.no_fail_jpl}</title>
  <style>
    @page {
      margin: 20mm;
      size: A4;
    }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .letterhead {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
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
    .form-header {
      text-align: center;
      margin: 30px 0;
    }
    .form-header h2 {
      font-size: 12pt;
      font-weight: bold;
      margin: 8px 0;
    }
    .form-header p {
      font-size: 11pt;
      margin: 5px 0;
    }
    .ref-block {
      text-align: right;
      margin: 20px 0;
      font-size: 11pt;
    }
    .body-text {
      text-align: justify;
      margin: 20px 0;
      line-height: 1.8;
    }
    .body-text strong {
      font-weight: bold;
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
      text-align: left;
      vertical-align: top;
      padding-left: 40px;
    }
    .signature-line {
      margin-top: 60px;
      border-top: 1px solid #000;
      width: 200px;
    }
    .nota {
      margin-top: 30px;
      font-size: 10pt;
    }
    .nota ul {
      list-style-type: none;
      padding-left: 0;
    }
    .nota li {
      margin: 8px 0;
      padding-left: 15px;
      text-indent: -15px;
    }
    .page-break {
      page-break-before: always;
    }
    .lampiran-header {
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      margin: 30px 0 20px 0;
    }
    .lampiran-content {
      text-align: justify;
      white-space: pre-line;
      line-height: 1.8;
    }
    .sk-list {
      margin-top: 20px;
    }
    .sk-list ol {
      padding-left: 20px;
    }
    .sk-list li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Main Form -->
  <div class="letterhead">
    <h1>MAJLIS PERBANDARAN SEGAMAT</h1>
    <p>NO 1, JALAN ABDULLAH, 85000 SEGAMAT, JOHOR DARUL TA'ZIM</p>
    <p>Tel: 07-931 2222 | Faks: 07-931 4407 | Email: mps@mps.gov.my | www.mps.gov.my</p>
  </div>

  <div class="form-header">
    <h2>JADUAL PERTAMA</h2>
    <p>KAEDAH-KAEDAH PENGAWALAN PERANCANGAN (AM)</p>
    <p>(NEGERI JOHOR) (PINDAAN) 2014</p>
    <p>&nbsp;</p>
    <h2>BORANG C(1)</h2>
    <p>&nbsp;</p>
    <h2>KEBENARAN MERANCANG</h2>
    <p>[ Subkaedah 9(1) ]</p>
    <p>Mengikut</p>
    <p>Subseksyen 22(3) Akta Perancangan Bandar Dan Desa 1976</p>
  </div>

  <div class="ref-block">
    No. Rujukan : MPS/JPL:600-3/${data.no_fail_jpl.split("/").pop() || ""}<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(${
      data.no_permohonan_osc
    })
  </div>

  <div class="body-text">
    <p>
      KEBENARAN MERANCANG adalah dengan ini diberi kepada <strong>${
        data.nama_pemaju_pemilik
      }</strong> beralamat ${
      data.alamat_pemohon
    } bagi maksud <strong>${
      data.tajuk_permohonan
    }</strong> oleh Majlis Perbandaran Segamat seperti yang telah dipersetujui dalam Mesyuarat Jawatankuasa Pusat Setempat Bil. ${
      data.no_mesyuarat
    } bertarikh ${formatDate(
      data.tarikh_mesyuarat_osc
    )} sebagaimana yang ditunjukkan dalam pelan lulus ${data.no_pelan_lulus}.
    </p>

    ${expiryText ? `<p>${expiryText}</p>` : ""}

    <p>
      Semua syarat-syarat yang dilampirkan sepertimana LAMPIRAN A adalah terpakai dan berkuatkuasa kepada pemilik yang baru apabila berlakunya transaksi pemilikan terhadap cadangan pemajuan sebagaimana pelan yang dinyatakan.
    </p>

    <p>
      Pemberian Kebenaran Merancang ini adalah tertakluk kepada syarat-syarat seperti yang dilampirkan.
    </p>
  </div>

  <div class="signature-block">
    <div class="signature-left">
      <p>Tarikh: ${formatDateShort(data.tarikh_kelulusan)}</p>
      <p style="margin-top: 30px;">[METERAI RASMI]</p>
    </div>
    <div class="signature-right">
      <div class="signature-line"></div>
      <p style="margin-top: 5px;">(${data.yang_dipertua_name})</p>
      <p>Yang Dipertua</p>
      <p>Majlis Perbandaran Segamat</p>
    </div>
  </div>

  <div class="nota">
    <p><strong>Nota:</strong></p>
    <ul>
      <li>- Mengikut peruntukan perenggan 23(1)(a), tuan berhak membuat rayuan di atas keputusan yang dibuat oleh Pihak Berkuasa Perancang Tempatan dalam tempoh satu (1) bulan dari tarikh keputusan itu disampaikan.</li>
      <li>- Rayuan hendaklah dialamatkan kepada Pendaftar Lembaga Rayuan Negeri Johor.</li>
      <li>- Pemberitahuan hendaklah dibuat kepada agensi-agensi seperti di bawah; Jabatan Perancangan Bandar dan Desa Negeri; PTG; dan Agensi-agensi pelaksana yang berkaitan mengikut keperluan.</li>
    </ul>
  </div>

  <!-- PAGE 2+: LAMPIRAN A -->
  <div class="page-break">
    <div class="lampiran-header">
      LAMPIRAN A
    </div>

    <p style="text-align: center; font-weight: bold; margin: 20px 0;">
      SYARAT-SYARAT PERANCANGAN :
    </p>

    <p style="text-align: center; margin-bottom: 20px;">
      (No. Rujukan : MPS/JPL:600-3/${data.no_fail_jpl.split("/").pop() || ""})
    </p>

    <div class="lampiran-content">
${syaratLines}
    </div>
  </div>

  <!-- FINAL PAGE: S.K. -->
  <div class="page-break">
    <p style="font-weight: bold; margin: 20px 0;">S.K :</p>
    
    <div class="sk-list">
      <ol>
        ${skRecipients.map((recipient) => `<li>${recipient}</li>`).join("\n        ")}
      </ol>
    </div>
  </div>
</body>
</html>
`;
  },

  downloadC1PDF(html: string, filename: string) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Record C1 signature date (when YDP signs)
   */
  async recordC1SignatureDate(
    oscDecisionId: string,
    signatureDate: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("osc_decisions")
        .update({
          tarikh_tandatangan_c1: signatureDate,
        })
        .eq("id", oscDecisionId);

      if (error) throw error;

      // Get current user for audit
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Log to audit
      await auditLogService.log({
        user_id: user?.id || "",
        action: "C1_SIGNED",
        table_name: "osc_decisions",
        record_id: oscDecisionId,
        details: {
          tarikh_tandatangan: signatureDate,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error recording C1 signature date:", error);
      throw error;
    }
  },
};