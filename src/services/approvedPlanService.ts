import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ApprovedPlan = Tables<"approved_plans">;

export interface CreateApprovedPlanData {
  application_id: string;
  plan_registration_number: string;
  endorsed_date: string;
  endorsed_by?: string;
  plan_file_path?: string;
  endorsement_stamp_path?: string;
  notes?: string;
}

export const approvedPlanService = {
  async registerPlan(data: CreateApprovedPlanData): Promise<ApprovedPlan | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: plan, error } = await supabase
      .from("approved_plans")
      .insert({
        ...data,
        registered_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error registering approved plan:", error);
      return null;
    }

    return plan;
  },

  async getPlanByApplicationId(applicationId: string): Promise<ApprovedPlan | null> {
    const { data, error } = await supabase
      .from("approved_plans")
      .select("*")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching approved plan:", error);
      return null;
    }

    return data;
  },

  async getPlanByRegistrationNumber(registrationNumber: string): Promise<ApprovedPlan | null> {
    const { data, error } = await supabase
      .from("approved_plans")
      .select("*")
      .eq("plan_registration_number", registrationNumber)
      .maybeSingle();

    if (error) {
      console.error("Error fetching approved plan:", error);
      return null;
    }

    return data;
  },

  async getAllApprovedPlans(): Promise<ApprovedPlan[]> {
    const { data, error } = await supabase
      .from("approved_plans")
      .select("*")
      .order("registration_date", { ascending: false });

    if (error) {
      console.error("Error fetching approved plans:", error);
      return [];
    }

    return data || [];
  },

  async updatePlan(id: string, updates: Partial<CreateApprovedPlanData>): Promise<ApprovedPlan | null> {
    const { data, error } = await supabase
      .from("approved_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating approved plan:", error);
      return null;
    }

    return data;
  },

  async searchPlans(searchTerm: string): Promise<ApprovedPlan[]> {
    const { data, error } = await supabase
      .from("approved_plans")
      .select("*")
      .or(`plan_registration_number.ilike.%${searchTerm}%,endorsed_by.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .order("registration_date", { ascending: false });

    if (error) {
      console.error("Error searching approved plans:", error);
      return [];
    }

    return data || [];
  }
};