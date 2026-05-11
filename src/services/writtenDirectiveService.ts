import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WrittenDirective = Tables<"written_directives">;
export type DirectiveStatus = "draft" | "pending_review" | "pending_signature" | "signed" | "sent_to_applicant";

export interface CreateWrittenDirectiveData {
  application_id: string;
  directive_number?: string;
  directive_content: string;
}

export const writtenDirectiveService = {
  async createDirective(data: CreateWrittenDirectiveData): Promise<WrittenDirective | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: directive, error } = await supabase
      .from("written_directives")
      .insert({
        ...data,
        prepared_by: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating written directive:", error);
      return null;
    }

    return directive;
  },

  async getDirectiveByApplicationId(applicationId: string): Promise<WrittenDirective | null> {
    const { data, error } = await supabase
      .from("written_directives")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching written directive:", error);
      return null;
    }

    return data;
  },

  async getAllDirectives(filters?: { status?: DirectiveStatus }): Promise<WrittenDirective[]> {
    let query = supabase
      .from("written_directives")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching written directives:", error);
      return [];
    }

    return data || [];
  },

  async updateDirectiveStatus(
    id: string,
    status: DirectiveStatus,
    additionalData?: {
      reviewed_by?: string;
      signed_by?: string;
      signed_date?: string;
      sent_date?: string;
    }
  ): Promise<WrittenDirective | null> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData,
    };

    const { data, error } = await supabase
      .from("written_directives")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating written directive:", error);
      return null;
    }

    return data;
  },

  async submitForReview(id: string): Promise<WrittenDirective | null> {
    return this.updateDirectiveStatus(id, "pending_review");
  },

  async submitForSignature(id: string, reviewedBy: string): Promise<WrittenDirective | null> {
    return this.updateDirectiveStatus(id, "pending_signature", { reviewed_by: reviewedBy });
  },

  async signDirective(id: string, signedBy: string): Promise<WrittenDirective | null> {
    return this.updateDirectiveStatus(id, "signed", {
      signed_by: signedBy,
      signed_date: new Date().toISOString(),
    });
  },

  async sendToApplicant(id: string): Promise<WrittenDirective | null> {
    return this.updateDirectiveStatus(id, "sent_to_applicant", {
      sent_date: new Date().toISOString(),
    });
  },

  async updateDirectiveContent(id: string, content: string): Promise<WrittenDirective | null> {
    const { data, error } = await supabase
      .from("written_directives")
      .update({
        directive_content: content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating directive content:", error);
      return null;
    }

    return data;
  }
};