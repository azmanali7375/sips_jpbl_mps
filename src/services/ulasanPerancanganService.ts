/**
 * Ulasan Perancangan Service
 * Handles JPL internal planning narrative review operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface UlasanPerancanganData {
  application_id: string;
  no_rujukan_fail: string;
  seksyen_a_mylcp_score?: string;
  seksyen_b_semakan_ulasan?: string;
  seksyen_c_isu_berkaitan?: string;
  seksyen_d_pindaan_pelan?: string;
  seksyen_e_ulasan_keseluruhan?: string;
  syor_jabatan?: string;
  disediakan_oleh?: string;
  jawatan?: string;
  tarikh?: string;
  status?: "Draf" | "Dikemukakan";
}

export const ulasanPerancanganService = {
  /**
   * Get ulasan perancangan for an application
   */
  async getByApplicationId(applicationId: string) {
    const { data, error } = await supabase
      .from("ulasan_perancangan")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create new ulasan perancangan
   */
  async create(data: UlasanPerancanganData) {
    const { data: result, error } = await supabase
      .from("ulasan_perancangan")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  /**
   * Update existing ulasan perancangan
   */
  async update(id: string, data: Partial<UlasanPerancanganData>) {
    const { data: result, error } = await supabase
      .from("ulasan_perancangan")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  /**
   * Submit ulasan perancangan (change status to Dikemukakan)
   */
  async submit(id: string) {
    const { data, error } = await supabase
      .from("ulasan_perancangan")
      .update({ status: "Dikemukakan" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Generate AI suggestion for Section B (review of technical report findings)
   */
  async generateSectionBSuggestion(applicationId: string): Promise<string> {
    try {
      // Get technical report data
      const { data: technicalReports } = await supabase
        .from("laporan_teknikal")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!technicalReports || technicalReports.length === 0) {
        return "Laporan teknikal belum disediakan.";
      }

      const report = technicalReports[0];

      // Call Claude API for narrative summary
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Anthropic API key not configured");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You are a senior planning officer at Majlis Perbandaran Segamat reviewing technical report findings. Write a concise narrative summary in formal Bahasa Malaysia (100-150 words) of the compliance findings. Focus on key parameters and their compliance status. Use third-person formal tone.`,
          messages: [
            {
              role: "user",
              content: `Sila ringkaskan penemuan laporan teknikal ini dalam bentuk naratif:\n\n${JSON.stringify(report, null, 2)}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Claude API request failed");
      }

      const data = await response.json();
      const textBlock = data.content?.find((block: any) => block.type === "text");
      return textBlock?.text || "Gagal menjana cadangan AI.";
    } catch (error) {
      console.error("Error generating Section B suggestion:", error);
      return "Ralat semasa menjana cadangan AI. Sila cuba lagi.";
    }
  },

  /**
   * Generate AI suggestion for Section C (issues)
   */
  async generateSectionCSuggestion(applicationId: string): Promise<string> {
    try {
      // Get non-compliant parameters from technical report
      const { data: technicalReports } = await supabase
        .from("laporan_teknikal")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!technicalReports || technicalReports.length === 0) {
        return "Tiada isu dikesan pada peringkat ini.";
      }

      const report = technicalReports[0];

      // Call Claude API to identify issues
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Anthropic API key not configured");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: `You are a senior planning officer identifying planning issues. List 3-5 key issues from non-compliant parameters in formal Bahasa Malaysia. Use bullet points. Focus on technical, legal, and planning concerns that require attention.`,
          messages: [
            {
              role: "user",
              content: `Kenalpasti isu-isu berkaitan permohonan ini berdasarkan laporan teknikal:\n\n${JSON.stringify(report, null, 2)}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Claude API request failed");
      }

      const data = await response.json();
      const textBlock = data.content?.find((block: any) => block.type === "text");
      return textBlock?.text || "Tiada isu dikesan pada peringkat ini.";
    } catch (error) {
      console.error("Error generating Section C suggestion:", error);
      return "Ralat semasa menjana cadangan AI. Sila cuba lagi.";
    }
  },
};