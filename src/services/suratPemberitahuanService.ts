import { supabase } from "@/integrations/supabase/client";

export interface SuratPemberitahuanData {
  no_fail_jpl: string;
  tarikh_surat: string;
  nama_penerima: string; // consultant if available, else applicant
  alamat_penerima: string;
  tajuk_permohonan: string;
  no_mesyuarat: string;
  tarikh_mesyuarat_osc: string;
  jenis_surat: "Lulus" | "Tolak"; // C1 or C2
  yang_dipertua_name: string;
  initial_pegawai?: string;
  nama_pemohon?: string; // for S.K. if different from penerima
  alamat_pemohon?: string;
}

export const suratPemberitahuanService = {
  async getSuratData(
    applicationId: string,
    jenisSurat: "Lulus" | "Tolak"
  ): Promise<SuratPemberitahuanData | null> {
    const { data: app, error } = await supabase
      .from("applications")
      .select(
        `
        no_fail_jpl,
        nama_pemaju_pemilik,
        alamat_pemohon,
        tajuk_permohonan,
        consultant_name,
        consultant_address,
        osc_decisions!inner (
          decision_type,
          meeting_number,
          meeting_date,
          yang_dipertua_name
        )
      `
      )
      .eq("id", applicationId)
      .eq("osc_decisions.decision_type", jenisSurat)
      .single();

    if (error || !app || !app.osc_decisions) {
      return null;
    }

    const decision = Array.isArray(app.osc_decisions)
      ? app.osc_decisions[0]
      : app.osc_decisions;

    // Prefer consultant if available, otherwise use applicant
    const penerima = app.consultant_name || app.nama_pemaju_pemilik;
    const alamatPenerima = app.consultant_address || app.alamat_pemohon;

    return {
      no_fail_jpl: app.no_fail_jpl || "",
      tarikh_surat: new Date().toISOString().split("T")[0],
      nama_penerima: penerima || "",
      alamat_penerima: alamatPenerima || "",
      tajuk_permohonan: app.tajuk_permohonan || "",
      no_mesyuarat: decision.meeting_number || "",
      tarikh_mesyuarat_osc: decision.meeting_date || "",
      jenis_surat: jenisSurat,
      yang_dipertua_name: decision.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah",
      initial_pegawai: "HMH",
      nama_pemohon: app.nama_pemaju_pemilik,
      alamat_pemohon: app.alamat_pemohon,
    };
  },

  generateSuratHTML(data: SuratPemberitahuanData): string {
    // Format tarikh surat
    const tarikhFormatted = new Date(data.tarikh_surat).toLocaleDateString("ms-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Format tarikh mesyuarat
    const tarikhMesyuaratFormatted = new Date(data.tarikh_mesyuarat_osc).toLocaleDateString(
      "ms-MY",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

    // Format address lines
    const alamatLines = data.alamat_penerima
      .split("\n")
      .map((line) => `<div>${line}</div>`)
      .join("");

    // Determine paragraph 2 based on jenis_surat
    const paragraph2 =
      data.jenis_surat === "Lulus"
        ? `2. Adalah dimaklumkan Mesyuarat Jawatankuasa Pusat Setempat (OSC), MPS Bil. ${data.no_mesyuarat} yang bermesyuarat pada ${tarikhMesyuaratFormatted} telah bersetuju meluluskan permohonan di atas. Sila hadir ke Majlis Perbandaran Segamat dalam waktu pejabat (8.00pg-5ptg) untuk mengambil Borang C1.`
        : `2. Adalah dimaklumkan Mesyuarat Jawatankuasa Pusat Setempat (OSC), MPS Bil. ${data.no_mesyuarat} yang bermesyuarat pada ${tarikhMesyuaratFormatted} telah menolak permohonan di atas. Sila hadir ke Majlis Perbandaran Segamat dalam waktu pejabat (8.00pg-5ptg) untuk mengambil Borang C2.`;

    const fileReference =
      data.jenis_surat === "Lulus" ? "surat C1" : "surat C2";

    // S.K. section - show both applicant and consultant if different
    const skRecipients: string[] = [];
    if (data.nama_penerima !== data.nama_pemohon && data.nama_pemohon) {
      // Consultant is penerima, applicant goes in S.K.
      const alamatPemohonFormatted = data.alamat_pemohon
        ?.split("\n")
        .map((line) => `   ${line}`)
        .join("<br>");
      skRecipients.push(
        `1. ${data.nama_pemohon}<br>${alamatPemohonFormatted || ""}`
      );
      skRecipients.push("2. Pusat Setempat (OSC), MPS.");
    } else {
      // Applicant is penerima, only show OSC
      skRecipients.push(
        `1. ${data.nama_penerima}<br>${alamatLines.replace(
          /<div>/g,
          "   "
        ).replace(/<\/div>/g, "<br>")}`
      );
      skRecipients.push("2. Pusat Setempat (OSC), MPS.");
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Surat Pemberitahuan ${data.jenis_surat}</title>
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
    .date-block {
      text-align: right;
      margin: 20px 0;
      line-height: 1.4;
    }
    .recipient {
      margin: 20px 0;
    }
    .salutation {
      margin: 15px 0;
    }
    .subject {
      font-weight: bold;
      text-transform: uppercase;
      margin: 15px 0;
      text-decoration: underline;
    }
    .body-text {
      text-align: justify;
      margin: 15px 0;
    }
    .body-text p {
      margin: 10px 0;
    }
    .closing {
      margin-top: 20px;
    }
    .motto {
      text-align: center;
      font-weight: bold;
      margin: 15px 0;
    }
    .signature-block {
      margin-top: 40px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 200px;
      margin: 60px auto 5px auto;
    }
    .file-reference {
      margin-top: 30px;
      font-size: 10pt;
    }
    .sk-section {
      margin-top: 30px;
    }
    .sk-section p {
      margin: 5px 0;
    }
    @media print {
      body { margin: 20px 40px; }
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

  <!-- Date Block -->
  <div class="date-block">
    <div><strong>Ruj. Kami</strong> : MPS/JPL : ${data.no_fail_jpl}</div>
    <div><strong>Tarikh</strong>&nbsp;&nbsp;&nbsp;&nbsp;: ${tarikhFormatted}</div>
  </div>

  <!-- Recipient -->
  <div class="recipient">
    ${data.nama_penerima}<br>
    ${alamatLines}
  </div>

  <!-- Salutation -->
  <div class="salutation">
    Tuan/Puan,
  </div>

  <!-- Subject -->
  <div class="subject">
    ${data.tajuk_permohonan}
  </div>

  <!-- Body Text -->
  <div class="body-text">
    <p>Perkara diatas dirujuk dan berkaitan.</p>
    
    <p>${paragraph2}</p>
  </div>

  <!-- Closing -->
  <div class="closing">
    <p>Sekian, terima kasih.</p>
  </div>

  <!-- Motto -->
  <div class="motto">
    "BERKHIDMAT UNTUK NEGARA"
  </div>

  <div style="margin-top: 20px;">
    Saya yang menjalankan amanah,
  </div>

  <!-- Signature Block -->
  <div class="signature-block">
    <div class="signature-line"></div>
    <div>(${data.yang_dipertua_name})</div>
    <div><strong>Yang Dipertua</strong></div>
    <div>Majlis Perbandaran Segamat</div>
    <div>[Segamat]</div>
  </div>

  <!-- File Reference -->
  <div class="file-reference">
    ${data.initial_pegawai || "HMH"}/${data.initial_pegawai?.toLowerCase() || "hmh"}/k/${fileReference}
  </div>

  <!-- S.K. -->
  <div class="sk-section">
    <p><strong>S.K :</strong></p>
    ${skRecipients.map((recipient) => `<p>${recipient}</p>`).join("")}
  </div>
</body>
</html>`;

    return html;
  },

  downloadSuratPDF(html: string, filename: string): void {
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
};