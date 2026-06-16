import { supabase } from "@/integrations/supabase/client";
import { publicHolidayService } from "./publicHolidayService";

export interface KPIWarning {
  application_id: string;
  no_fail_jpl: string;
  nama_pemaju_pemilik: string;
  skala_km: boolean;
  tarikh_lengkap_diterima_osc: string;
  baki_hari: number;
  status: "red" | "orange" | "normal";
  message: string;
}

export const kpiWarningService = {
  /**
   * Get all applications with KPI warnings
   */
  async getKPIWarnings(): Promise<KPIWarning[]> {
    try {
      const { data: applications } = await supabase
        .from("applications")
        .select("id, no_fail_jpl, nama_pemaju_pemilik, jenis_aplikasi, tarikh_lengkap_diterima_osc")
        .not("status", "in", '("approved","rejected")');

      if (!applications) return [];

      const warnings: KPIWarning[] = [];
      const today = new Date().toISOString().split("T")[0];

      for (const app of applications) {
        if (!app.tarikh_lengkap_diterima_osc) continue;

        let bakiHari = 0;
        let status: "red" | "orange" | "normal" = "normal";
        let message = "";
        const isKM = app.jenis_aplikasi === "KM";

        if (isKM) {
          // KM: 53 working days threshold
          const deadlineDate = await publicHolidayService.addWorkingDays(
            app.tarikh_lengkap_diterima_osc,
            53
          );
          bakiHari = await publicHolidayService.calculateWorkingDays(today, deadlineDate);

          if (bakiHari <= 5 && bakiHari >= 0) {
            status = "red";
            message = `KRITIKAL: ${bakiHari} hari bekerja sahaja!`;
          } else if (bakiHari < 0) {
            status = "red";
            message = `TERLEPAS KPI: ${Math.abs(bakiHari)} hari bekerja lewat`;
          } else if (bakiHari <= 10) {
            status = "orange";
            message = `Hampir tamat: ${bakiHari} hari bekerja`;
          } else {
            status = "normal";
            message = `${bakiHari} hari bekerja lagi`;
          }
        } else {
          // PB: 14 calendar days threshold
          const startDate = new Date(app.tarikh_lengkap_diterima_osc);
          const deadlineDate = new Date(startDate);
          deadlineDate.setDate(deadlineDate.getDate() + 14);
          const diffTime = deadlineDate.getTime() - new Date(today).getTime();
          bakiHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (bakiHari <= 3 && bakiHari >= 0) {
            status = "red";
            message = `KRITIKAL: ${bakiHari} hari sahaja!`;
          } else if (bakiHari < 0) {
            status = "red";
            message = `TERLEPAS KPI: ${Math.abs(bakiHari)} hari lewat`;
          } else if (bakiHari <= 7) {
            status = "orange";
            message = `Hampir tamat: ${bakiHari} hari`;
          } else {
            status = "normal";
            message = `${bakiHari} hari lagi`;
          }
        }

        warnings.push({
          application_id: app.id,
          no_fail_jpl: app.no_fail_jpl,
          nama_pemaju_pemilik: app.nama_pemaju_pemilik,
          skala_km: isKM,
          tarikh_lengkap_diterima_osc: app.tarikh_lengkap_diterima_osc,
          baki_hari: bakiHari,
          status,
          message,
        });
      }

      // Sort by urgency (red first, then orange, then by baki_hari ascending)
      return warnings.sort((a, b) => {
        if (a.status === "red" && b.status !== "red") return -1;
        if (a.status !== "red" && b.status === "red") return 1;
        if (a.status === "orange" && b.status === "normal") return -1;
        if (a.status === "normal" && b.status === "orange") return 1;
        return a.baki_hari - b.baki_hari;
      });
    } catch (error) {
      console.error("Error fetching KPI warnings:", error);
      return [];
    }
  },

  /**
   * Check if an application needs a KPI alert notification
   */
  async checkForAlerts(applicationId: string): Promise<boolean> {
    try {
      const { data: app } = await supabase
        .from("applications")
        .select("jenis_aplikasi, tarikh_lengkap_diterima_osc")
        .eq("id", applicationId)
        .single();

      if (!app || !app.tarikh_lengkap_diterima_osc) return false;

      const today = new Date().toISOString().split("T")[0];
      let bakiHari = 0;

      if (app.jenis_aplikasi === "KM") {
        // KM: Alert at 10, 5, 2 working days
        const deadlineDate = await publicHolidayService.addWorkingDays(
          app.tarikh_lengkap_diterima_osc,
          53
        );
        bakiHari = await publicHolidayService.calculateWorkingDays(today, deadlineDate);
        return bakiHari === 10 || bakiHari === 5 || bakiHari === 2;
      } else {
        // PB: Alert at 7, 3, 1 calendar days
        const startDate = new Date(app.tarikh_lengkap_diterima_osc);
        const deadlineDate = new Date(startDate);
        deadlineDate.setDate(deadlineDate.getDate() + 14);
        const diffTime = deadlineDate.getTime() - new Date(today).getTime();
        bakiHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return bakiHari === 7 || bakiHari === 3 || bakiHari === 1;
      }
    } catch (error) {
      console.error("Error checking for alerts:", error);
      return false;
    }
  },
};