import { supabase } from "@/integrations/supabase/client";

export interface PlanningDocument {
  id: string;
  document_code: string;
  document_name: string;
  document_full_name: string | null;
  year: number | null;
  authority: string | null;
  file_url: string | null;
  total_chunks: number;
  status: string;
  last_processed_at: string | null;
  created_at: string;
}

export interface PolicyChunk {
  id: string;
  document_name: string;
  document_code: string;
  chapter_number: string | null;
  section_number: string | null;
  section_title: string | null;
  content_text: string;
  page_number: number | null;
  land_use_tags: string[] | null;
  topic_tags: string[] | null;
  keywords_text: string | null;
  created_at: string;
}

export const policyLibraryService = {
  async getAllDocuments(): Promise<PlanningDocument[]> {
    const { data, error } = await supabase
      .from("planning_documents")
      .select("*")
      .order("document_code");

    if (error) throw error;
    return data || [];
  },

  async uploadPDF(documentCode: string, file: File): Promise<string> {
    const timestamp = Date.now();
    const filePath = `${documentCode}/${documentCode}_${timestamp}.pdf`;

    const { data, error } = await supabase.storage
      .from("planning-documents")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("planning-documents")
      .getPublicUrl(filePath);

    // Update planning_documents with file_url
    await supabase
      .from("planning_documents")
      .update({ file_url: publicUrlData.publicUrl })
      .eq("document_code", documentCode);

    return publicUrlData.publicUrl;
  },

  async updateDocumentStatus(
    documentCode: string,
    status: string,
    totalChunks?: number
  ) {
    const updates: any = { status };
    if (totalChunks !== undefined) {
      updates.total_chunks = totalChunks;
      updates.last_processed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("planning_documents")
      .update(updates)
      .eq("document_code", documentCode);

    if (error) throw error;
  },

  async savePolicyChunks(chunks: Omit<PolicyChunk, "id" | "created_at">[]) {
    const { data, error } = await supabase
      .from("policy_chunks")
      .insert(chunks);

    if (error) throw error;
    return data;
  },

  async searchPolicies(params: {
    query?: string;
    documentCodes?: string[];
    topicTag?: string;
    landUseTag?: string;
    limit?: number;
  }): Promise<PolicyChunk[]> {
    let queryBuilder = supabase
      .from("policy_chunks")
      .select("*")
      .order("document_code")
      .order("section_number");

    if (params.query) {
      queryBuilder = queryBuilder.textSearch("content_text", params.query);
    }

    if (params.documentCodes && params.documentCodes.length > 0) {
      queryBuilder = queryBuilder.in("document_code", params.documentCodes);
    }

    if (params.topicTag) {
      queryBuilder = queryBuilder.contains("topic_tags", [params.topicTag]);
    }

    if (params.landUseTag) {
      queryBuilder = queryBuilder.contains("land_use_tags", [params.landUseTag]);
    }

    if (params.limit) {
      queryBuilder = queryBuilder.limit(params.limit);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data || [];
  },

  async deleteAllChunks(documentCode: string) {
    const { error } = await supabase
      .from("policy_chunks")
      .delete()
      .eq("document_code", documentCode);

    if (error) throw error;
  },
};