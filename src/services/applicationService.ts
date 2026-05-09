import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ApplicationStatus, ProjectType } from "@/types";

export type Application = Tables<"applications">;

export interface CreateApplicationData {
  project_name: string;
  project_type: ProjectType;
  location: string;
  lot_number?: string;
  plot_area?: number;
  plot_ratio?: number;
  building_height?: number;
  setback_front?: number;
  setback_rear?: number;
  setback_side?: number;
  land_use_zone?: string;
}

export const applicationService = {
  async createApplication(data: CreateApplicationData): Promise<Application | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: application, error } = await supabase
      .from("applications")
      .insert({
        ...data,
        applicant_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating application:", error);
      return null;
    }

    return application;
  },

  async getMyApplications(): Promise<Application[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  },

  async getAllApplications(filters?: {
    status?: ApplicationStatus;
    assigned_officer_id?: string;
  }): Promise<Application[]> {
    let query = supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.assigned_officer_id) {
      query = query.eq("assigned_officer_id", filters.assigned_officer_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  },

  async getApplicationById(id: string): Promise<Application | null> {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching application:", error);
      return null;
    }

    return data;
  },

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    officerId?: string
  ): Promise<Application | null> {
    const updates: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "under_review" && !officerId) {
      const { data: { user } } = await supabase.auth.getUser();
      updates.assigned_officer_id = user?.id;
      updates.reviewed_at = new Date().toISOString();
    }

    if (status === "approved" || status === "rejected") {
      updates.decision_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("applications")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating application:", error);
      return null;
    }

    return data;
  },

  async assignOfficer(applicationId: string, officerId: string): Promise<boolean> {
    const { error } = await supabase
      .from("applications")
      .update({
        assigned_officer_id: officerId,
        status: "under_review",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", applicationId);

    if (error) {
      console.error("Error assigning officer:", error);
      return false;
    }

    return true;
  },

  async getApplicationStats(): Promise<{
    total: number;
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  }> {
    const { data, error } = await supabase
      .from("applications")
      .select("status");

    if (error || !data) {
      return { total: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0 };
    }

    return {
      total: data.length,
      submitted: data.filter(a => a.status === "submitted").length,
      under_review: data.filter(a => a.status === "under_review").length,
      approved: data.filter(a => a.status === "approved").length,
      rejected: data.filter(a => a.status === "rejected").length,
    };
  }
};