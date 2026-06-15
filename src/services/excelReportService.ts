/**
 * Excel Report Service
 * Generates Excel reports matching the current manual tracking format
 */

import * as XLSX from "xlsx";

export interface ExcelReportRow {
  bil: number;
  bulan: string;
  no_fail: string;
  perkara: string;
  pemohon: string;
  tarikh_terima: string;
  tarikh_ulasan: string;
  tarikh_lulus: string;
  bil_hari: number;
  capai_kpi: "YA" | "TIDAK" | "-";
}

export interface ApplicationForExport {
  no_fail_jpl: string;
  tajuk_permohonan: string;
  nama_pemaju_pemilik: string;
  tarikh_lengkap_diterima_osc: string;
  tarikh_kpi: string;
  status: string;
  kpi_hari: number;
  jenis_aplikasi: string;
  created_at?: string;
  approved_date?: string;
  technical_review_date?: string;
}

/**
 * Calculate business days between two dates (excluding weekends)
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Get Malay month name
 */
function getMalayMonth(date: Date): string {
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return months[date.getMonth()];
}

/**
 * Format date as DD/MM/YYYY
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Generate Excel report for applications
 */
export async function generateExcelReport(
  applications: ApplicationForExport[],
  reportType: "KM" | "PB" | "ALL" = "ALL",
  startDate?: Date,
  endDate?: Date
): Promise<Blob> {
  // Filter applications by type
  let filtered = applications;
  
  if (reportType === "KM") {
    filtered = applications.filter(app => app.jenis_aplikasi === "KM" || !app.jenis_aplikasi);
  } else if (reportType === "PB") {
    filtered = applications.filter(app => app.jenis_aplikasi === "PB");
  }

  // Filter by date range if provided
  if (startDate && endDate) {
    filtered = filtered.filter(app => {
      const receivedDate = new Date(app.tarikh_lengkap_diterima_osc);
      return receivedDate >= startDate && receivedDate <= endDate;
    });
  }

  // Sort by tarikh_lengkap_diterima_osc
  filtered.sort((a, b) => {
    const dateA = new Date(a.tarikh_lengkap_diterima_osc);
    const dateB = new Date(b.tarikh_lengkap_diterima_osc);
    return dateA.getTime() - dateB.getTime();
  });

  // Build Excel rows
  const rows: ExcelReportRow[] = filtered.map((app, index) => {
    const receivedDate = new Date(app.tarikh_lengkap_diterima_osc);
    const kpiDate = new Date(app.tarikh_kpi);
    const approvedDate = app.approved_date ? new Date(app.approved_date) : null;
    const reviewDate = app.technical_review_date ? new Date(app.technical_review_date) : null;

    // Calculate actual days taken (business days from received to approved/review)
    let bilHari = 0;
    let capaiKpi: "YA" | "TIDAK" | "-" = "-";

    if (app.status === "approved" && approvedDate) {
      bilHari = calculateBusinessDays(receivedDate, approvedDate);
      capaiKpi = bilHari <= app.kpi_hari ? "YA" : "TIDAK";
    } else if (app.status === "under_review" && reviewDate) {
      bilHari = calculateBusinessDays(receivedDate, reviewDate);
      // For ongoing applications, check against current date
      const today = new Date();
      const daysUsed = calculateBusinessDays(receivedDate, today);
      capaiKpi = daysUsed <= app.kpi_hari ? "YA" : "TIDAK";
    } else if (app.status === "pending") {
      // Check current progress
      const today = new Date();
      bilHari = calculateBusinessDays(receivedDate, today);
      capaiKpi = bilHari <= app.kpi_hari ? "YA" : "TIDAK";
    }

    return {
      bil: index + 1,
      bulan: getMalayMonth(receivedDate),
      no_fail: app.no_fail_jpl,
      perkara: app.tajuk_permohonan,
      pemohon: app.nama_pemaju_pemilik,
      tarikh_terima: formatDate(app.tarikh_lengkap_diterima_osc),
      tarikh_ulasan: formatDate(app.technical_review_date),
      tarikh_lulus: formatDate(app.approved_date),
      bil_hari: bilHari,
      capai_kpi: capaiKpi,
    };
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheet data
  const wsData = [
    // Header row
    ["BIL", "BULAN", "NO. FAIL", "PERKARA", "PEMOHON", "TARIKH TERIMA", "TARIKH ULASAN", "TARIKH LULUS", "BIL HARI", "CAPAI KPI YA/TIDAK"],
    // Data rows
    ...rows.map(row => [
      row.bil,
      row.bulan,
      row.no_fail,
      row.perkara,
      row.pemohon,
      row.tarikh_terima,
      row.tarikh_ulasan,
      row.tarikh_lulus,
      row.bil_hari,
      row.capai_kpi,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 5 },   // BIL
    { wch: 12 },  // BULAN
    { wch: 18 },  // NO. FAIL
    { wch: 40 },  // PERKARA
    { wch: 25 },  // PEMOHON
    { wch: 15 },  // TARIKH TERIMA
    { wch: 15 },  // TARIKH ULASAN
    { wch: 15 },  // TARIKH LULUS
    { wch: 10 },  // BIL HARI
    { wch: 18 },  // CAPAI KPI YA/TIDAK
  ];

  // Add worksheet to workbook
  const sheetName = reportType === "ALL" ? "Semua Permohonan" : reportType === "KM" ? "KM (57 Hari)" : "PB (14 Hari)";
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  return blob;
}

/**
 * Download Excel report
 */
export function downloadExcelReport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}