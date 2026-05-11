import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OSCDecision = Tables<"osc_decisions">;
export type OSCDecisionType = "lulus" | "tolak" | "lulus_dengan_pindaan";

export interface CreateOSCDecisionData {
  application_id: string;
  meeting_date: string;
  meeting_number?: string;
  decision_type: OSCDecisionType;
  approval_conditions?: string;
  rejection_reasons?: string;
  amendment_requirements?: string;
}

export const oscDecisionService = {
  async createDecision(data: CreateOSCDecisionData): Promise<OSCDecision | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: decision, error } = await supabase
      .from("osc_decisions")
      .insert({
        ...data,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating OSC decision:", error);
      return null;
    }

    return decision;
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
    const { data, error } = await supabase
      .from("osc_decisions")
      .update(updates)
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