import { supabase } from "@/integrations/supabase/client";

export interface BorangC2Data {
  no_fail_jpl: string;
  no_permohonan_osc: string;
  nama_pemaju_pemilik: string;
  alamat_pemohon: string;
  tajuk_permohonan: string;
  no_mesyuarat: string;
  tarikh_mesyuarat_osc: string;
  tarikh_kelulusan: string;
  yang_dipertua_name: string;
  sebab_penolakan: string;
}

export const borangC2Service = {
  async getC2Data(applicationId: string): Promise<BorangC2Data | null> {
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
          rejection_reasons,
          tarikh_kelulusan,
          alamat_pemohon,
          yang_dipertua_name
        )
      `
      )
      .eq("id", applicationId)
      .eq("osc_decisions.decision_type", "Tolak")
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
      tarikh_kelulusan: decision.tarikh_kelulusan || "",
      yang_dipertua_name: decision.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah",
      sebab_penolakan: decision.rejection_reasons || "",
    };
  },

  generateC2HTML(data: BorangC2Data): string {
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

    // Parse and format sebab_penolakan with proper numbering
    const sebabLines = data.sebab_penolakan
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

    // Format alamat_pemohon (split by comma or newline)
    const alamatLines = data.alamat_pemohon
      .split(/[,\n]/)
      .map((line) => line.trim())
      .filter((line) => line)
      .join("<br>");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Borang C(2) - ${data.no_fail_jpl}</title>
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
    .address-block {
      margin: 20px 0;
      line-height: 1.8;
    }
    .body-text {
      text-align: justify;
      margin: 20px 0;
      line-height: 1.8;
    }
    .menolak {
      font-weight: bold;
      font-style: italic;
      text-decoration: underline;
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
    .nota ol {
      padding-left: 20px;
    }
    .nota li {
      margin: 8px 0;
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
    <p>(NEGERI JOHOR) 2008 PINDAAN 2014</p>
    <p>&nbsp;</p>
    <h2>BORANG C(2)</h2>
    <p>&nbsp;</p>
    <h2>PENOLAKAN KEBENARAN MERANCANG</h2>
    <p>[ Subkaedah 9(2) ]</p>
    <p>Mengikut</p>
    <p>Subseksyen 22(3) AKTA PERANCANGAN BANDAR DAN DESA 1976</p>
  </div>

  <div class="ref-block">
    NO. RUJ : MPS/JPL.600-3/${data.no_fail_jpl.split("/").pop() || ""}<br>
    ${data.no_permohonan_osc}
  </div>

  <div class="address-block">
    <p>Kepada,</p>
    <p>&nbsp;</p>
    <p><strong>${data.nama_pemaju_pemilik}</strong></p>
    <p>${alamatLines}</p>
  </div>

  <div class="body-text">
    <p>
      Oleh Majlis Perbandaran Segamat seperti telah dipersetujui dalam Mesyuarat Jawatankuasa Pusat Setempat Majlis Perbandaran Segamat Bil. ${
        data.no_mesyuarat
      } bertarikh ${formatDate(
      data.tarikh_mesyuarat_osc
    )} setelah menimbang permohonan tuan dan mengambilkira perkara-perkara yang dikehendaki oleh undang-undang dengan ini membuat keputusan <span class="menolak">MENOLAK</span> kebenaran merancang yang dipohon oleh ${
      data.nama_pemaju_pemilik
    } beralamat ${data.alamat_pemohon} bagi tujuan ${data.tajuk_permohonan}
    </p>

    <p>
      Penolakan kebenaran Merancang adalah berdasarkan kepada perkara-perkara seperti yang dilampirkan.
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
    <ol>
      <li>Mengikut peruntukan perenggan 23(1)(a), tuan berhak membuat rayuan diatas keputusan yang dibuat oleh Pihak Berkuasa Perancang Tempatan dalam tempoh satu bulan dari tarikh keputusan itu disampaikan.</li>
      <li>Rayuan hendaklah dialamatkan kepada Pendaftar Lembaga Rayuan Negeri Johor.</li>
    </ol>
  </div>

  <!-- PAGE 2: LAMPIRAN -->
  <div class="page-break">
    <div class="lampiran-header">
      LAMPIRAN
    </div>

    <p style="text-align: justify; margin: 20px 0;">
      Jawatankuasa mengambil keputusan <span class="menolak">MENOLAK</span> permohonan tersebut dalam Mesyuarat Jawatankuasaan OSC Bil ${
        data.no_mesyuarat
      } pada ${formatDate(data.tarikh_mesyuarat_osc)}
    </p>

    <div class="lampiran-content">
${sebabLines}
    </div>
  </div>
</body>
</html>
`;
  },

  downloadC2PDF(html: string, filename: string) {
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