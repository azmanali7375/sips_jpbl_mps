/**
 * Public Holiday Service
 * Manages public holidays and working day calculations
 */

import { supabase } from "@/integrations/supabase/client";

export interface PublicHoliday {
  id: string;
  tarikh: string;
  nama_cuti: string;
  jenis_cuti: string | null;
  tahun: number | null;
  created_at: string;
}

export const publicHolidayService = {
  /**
   * Get all public holidays for a year
   */
  async getByYear(year: number): Promise<PublicHoliday[]> {
    try {
      const { data, error } = await supabase
        .from("public_holidays")
        .select("*")
        .eq("tahun", year)
        .order("tarikh", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching holidays:", error);
      return [];
    }
  },

  /**
   * Get all public holidays
   */
  async getAll(): Promise<PublicHoliday[]> {
    try {
      const { data, error } = await supabase
        .from("public_holidays")
        .select("*")
        .order("tarikh", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching all holidays:", error);
      return [];
    }
  },

  /**
   * Add a new public holiday
   */
  async create(holiday: {
    tarikh: string;
    nama_cuti: string;
    jenis_cuti: string;
    tahun: number;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("public_holidays")
        .insert(holiday)
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error("Error creating holiday:", error);
      throw error;
    }
  },

  /**
   * Update a public holiday
   */
  async update(
    id: string,
    updates: {
      tarikh?: string;
      nama_cuti?: string;
      jenis_cuti?: string;
      tahun?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("public_holidays")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating holiday:", error);
      throw error;
    }
  },

  /**
   * Delete a public holiday
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("public_holidays")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting holiday:", error);
      throw error;
    }
  },

  /**
   * Calculate working days between two dates
   */
  async calculateWorkingDays(startDate: string, endDate: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc("calculate_working_days", {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error("Error calculating working days:", error);
      return 0;
    }
  },

  /**
   * Add working days to a start date
   */
  async addWorkingDays(startDate: string, days: number): Promise<string> {
    try {
      const { data, error } = await supabase.rpc("add_working_days", {
        start_date: startDate,
        n: days,
      });

      if (error) throw error;
      return data || startDate;
    } catch (error) {
      console.error("Error adding working days:", error);
      return startDate;
    }
  },

  /**
   * Count holidays for a year
   */
  async countByYear(year: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("public_holidays")
        .select("*", { count: "exact", head: true })
        .eq("tahun", year);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting holidays:", error);
      return 0;
    }
  },

  /**
   * Bulk import holidays for a year
   */
  async bulkImport(holidays: Array<{
    tarikh: string;
    nama_cuti: string;
    jenis_cuti: string;
    tahun: number;
  }>): Promise<void> {
    try {
      const { error } = await supabase
        .from("public_holidays")
        .insert(holidays);

      if (error) throw error;
    } catch (error) {
      console.error("Error bulk importing holidays:", error);
      throw error;
    }
  },
};