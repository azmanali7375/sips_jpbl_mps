import { supabase } from "@/integrations/supabase/client";

export interface CajPemajanData {
  id?: string;
  application_id: string;
  no_rujukan_caj?: string;
  jumlah_caj?: number;
  tarikh_notis?: string;
  tarikh_luput_bayar?: string;
  tarikh_bayar?: string;
  no_resit?: string;
  status_caj: "Belum Dikira" | "Menunggu Bayaran" | "Dibayar" | "Dikecualikan";
  dikira_oleh?: string;
  catatan?: string;
  pdf_url?: string;
}

export interface NotisCajData {
  no_fail_jpl: string;
  no_rujukan_fail: string;
  nama_pemaju_pemilik: string;
  alamat_pemohon: string;
  tajuk_permohonan: string;
  jumlah_caj: number;
  tarikh_notis: string;
  yang_dipertua_name: string;
}

export const cajPemajanService = {
  async createCajPemajan(applicationId: string): Promise<CajPemajanData> {
    const { data, error } = await supabase
      .from("caj_pemajuan")
      .insert({
        application_id: applicationId,
        status_caj: "Belum Dikira",
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status_caj: data.status_caj as "Belum Dikira" | "Menunggu Bayaran" | "Dibayar" | "Dikecualikan",
    };
  },

  async getCajPemajan(applicationId: string): Promise<CajPemajanData | null> {
    const { data, error } = await supabase
      .from("caj_pemajuan")
      .select("*")
      .eq("application_id", applicationId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    
    return {
      ...data,
      status_caj: data.status_caj as "Belum Dikira" | "Menunggu Bayaran" | "Dibayar" | "Dikecualikan",
    };
  },

  async updateCajPemajan(id: string, updates: Partial<CajPemajanData>): Promise<void> {
    const { error } = await supabase
      .from("caj_pemajuan")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
  },

  async submitCajAmount(params: {
    cajId: string;
    applicationId: string;
    jumlah_caj: number;
    dikira_oleh: string;
    tarikh_notis: string;
    tarikh_luput_bayar: string;
    catatan?: string;
    dikecualikan?: boolean;
  }): Promise<void> {
    const status_caj = params.dikecualikan ? "Dikecualikan" : "Menunggu Bayaran";

    // Generate no_rujukan_caj
    const { data: app } = await supabase
      .from("applications")
      .select("no_fail_jpl")
      .eq("id", params.applicationId)
      .single();

    const no_rujukan_caj = app?.no_fail_jpl || `CAJ/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`;

    const { error } = await supabase
      .from("caj_pemajuan")
      .update({
        jumlah_caj: params.jumlah_caj,
        dikira_oleh: params.dikira_oleh,
        tarikh_notis: params.tarikh_notis,
        tarikh_luput_bayar: params.tarikh_luput_bayar,
        catatan: params.catatan,
        status_caj,
        no_rujukan_caj,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.cajId);

    if (error) throw error;
  },

  async recordPayment(
    cajId: string,
    tarikhBayar: string,
    noResit: string,
    catatan?: string
  ): Promise<CajPemajanData> {
    const { data, error } = await supabase
      .from("caj_pemajuan")
      .update({
        tarikh_bayar: tarikhBayar,
        no_resit: noResit,
        status_caj: "Dibayar",
        catatan: catatan || null,
      })
      .eq("id", cajId)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status_caj: data.status_caj as "Belum Dikira" | "Menunggu Bayaran" | "Dibayar" | "Dikecualikan",
    };
  },

  async updateInstalmentStatus(cajId: string, isApproved: boolean): Promise<CajPemajanData> {
    const { data, error } = await supabase
      .from("caj_pemajuan")
      .update({
        status_caj: isApproved ? "Ansuran Diluluskan" : "Menunggu Bayaran",
      })
      .eq("id", cajId)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status_caj: data.status_caj as "Belum Dikira" | "Menunggu Bayaran" | "Dibayar" | "Dikecualikan",
    };
  },

  async getNotisCajData(applicationId: string): Promise<NotisCajData | null> {
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select(
        `
        no_fail_jpl,
        nama_pemaju_pemilik,
        tajuk_permohonan,
        osc_decisions!inner (
          alamat_pemohon,
          yang_dipertua_name
        )
      `
      )
      .eq("id", applicationId)
      .single();

    if (appError || !app) return null;

    const { data: caj, error: cajError } = await supabase
      .from("caj_pemajuan")
      .select("*")
      .eq("application_id", applicationId)
      .single();

    if (cajError || !caj || !caj.jumlah_caj) return null;

    const decision = Array.isArray(app.osc_decisions)
      ? app.osc_decisions[0]
      : app.osc_decisions;

    return {
      no_fail_jpl: app.no_fail_jpl || "",
      no_rujukan_fail: caj.no_rujukan_caj || app.no_fail_jpl || "",
      nama_pemaju_pemilik: app.nama_pemaju_pemilik || "",
      alamat_pemohon: decision?.alamat_pemohon || "",
      tajuk_permohonan: app.tajuk_permohonan || "",
      jumlah_caj: caj.jumlah_caj,
      tarikh_notis: caj.tarikh_notis || new Date().toISOString().split("T")[0],
      yang_dipertua_name: decision?.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah",
    };
  },

  generateNotisCajHTML(data: NotisCajData): string {
    const tarikhFormatted = new Date(data.tarikh_notis).toLocaleDateString("ms-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const alamatLines = data.alamat_pemohon
      .split("\n")
      .map((line) => `<div>${line}</div>`)
      .join("");

    const jumlahFormatted = new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(data.jumlah_caj);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Notis Caj Pemajuan - Borang A</title>
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
      margin: 5px 0;
    }
    .form-title {
      font-size: 14pt;
      margin: 10px 0;
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
      margin: 15px 0;
    }
    .bold-highlight {
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
      margin-top: 20px;
    }
    .nota {
      margin-top: 30px;
      font-size: 11pt;
    }
    .nota p {
      margin: 8px 0;
      text-align: justify;
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

  <!-- Header Block -->
  <div class="header-block">
    <div>JADUAL KEDUA</div>
    <div style="margin-top: 15px;" class="form-title">BORANG A</div>
    <div style="font-size: 11pt; margin-top: 5px;">[Subkaedah 4(2)]</div>
    <div style="margin-top: 15px;">NOTIS CAJ PEMAJUAN</div>
  </div>

  <!-- Reference -->
  <div class="reference">
    <strong>No. Rujukan :</strong> MPS/JPL.600-3/${data.no_rujukan_fail}
  </div>

  <!-- Address Block -->
  <div class="address-block">
    <div><strong>Kepada</strong></div>
    <div style="margin-top: 10px;">
      <strong>${data.nama_pemaju_pemilik}</strong><br>
      ${alamatLines}
    </div>
  </div>

  <!-- Body Text -->
  <div class="body-text">
    <p>
      <span class="bold-highlight">AMBIL PERHATIAN</span> bahawa <strong>MAJLIS PERBANDARAN SEGAMAT</strong> 
      telah menimbangkan permohonan kebenaran merancang tuan, bernombor rujukan 
      <strong>${data.no_rujukan_fail}</strong> bagi pemajuan <strong>${data.tajuk_permohonan}</strong> 
      hendaklah dibayar caj pemajuan selaras dengan peruntukan seksyen 32 Akta 172.
    </p>

    <p>
      Caj pemajuan dilevi atas kenaikan nilai tanah disebabkan perubahan *penggunaan tanah/ketumpatan/luas 
      lantai dalam Rancangan Tempatan Daerah Segamat 2030 (Penggantian). <strong>MAJLIS PERBANDARAN SEGAMAT</strong> 
      dengan ini, menetapkan amaun caj pemajuan yang hendaklah dibayar berkenaan pemajuan ini adalah 
      <strong>${jumlahFormatted}</strong>.
    </p>

    <p>
      <span class="bold-highlight">AMBIL PERHATIAN</span>, jika caj pemajuan gagal dibayar dalam tempoh yang 
      ditetapkan, <strong>MAJLIS PERBANDARAN SEGAMAT</strong> tidak boleh memberi kebenaran merancang mengikut 
      perenggan 22(4)(b) Akta 172.
    </p>
  </div>

  <!-- Signature Block -->
  <div class="signature-block">
    <div class="signature-left">
      <div><strong>Tarikh :</strong> ${tarikhFormatted}</div>
      <div style="margin-top: 20px;"><strong>METERAI :</strong></div>
    </div>
    <div class="signature-right">
      <div class="signature-line"></div>
      <div>(${data.yang_dipertua_name})</div>
      <div><strong>Yang Dipertua</strong></div>
      <div>Majlis Perbandaran Segamat</div>
    </div>
  </div>

  <!-- Asterisk Note -->
  <div class="asterisk-note">
    *Potong mana yang tidak berkenaan*
  </div>

  <!-- Nota -->
  <div class="nota">
    <p><strong>Nota:</strong></p>
    <p>
      1. Di bawah subseksyen 34(1) Akta 172, tuan boleh mengemukakan permohonan pembayaran secara ansuran 
      kepada Pihak Berkuasa Perancang Tempatan;
    </p>
    <p>
      2. Permohonan pembayaran secara ansuran hanya dibenarkan bagi caj pemajuan melebihi tiga puluh ribu 
      ringgit (RM30,000.00) dan permohonan ini boleh dibuat melalui Borang B Jadual Kedua; dan
    </p>
    <p>
      3. Permohonan pembayaran secara ansuran hendaklah dibuat sebelum tempoh pembayaran yang ditetapkan luput.
    </p>
  </div>
</body>
</html>`;

    return html;
  },

  downloadNotisCajPDF(html: string, filename: string): void {
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