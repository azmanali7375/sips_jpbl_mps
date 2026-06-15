import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type LandLot = Database["public"]["Tables"]["land_lots"]["Row"];
type LandLotInsert = Database["public"]["Tables"]["land_lots"]["Insert"];
type LandLotUpdate = Database["public"]["Tables"]["land_lots"]["Update"];

/**
 * Fetch all land lots for an application
 */
export async function getLandLots(applicationId: string): Promise<LandLot[]> {
  const { data, error } = await supabase
    .from("land_lots")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching land lots:", error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new land lot
 */
export async function createLandLot(
  landLot: Omit<LandLotInsert, "id" | "created_at" | "updated_at">
): Promise<LandLot> {
  const { data, error } = await supabase
    .from("land_lots")
    .insert(landLot)
    .select()
    .single();

  if (error) {
    console.error("Error creating land lot:", error);
    throw error;
  }

  return data;
}

/**
 * Update an existing land lot
 */
export async function updateLandLot(
  id: string,
  updates: LandLotUpdate
): Promise<LandLot> {
  const { data, error } = await supabase
    .from("land_lots")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating land lot:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a land lot
 */
export async function deleteLandLot(id: string): Promise<void> {
  const { error } = await supabase
    .from("land_lots")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting land lot:", error);
    throw error;
  }
}

/**
 * Bulk import land lots from CSV data
 * Expected CSV format: jenis_lot, no_lot, pemilik_tanah, kategori, syarat_nyata
 */
export async function bulkImportLandLots(
  applicationId: string,
  csvData: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const lines = csvData.trim().split("\n");
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Split by comma, handle quoted values
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

      if (values.length < 2) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: Format tidak lengkap (minimum: jenis_lot, no_lot)`);
        continue;
      }

      const landLot: Omit<LandLotInsert, "id" | "created_at" | "updated_at"> = {
        application_id: applicationId,
        jenis_lot: values[0] || "",
        no_lot: values[1] || "",
        pemilik_tanah: values[2] || null,
        kategori: values[3] || null,
        syarat_nyata: values[4] || null,
        catatan: values[5] || null,
      };

      await createLandLot(landLot);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Baris ${i + 1}: ${error instanceof Error ? error.message : "Ralat tidak diketahui"}`);
    }
  }

  return results;
}

/**
 * Kategori land lot options
 */
export const KATEGORI_OPTIONS = [
  "Bangunan",
  "Pertanian",
  "Perindustrian",
  "Rizab Kerajaan",
  "Lain-lain",
] as const;