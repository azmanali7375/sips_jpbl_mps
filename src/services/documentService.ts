import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { DocumentType } from "@/types";

export type Document = Tables<"documents">;

export const documentService = {
  async uploadDocument(
    applicationId: string,
    file: File,
    fileType: DocumentType
  ): Promise<Document | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Upload file to Supabase Storage
    const fileExtension = file.name.split(".").pop();
    const fileName = `${applicationId}/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("dc-documents")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return null;
    }

    // Create document record
    const { data, error } = await supabase
      .from("documents")
      .insert({
        application_id: applicationId,
        file_name: file.name,
        file_path: uploadData.path,
        file_type: fileType,
        file_extension: fileExtension,
        file_size: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating document record:", error);
      return null;
    }

    return data;
  },

  async getApplicationDocuments(applicationId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", applicationId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return [];
    }

    return data || [];
  },

  async getDocumentUrl(filePath: string): Promise<string | null> {
    const { data } = supabase.storage
      .from("dc-documents")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async downloadDocument(filePath: string, fileName: string): Promise<void> {
    const { data, error } = await supabase.storage
      .from("dc-documents")
      .download(filePath);

    if (error) {
      console.error("Error downloading file:", error);
      return;
    }

    // Create download link
    const url = window.URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async deleteDocument(id: string, filePath: string): Promise<boolean> {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("dc-documents")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      return false;
    }

    // Delete document record
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting document record:", error);
      return false;
    }

    return true;
  }
};