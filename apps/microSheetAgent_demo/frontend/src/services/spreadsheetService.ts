import { createClient } from "@/utils/supabase/client";
import { Spreadsheet } from "@/types/spreadsheet";

const supabase = createClient();

export const spreadsheetService = {
  // Fetch a list of all spreadsheets
  async listSpreadsheets(): Promise<Spreadsheet[]> {
    const { data, error } = await supabase
      .from("spreadsheets")
      .select("id, name, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return data || [];
  },

  // Fetch a single spreadsheet by ID (including its JSON data)
  async getSpreadsheet(id: string): Promise<Spreadsheet> {
    const { data, error } = await supabase
      .from("spreadsheets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Spreadsheet not found");
    }
    return data;
  },

  // Create a new spreadsheet
  async createSpreadsheet(name: string, data: any): Promise<Spreadsheet> {
    const { data: insertedData, error } = await supabase
      .from("spreadsheets")
      .insert({ name, data })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return insertedData;
  },

  // Update an existing spreadsheet
  async updateSpreadsheet(id: string, name: string, data: any): Promise<Spreadsheet> {
    const { data: updatedData, error } = await supabase
      .from("spreadsheets")
      .update({ name, data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return updatedData;
  },

  // Delete a spreadsheet
  async deleteSpreadsheet(id: string): Promise<void> {
    const { error } = await supabase
      .from("spreadsheets")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  }
};
