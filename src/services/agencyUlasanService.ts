/**
 * Agency Ulasan Service
 * Handles agency technical review operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface AgencyUlasan {
  id: string;
  application_id: string;
  kod_agensi: string;
  nama_agensi: string;
  tarikh_ulasan: string | null;
  ringkasan_ulasan: string | null;
  keputusan_agensi: string;
  catatan: string | null;
  created_at: string;
}

export interface AgencyUlasanStats {
  tiada_halangan: number;
  dengan_syarat: number;
  tidak_menyokong: number;
  belum_ulasan: number;
  total: number;
  completion_percent: number;
}

export const agencyUlasanService = {
  /**
   * Get all agency reviews for an application
   */
  async getByApplication(applicationId: string): Promise<AgencyUlasan[]> {
    const { data, error } = await supabase
      .from("agency_ulasan")
      .select("*")
      .eq("application_id", applicationId)
      .order("nama_agensi", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calculate summary statistics
   */
  calculateStats(agencies: AgencyUlasan[]): AgencyUlasanStats {
    const stats = {
      tiada_halangan: 0,
      dengan_syarat: 0,
      tidak_menyokong: 0,
      belum_ulasan: 0,
      total: agencies.length,
      completion_percent: 0,
    };

    agencies.forEach((agency) => {
      switch (agency.keputusan_agensi) {
        case "Tiada Halangan":
          stats.tiada_halangan++;
          break;
        case "Tiada Halangan dengan Syarat":
          stats.dengan_syarat++;
          break;
        case "Belum Boleh Menyokong":
          stats.tidak_menyokong++;
          break;
        case "Tiada Ulasan":
          stats.belum_ulasan++;
          break;
      }
    });

    const completed = stats.total - stats.belum_ulasan;
    stats.completion_percent = stats.total > 0 ? (completed / stats.total) * 100 : 0;

    return stats;
  },

  /**
   * Update a single agency review
   */
  async updateAgency(
    id: string,
    updates: {
      tarikh_ulasan?: string | null;
      ringkasan_ulasan?: string | null;
      keputusan_agensi?: string;
      catatan?: string | null;
    }
  ) {
    const { error } = await supabase
      .from("agency_ulasan")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Import agency reviews from OSC text using Claude API
   */
  async importFromOSC(applicationId: string, oscText: string): Promise<number> {
    try {
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
          max_tokens: 1000,
          system: `Extract agency reviews from this OSC 3 Plus Kertas Perakuan text.
Return ONLY a valid JSON array with no explanation. Each object must have these exact fields:
- kod_agensi: uppercase agency code (e.g., "JBK", "TNB", "IWK")
- nama_agensi: full agency name in Bahasa Malaysia
- tarikh_ulasan: date in YYYY-MM-DD format or null if not mentioned
- ringkasan_ulasan: brief summary of the agency's review in Bahasa Malaysia
- keputusan_agensi: MUST be one of exactly these 4 values:
  * "Tiada Halangan"
  * "Tiada Halangan dengan Syarat"
  * "Belum Boleh Menyokong"
  * "Tiada Ulasan"

Example format:
[
  {
    "kod_agensi": "JBK",
    "nama_agensi": "Jabatan Bangunan MPS",
    "tarikh_ulasan": "2026-05-15",
    "ringkasan_ulasan": "Tiada halangan dari aspek bangunan",
    "keputusan_agensi": "Tiada Halangan"
  }
]

Return ONLY the JSON array, nothing else.`,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all agency reviews from this text:\n\n${oscText}`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Claude API request failed");
      }

      const data = await response.json();
      const textBlock = data.content?.find((block: any) => block.type === "text");
      if (!textBlock) throw new Error("No text content in API response");

      const extractedAgencies = JSON.parse(textBlock.text);

      if (!Array.isArray(extractedAgencies) || extractedAgencies.length === 0) {
        throw new Error("No agencies found in the provided text");
      }

      // Update existing agency records
      let updatedCount = 0;
      for (const agency of extractedAgencies) {
        // Find matching agency by kod_agensi
        const { data: existingAgency } = await supabase
          .from("agency_ulasan")
          .select("id")
          .eq("application_id", applicationId)
          .eq("kod_agensi", agency.kod_agensi)
          .maybeSingle();

        if (existingAgency) {
          // Update existing record
          await this.updateAgency(existingAgency.id, {
            tarikh_ulasan: agency.tarikh_ulasan || null,
            ringkasan_ulasan: agency.ringkasan_ulasan || null,
            keputusan_agensi: agency.keputusan_agensi,
          });
          updatedCount++;
        } else {
          // Insert new agency (for agencies not in standard list)
          const { error } = await supabase.from("agency_ulasan").insert({
            application_id: applicationId,
            kod_agensi: agency.kod_agensi,
            nama_agensi: agency.nama_agensi,
            tarikh_ulasan: agency.tarikh_ulasan || null,
            ringkasan_ulasan: agency.ringkasan_ulasan || null,
            keputusan_agensi: agency.keputusan_agensi,
          });
          if (!error) updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error("Error importing agency reviews:", error);
      throw error;
    }
  },

  /**
   * Get decision badge color
   */
  getDecisionColor(keputusan: string): string {
    switch (keputusan) {
      case "Tiada Halangan":
        return "bg-green-100 text-green-800 border-green-200";
      case "Tiada Halangan dengan Syarat":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Belum Boleh Menyokong":
        return "bg-red-100 text-red-800 border-red-200";
      case "Tiada Ulasan":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  },
};