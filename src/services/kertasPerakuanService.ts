/**
 * Kertas Perakuan Service
 * Handles formal HOD endorsement paper operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface KertasPerakuanData {
  application_id: string;
  no_fail: string;
  no_id_online: string;
  tarikh_permohonan_lengkap: string;
  juru_perunding_nama?: string;
  juru_perunding_syarikat?: string;
  luas_m2: number;
  luas_hektar: number;
  luas_ekar: number;
  perakuan_teks: string;
  syor_perakuan: string;
  syarat_perakuan?: string;
  disediakan_oleh: string;
  jawatan: string;
  tarikh: string;
  status: string;
}

export interface AIDraftResult {
  syor_perakuan: string;
  perakuan_teks: string;
  syarat_perakuan: string;
  ringkasan_agensi: string;
}

export const kertasPerakuanService = {
  /**
   * Get Kertas Perakuan by application ID
   */
  async getByApplication(applicationId: string): Promise<any | null> {
    const { data, error } = await (supabase as any)
      .from("kertas_perakuan")
      .select("*")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create new Kertas Perakuan
   */
  async create(data: KertasPerakuanData): Promise<string> {
    const { data: result, error } = await (supabase as any)
      .from("kertas_perakuan")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result.id;
  },

  /**
   * Update Kertas Perakuan
   */
  async update(
    id: string,
    data: Partial<KertasPerakuanData>
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from("kertas_perakuan")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Generate AI draft recommendation
   */
  async generateAIDraft(
    ulasanPerancangan: any,
    agencyUlasan: any[]
  ): Promise<AIDraftResult> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Anthropic API key not configured");

      // Build agency summary
      const agencySummary = agencyUlasan
        .map(
          (a) =>
            `${a.kod_agensi}: ${a.keputusan_agensi} — ${a.ringkasan_ulasan || "Tiada ulasan"}`
        )
        .join("\n");

      const prompt = `ULASAN PERANCANGAN:
Seksyen E: ${ulasanPerancangan.seksyen_e_ulasan_keseluruhan || "Tiada ulasan"}
Syor Jabatan: ${ulasanPerancangan.syor_jabatan || "Tiada syor"}

ULASAN AGENSI:
${agencySummary}

Draft the Perakuan recommendation.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a Malaysian planning officer at Majlis Perbandaran Segamat. Draft a formal Perakuan (endorsement recommendation) for an OSC committee paper in formal Bahasa Malaysia. Based on the agency ulasan and JPL's internal Ulasan Perancangan, determine whether to recommend: Syor Lulus / Syor Lulus dengan Pindaan Pelan / Syor Tangguh / Syor Tolak. Return ONLY a JSON object with this exact structure (no explanation, no markdown):
{
  "syor_perakuan": "Syor Lulus",
  "perakuan_teks": "Berdasarkan semakan teknikal dan ulasan agensi, cadangan ini didapati mematuhi...",
  "syarat_perakuan": "1. Pemaju hendaklah...\n2. Peruntukan...",
  "ringkasan_agensi": "Ringkasan keseluruhan ulasan agensi dalam 2-3 ayat"
}`,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "AI request failed");
      }

      const data = await response.json();
      const textBlock = data.content?.find((block: any) => block.type === "text");
      if (!textBlock) throw new Error("No text content in AI response");

      const result = JSON.parse(textBlock.text);
      return result;
    } catch (error) {
      console.error("AI draft error:", error);
      throw error;
    }
  },

  /**
   * Generate PDF
   */
  async generatePDF(id: string): Promise<Blob> {
    // This would integrate with jsPDF or a server-side PDF service
    // For now, return placeholder
    throw new Error("PDF generation not implemented yet");
  },

  /**
   * Get recommendation color
   */
  getSyorColor(syor: string): string {
    switch (syor) {
      case "Syor Lulus":
        return "bg-green-100 text-green-800 border-green-200";
      case "Syor Lulus dengan Pindaan Pelan":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Syor Tangguh":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Syor Tolak":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  },
};