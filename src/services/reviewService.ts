import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Review = Tables<"reviews">;

export const reviewService = {
  // Add comment/review to an application
  async addReview(
    applicationId: string,
    comment: string,
    decision: "pending" | "approved" | "rejected" | "revision_required"
  ): Promise<Review | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        application_id: applicationId,
        officer_id: user.id,
        comment,
        decision,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding review:", error);
      return null;
    }

    // Update application status based on decision
    if (decision !== "pending") {
      const statusMap = {
        approved: "approved",
        rejected: "rejected",
        revision_required: "under_review",
      };

      await supabase
        .from("applications")
        .update({ 
          status: statusMap[decision],
          decision_date: decision === "approved" || decision === "rejected" 
            ? new Date().toISOString() 
            : undefined
        })
        .eq("id", applicationId);
    }

    return data;
  },

  // Get all reviews for an application
  async getApplicationReviews(applicationId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, profiles!reviews_officer_id_fkey(full_name, role)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }

    return data || [];
  },

  // Get officer's review statistics
  async getOfficerStats(officerId?: string): Promise<{
    total_reviewed: number;
    pending: number;
    approved_today: number;
    under_review: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetOfficerId = officerId || user?.id;
    
    if (!targetOfficerId) {
      return { total_reviewed: 0, pending: 0, approved_today: 0, under_review: 0 };
    }

    const { data: applications } = await supabase
      .from("applications")
      .select("status, decision_date, assigned_officer_id")
      .eq("assigned_officer_id", targetOfficerId);

    if (!applications) {
      return { total_reviewed: 0, pending: 0, approved_today: 0, under_review: 0 };
    }

    const today = new Date().toISOString().split("T")[0];

    return {
      total_reviewed: applications.length,
      pending: applications.filter(a => a.status === "submitted" || a.status === "registered").length,
      approved_today: applications.filter(a => 
        a.status === "approved" && 
        a.decision_date?.startsWith(today)
      ).length,
      under_review: applications.filter(a => a.status === "under_review").length,
    };
  },

  // Update review decision
  async updateReviewDecision(
    reviewId: string,
    decision: "approved" | "rejected" | "revision_required"
  ): Promise<boolean> {
    const { error } = await supabase
      .from("reviews")
      .update({ decision })
      .eq("id", reviewId);

    if (error) {
      console.error("Error updating review decision:", error);
      return false;
    }

    return true;
  }
};