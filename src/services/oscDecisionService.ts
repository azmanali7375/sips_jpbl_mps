import { supabase } from "@/integrations/supabase/client";
import { workflowService } from "./workflowService";
import { notificationService } from "./notificationService";
import type { Tables } from "@/integrations/supabase/types";

export type OSCDecision = Tables<"osc_decisions">;
export type OSCDecisionType = "Lulus" | "Lulus Bersyarat" | "Ditangguhkan" | "Ditolak";

export interface CreateOSCDecisionData {
  application_id: string;
  tarikh_mesyuarat_osc: string;
  no_mesyuarat?: string;
  keputusan_osc: OSCDecisionType;
  syarat_kelulusan?: string;
  tempoh_sah_kelulusan?: number;
  no_kelulusan_km?: string;
  catatan_osc?: string;
}

export const oscDecisionService = {
  async createDecision(data: CreateOSCDecisionData): Promise<OSCDecision | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: decision, error } = await supabase
      .from("osc_decisions")
      .insert({
        application_id: data.application_id,
        meeting_date: data.tarikh_mesyuarat_osc,
        meeting_number: data.no_mesyuarat,
        decision_type: data.keputusan_osc,
        approval_conditions: data.syarat_kelulusan,
        tempoh_sah_kelulusan: data.tempoh_sah_kelulusan || 2,
        no_kelulusan_km: data.no_kelulusan_km,
        catatan_osc: data.catatan_osc,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating OSC decision:", error);
      throw error;
    }

    // Update application status based on decision
    let newStatus: string;
    if (data.keputusan_osc === "Lulus" || data.keputusan_osc === "Lulus Bersyarat") {
      newStatus = "approved";
    } else if (data.keputusan_osc === "Ditolak") {
      newStatus = "rejected";
    } else {
      newStatus = "under_review";
    }

    await workflowService.updateStatus(
      data.application_id,
      newStatus as any,
      `Keputusan OSC – ${data.keputusan_osc}`
    );

    // Auto-create approved_plans record if approved
    if (data.keputusan_osc === "Lulus" || data.keputusan_osc === "Lulus Bersyarat") {
      await this.createApprovedPlan(
        data.application_id,
        data.tarikh_mesyuarat_osc,
        data.tempoh_sah_kelulusan || 2,
        data.no_kelulusan_km,
        data.syarat_kelulusan
      );
    }

    // Get application details for notification
    const { data: application } = await supabase
      .from("applications")
      .select("assigned_officer_id")
      .eq("id", data.application_id)
      .single();

    // Send notification to assigned officer
    if (application?.assigned_officer_id) {
      await notificationService.create({
        userId: application.assigned_officer_id,
        type: "status_change",
        title: `Keputusan OSC: ${data.keputusan_osc}`,
        message: `Sila sediakan dan hantar surat rasmi kepada pemohon.`,
        applicationId: data.application_id,
      });
    }

    return decision;
  },

  async createApprovedPlan(
    applicationId: string,
    tarikhKelulusan: string,
    tempohSahKelulusan: number,
    noKelulusanKm?: string,
    syaratKelulusan?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const tarikhKelulusanDate = new Date(tarikhKelulusan);
    const tarikhTamatSah = new Date(tarikhKelulusanDate);
    tarikhTamatSah.setFullYear(tarikhTamatSah.getFullYear() + tempohSahKelulusan);

    const { error } = await supabase
      .from("approved_plans")
      .insert({
        application_id: applicationId,
        plan_registration_number: noKelulusanKm || `PENDING-${Date.now()}`,
        endorsed_date: tarikhKelulusan,
        registered_by: user.id,
        tarikh_kelulusan: tarikhKelulusan,
        tarikh_tamat_sah: tarikhTamatSah.toISOString().split('T')[0],
        syarat_kelulusan: syaratKelulusan,
      });

    if (error) {
      console.error("Error creating approved plan:", error);
      throw error;
    }
  },

  async getDecisionByApplicationId(applicationId: string): Promise<OSCDecision | null> {
    const { data, error } = await supabase
      .from("osc_decisions")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching OSC decision:", error);
      return null;
    }

    return data;
  },

  async getAllDecisions(): Promise<OSCDecision[]> {
    const { data, error } = await supabase
      .from("osc_decisions")
      .select("*")
      .order("meeting_date", { ascending: false });

    if (error) {
      console.error("Error fetching OSC decisions:", error);
      return [];
    }

    return data || [];
  },

  async updateDecision(id: string, updates: Partial<CreateOSCDecisionData>): Promise<OSCDecision | null> {
    const updateData: any = {};
    
    if (updates.tarikh_mesyuarat_osc) updateData.meeting_date = updates.tarikh_mesyuarat_osc;
    if (updates.no_mesyuarat) updateData.meeting_number = updates.no_mesyuarat;
    if (updates.keputusan_osc) updateData.decision_type = updates.keputusan_osc;
    if (updates.syarat_kelulusan) updateData.approval_conditions = updates.syarat_kelulusan;
    if (updates.tempoh_sah_kelulusan) updateData.tempoh_sah_kelulusan = updates.tempoh_sah_kelulusan;
    if (updates.no_kelulusan_km) updateData.no_kelulusan_km = updates.no_kelulusan_km;
    if (updates.catatan_osc) updateData.catatan_osc = updates.catatan_osc;

    const { data, error } = await supabase
      .from("osc_decisions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating OSC decision:", error);
      return null;
    }

    return data;
  },

  async deleteDecision(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("osc_decisions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting OSC decision:", error);
      return false;
    }

    return true;
  }
};