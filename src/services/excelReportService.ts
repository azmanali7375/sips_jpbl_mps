/**
 * Excel Report Service
 * Generates management reports matching manual registers
 */

import { supabase } from "@/integrations/supabase/client";
import { publicHolidayService } from "./publicHolidayService";
import * as XLSX from "xlsx";

interface ApplicationReportData {
  id: string;
  jenis_aplikasi: string;
  no_fail_jpl: string;
  no_permohonan_osc: string;
  tajuk_permohonan: string;
  nama_pemaju_pemilik: string;
  tarikh_penghantaran: string;
  tarikh_semakan?: string;
  tarikh_kelulusan?: string;
  status: string;
  jumlah_caj?: number;
  tarikh_tandatangan_c1?: string;
}

const MONTH_NAMES_BM = [
  "JAN",
  "FEB",
  "MAC",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "OGO",
  "SEP",
  "OKT",
  "NOV",
  "DIS",
];

export const excelReportService = {
  /**
   * Generate complete application register Excel with KM and PB sheets
   */
  async generateApplicationRegister(year: number): Promise<void> {
    try {
      // Fetch all applications for the year
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: applications, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          jenis_aplikasi,
          no_fail_jpl,
          no_permohonan_osc,
          tajuk_permohonan,
          nama_pemaju_pemilik,
          tarikh_penghantaran,
          status,
          reviews (
            tarikh_semakan
          ),
          osc_decisions (
            tarikh_kelulusan,
            tarikh_tandatangan_c1
          ),
          caj_pemajuan (
            jumlah_caj
          )
        `
        )
        .gte("tarikh_penghantaran", startDate)
        .lte("tarikh_penghantaran", endDate)
        .order("tarikh_penghantaran", { ascending: true });

      if (error) throw error;
      if (!applications || applications.length === 0) {
        throw new Error(`Tiada permohonan dijumpai untuk tahun ${year}`);
      }

      // Separate KM and PB applications
      const kmApps: ApplicationReportData[] = [];
      const pbApps: ApplicationReportData[] = [];

      for (const app of applications) {
        const reviewDate = Array.isArray(app.reviews) && app.reviews.length > 0
          ? app.reviews[0].tarikh_semakan
          : undefined;
        
        const decision = Array.isArray(app.osc_decisions) && app.osc_decisions.length > 0
          ? app.osc_decisions[0]
          : undefined;

        const caj = Array.isArray(app.caj_pemajuan) && app.caj_pemajuan.length > 0
          ? app.caj_pemajuan[0]
          : undefined;

        const reportData: ApplicationReportData = {
          id: app.id,
          jenis_aplikasi: app.jenis_aplikasi,
          no_fail_jpl: app.no_fail_jpl,
          no_permohonan_osc: app.no_permohonan_osc,
          tajuk_permohonan: app.tajuk_permohonan,
          nama_pemaju_pemilik: app.nama_pemaju_pemilik,
          tarikh_penghantaran: app.tarikh_penghantaran,
          tarikh_semakan: reviewDate,
          tarikh_kelulusan: decision?.tarikh_kelulusan,
          status: app.status,
          jumlah_caj: caj?.jumlah_caj,
          tarikh_tandatangan_c1: decision?.tarikh_tandatangan_c1,
        };

        if (app.jenis_aplikasi === "KM") {
          kmApps.push(reportData);
        } else {
          pbApps.push(reportData);
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Generate KM sheet
      if (kmApps.length > 0) {
        const kmSheet = await this.generateKMSheet(kmApps, year);
        XLSX.utils.book_append_sheet(wb, kmSheet, "PERMOHONAN KM");
      }

      // Generate PB sheet
      if (pbApps.length > 0) {
        const pbSheet = await this.generatePBSheet(pbApps, year);
        XLSX.utils.book_append_sheet(wb, pbSheet, "PERMOHONAN PB");
      }

      // Download the file
      const filename = `Daftar_Permohonan_MPS_${year}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Error generating application register:", error);
      throw error;
    }
  },

  /**
   * Generate KM sheet with working days calculation
   */
  async generateKMSheet(applications: ApplicationReportData[], year: number): Promise<any> {
    const data: any[][] = [];

    // Header rows
    data.push(["DAFTAR PERMOHONAN KEBENARAN MERANCANG"]);
    data.push([
      "DI BAWAH SEKSYEN 21 AKTA PERANCANGAN BANDAR & DESA 1976 (AKTA 172)",
    ]);
    data.push([`BAGI TAHUN ${year}`]);
    data.push([]); // Blank row

    // Column headers
    data.push([
      "BIL",
      "BULAN",
      "NO. FAIL",
      "TUJUAN",
      "PEMOHON/PEMAJU",
      "TARIKH TERIMA",
      "TARIKH ULASAN",
      "TARIKH LULUS/TOLAK",
      "BIL HARI",
      "CAPAI KPI 53 HARI BEKERJA YA/TIDAK",
      "CAJ PEMAJUAN (RM)",
      "TARIKH T/TANGAN C1",
    ]);

    // Data rows
    let lastMonth = "";
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      const receiveDate = new Date(app.tarikh_penghantaran);
      const month = MONTH_NAMES_BM[receiveDate.getMonth()];

      // Show month only on first entry per month, use " for subsequent
      const monthDisplay = month === lastMonth ? '"' : month;
      lastMonth = month;

      // Format NO. FAIL with line break
      const noFail = `${app.no_fail_jpl}\n${app.no_permohonan_osc}`;

      // Format dates
      const formatDate = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-GB").replace(/\//g, ".");
      };

      // Calculate BIL HARI (working days for KM)
      let bilHari = null;
      let capaiKPI = "";

      if (app.tarikh_kelulusan) {
        bilHari = await publicHolidayService.calculateWorkingDays(
          app.tarikh_penghantaran,
          app.tarikh_kelulusan
        );
        capaiKPI = bilHari <= 53 ? "YA" : "TIDAK";
      }

      // Format CAJ PEMAJUAN
      const cajPemajuan = app.jumlah_caj
        ? `RM${app.jumlah_caj.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        : "";

      data.push([
        i + 1, // BIL
        monthDisplay, // BULAN
        noFail, // NO. FAIL
        app.tajuk_permohonan, // TUJUAN
        app.nama_pemaju_pemilik, // PEMOHON/PEMAJU
        formatDate(app.tarikh_penghantaran), // TARIKH TERIMA
        formatDate(app.tarikh_semakan), // TARIKH ULASAN
        formatDate(app.tarikh_kelulusan), // TARIKH LULUS/TOLAK
        bilHari || "", // BIL HARI
        capaiKPI, // CAPAI KPI
        cajPemajuan, // CAJ PEMAJUAN
        formatDate(app.tarikh_tandatangan_c1), // TARIKH T/TANGAN C1
      ]);
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },  // BIL
      { wch: 8 },  // BULAN
      { wch: 18 }, // NO. FAIL
      { wch: 50 }, // TUJUAN
      { wch: 30 }, // PEMOHON/PEMAJU
      { wch: 15 }, // TARIKH TERIMA
      { wch: 15 }, // TARIKH ULASAN
      { wch: 15 }, // TARIKH LULUS/TOLAK
      { wch: 10 }, // BIL HARI
      { wch: 15 }, // CAPAI KPI
      { wch: 20 }, // CAJ PEMAJUAN
      { wch: 15 }, // TARIKH T/TANGAN C1
    ];

    // Apply formatting
    this.applyKMFormatting(ws, applications.length);

    return ws;
  },

  /**
   * Generate PB sheet with calendar days calculation
   */
  async generatePBSheet(applications: ApplicationReportData[], year: number): Promise<any> {
    const data: any[][] = [];

    // Header rows
    data.push(["DAFTAR PERMOHONAN PELAN BANGUNAN"]);
    data.push([`BAGI TAHUN ${year}`]);
    data.push([]); // Blank row

    // Column headers
    data.push([
      "BIL",
      "BULAN",
      "NO. FAIL",
      "PERKARA",
      "PEMOHON",
      "TARIKH TERIMA",
      "TARIKH ULASAN",
      "TARIKH LULUS",
      "BIL HARI",
      "CAPAI KPI 14 HARI YA/TIDAK",
    ]);

    // Data rows
    let lastMonth = "";

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      const receiveDate = new Date(app.tarikh_penghantaran);
      const month = MONTH_NAMES_BM[receiveDate.getMonth()];

      // Show month only on first entry per month
      const monthDisplay = month === lastMonth ? '"' : month;
      lastMonth = month;

      // Format dates
      const formatDate = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-GB").replace(/\//g, ".");
      };

      // Calculate BIL HARI (calendar days for PB)
      let bilHari = null;
      let capaiKPI = "";

      if (app.tarikh_kelulusan) {
        const start = new Date(app.tarikh_penghantaran);
        const end = new Date(app.tarikh_kelulusan);
        const diffTime = end.getTime() - start.getTime();
        bilHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        capaiKPI = bilHari <= 14 ? "YA" : "TIDAK";
      }

      data.push([
        i + 1, // BIL
        monthDisplay, // BULAN
        app.no_fail_jpl, // NO. FAIL
        app.tajuk_permohonan, // PERKARA
        app.nama_pemaju_pemilik, // PEMOHON
        formatDate(app.tarikh_penghantaran), // TARIKH TERIMA
        formatDate(app.tarikh_semakan), // TARIKH ULASAN
        formatDate(app.tarikh_kelulusan), // TARIKH LULUS
        bilHari || "", // BIL HARI
        capaiKPI, // CAPAI KPI
      ]);
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },  // BIL
      { wch: 8 },  // BULAN
      { wch: 18 }, // NO. FAIL
      { wch: 50 }, // PERKARA
      { wch: 30 }, // PEMOHON
      { wch: 15 }, // TARIKH TERIMA
      { wch: 15 }, // TARIKH ULASAN
      { wch: 15 }, // TARIKH LULUS
      { wch: 10 }, // BIL HARI
      { wch: 15 }, // CAPAI KPI
    ];

    // Apply formatting
    this.applyPBFormatting(ws, applications.length);

    return ws;
  },

  /**
   * Apply formatting to KM sheet
   */
  applyKMFormatting(ws: any, rowCount: number) {
    const headerRowIndex = 5; // Row 5 (0-indexed as 4) contains headers
    const dataStartRow = headerRowIndex + 1;

    // Apply header formatting (bold, grey background)
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "D3D3D3" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };
    }

    // Apply data row formatting (alternating rows, color-coded KPI)
    for (let i = 0; i < rowCount; i++) {
      const rowIndex = dataStartRow + i;
      const isEvenRow = i % 2 === 0;

      // KPI column (J, index 9) - color coding
      const kpiCell = ws[XLSX.utils.encode_cell({ r: rowIndex, c: 9 })];
      if (kpiCell && kpiCell.v) {
        kpiCell.s = {
          fill: {
            fgColor: {
              rgb: kpiCell.v === "YA" ? "90EE90" : "FF6B6B", // Green : Red
            },
          },
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: true },
        };
      }

      // Alternating row background
      if (isEvenRow) {
        for (let col = 0; col < 12; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
          if (!ws[cellAddress]) continue;
          
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          if (!ws[cellAddress].s.fill) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "F5F5F5" } };
          }
        }
      }
    }

    // Set print settings (A3 landscape)
    ws["!printOptions"] = {
      orientation: "landscape",
      paperSize: 8, // A3
      fitToWidth: 1,
      fitToHeight: 0,
    };
  },

  /**
   * Apply formatting to PB sheet
   */
  applyPBFormatting(ws: any, rowCount: number) {
    const headerRowIndex = 4; // Row 4 (0-indexed as 3) contains headers
    const dataStartRow = headerRowIndex + 1;

    // Apply header formatting
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "D3D3D3" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };
    }

    // Apply data row formatting
    for (let i = 0; i < rowCount; i++) {
      const rowIndex = dataStartRow + i;
      const isEvenRow = i % 2 === 0;

      // KPI column (J, index 9) - color coding
      const kpiCell = ws[XLSX.utils.encode_cell({ r: rowIndex, c: 9 })];
      if (kpiCell && kpiCell.v) {
        kpiCell.s = {
          fill: {
            fgColor: {
              rgb: kpiCell.v === "YA" ? "90EE90" : "FF6B6B",
            },
          },
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: true },
        };
      }

      // Alternating row background
      if (isEvenRow) {
        for (let col = 0; col < 10; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
          if (!ws[cellAddress]) continue;
          
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          if (!ws[cellAddress].s.fill) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "F5F5F5" } };
          }
        }
      }
    }

    // Set print settings (A3 landscape)
    ws["!printOptions"] = {
      orientation: "landscape",
      paperSize: 8,
      fitToWidth: 1,
      fitToHeight: 0,
    };
  },
};