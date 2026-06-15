import { supabase } from "@/integrations/supabase/client";

export interface ApplicationListItem {
  id: string;
  no_fail_jpl: string;
  no_permohonan_osc: string;
  nama_pemaju_pemilik: string | null;
  skala_pembangunan: string;
  tarikh_lengkap_diterima_osc: string;
  tarikh_kpi: string;
  status_dalaman: string;
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  baki_hari: number; // Calculated client-side
}

export interface ApplicationFilters {
  search?: string;
  status_dalaman?: string;
  skala_pembangunan?: string;
  assigned_officer_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ApplicationSummary {
  aktif: number;
  dalam_tempoh: number;
  hampir_tamat: number;
  terlepas_kpi: number;
}

/**
 * Calculate days remaining until KPI deadline
 */
function calculateBakiHari(tarikh_kpi: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const kpiDate = new Date(tarikh_kpi);
  kpiDate.setHours(0, 0, 0, 0);
  
  const diffTime = kpiDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Fetch applications list with filters
 */
export async function fetchApplicationsList(
  filters: ApplicationFilters,
  userRole: string,
  userId: string
): Promise<ApplicationListItem[]> {
  try {
    let query = supabase
      .from("applications")
      .select(`
        id,
        no_fail_jpl,
        no_permohonan_osc,
        nama_pemaju_pemilik,
        skala_pembangunan,
        tarikh_lengkap_diterima_osc,
        tarikh_kpi,
        status_dalaman,
        assigned_officer_id,
        profiles:assigned_officer_id (
          full_name
        )
      `)
      .order("tarikh_lengkap_diterima_osc", { ascending: false });

    // Role-based filtering: officers see only their assigned applications
    if (userRole === "officer") {
      query = query.eq("assigned_officer_id", userId);
    }

    // Search filter
    if (filters.search) {
      query = query.or(
        `no_permohonan_osc.ilike.%${filters.search}%,nama_pemaju_pemilik.ilike.%${filters.search}%`
      );
    }

    // Status filter
    if (filters.status_dalaman) {
      query = query.eq("status_dalaman", filters.status_dalaman);
    }

    // Scale filter
    if (filters.skala_pembangunan) {
      query = query.eq("skala_pembangunan", filters.skala_pembangunan);
    }

    // Officer filter (for admins/heads)
    if (filters.assigned_officer_id) {
      query = query.eq("assigned_officer_id", filters.assigned_officer_id);
    }

    // Date range filter
    if (filters.date_from) {
      query = query.gte("tarikh_lengkap_diterima_osc", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("tarikh_lengkap_diterima_osc", filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    // Process data and calculate baki_hari
    const processedData: ApplicationListItem[] = (data || []).map((app: any) => ({
      id: app.id,
      no_fail_jpl: app.no_fail_jpl,
      no_permohonan_osc: app.no_permohonan_osc,
      nama_pemaju_pemilik: app.nama_pemaju_pemilik,
      skala_pembangunan: app.skala_pembangunan,
      tarikh_lengkap_diterima_osc: app.tarikh_lengkap_diterima_osc,
      tarikh_kpi: app.tarikh_kpi,
      status_dalaman: app.status_dalaman,
      assigned_officer_id: app.assigned_officer_id,
      assigned_officer_name: app.profiles?.full_name || null,
      baki_hari: calculateBakiHari(app.tarikh_kpi),
    }));

    return processedData;
  } catch (error) {
    console.error("Unexpected error fetching applications:", error);
    return [];
  }
}

/**
 * Calculate summary statistics
 */
export function calculateSummary(applications: ApplicationListItem[]): ApplicationSummary {
  const completedStatuses = ["Lulus", "Lulus Bersyarat", "Ditolak", "Dibatalkan"];

  const aktif = applications.filter(
    (app) => !completedStatuses.includes(app.status_dalaman)
  ).length;

  const dalam_tempoh = applications.filter(
    (app) =>
      !completedStatuses.includes(app.status_dalaman) && app.baki_hari > 14
  ).length;

  const hampir_tamat = applications.filter(
    (app) =>
      !completedStatuses.includes(app.status_dalaman) &&
      app.baki_hari >= 0 &&
      app.baki_hari <= 14
  ).length;

  const terlepas_kpi = applications.filter(
    (app) =>
      !completedStatuses.includes(app.status_dalaman) && app.baki_hari < 0
  ).length;

  return {
    aktif,
    dalam_tempoh,
    hampir_tamat,
    terlepas_kpi,
  };
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(status: string): string {
  const statusMap: Record<string, string> = {
    "Diterima": "blue",
    "Dalam Semakan Teknikal": "teal",
    "Menunggu Ulasan ATD": "yellow",
    "Kertas Perakuan Disediakan": "purple",
    "Menunggu OSC": "orange",
    "Lulus": "green",
    "Lulus Bersyarat": "green",
    "Ditolak": "gray",
    "Dibatalkan": "gray",
  };

  return statusMap[status] || "default";
}

/**
 * Get row background class based on baki_hari
 */
export function getRowHighlightClass(
  baki_hari: number,
  status_dalaman: string
): string {
  const completedStatuses = ["Lulus", "Lulus Bersyarat", "Ditolak", "Dibatalkan"];

  // Completed applications: grey out
  if (completedStatuses.includes(status_dalaman)) {
    return "bg-gray-50 text-gray-500";
  }

  // Critical: ≤7 days or overdue
  if (baki_hari <= 7) {
    return "bg-red-50 hover:bg-red-100";
  }

  // Warning: 8-14 days
  if (baki_hari >= 8 && baki_hari <= 14) {
    return "bg-orange-50 hover:bg-orange-100";
  }

  // Normal: >14 days
  return "hover:bg-muted/50";
}