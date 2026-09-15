import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { spreadsheetService } from "@/services/spreadsheetService";
import { Spreadsheet } from "@/types/spreadsheet";

// Query keys for react-query
export const spreadsheetKeys = {
  all: ["spreadsheets"] as const,
  lists: () => [...spreadsheetKeys.all, "list"] as const,
  details: () => [...spreadsheetKeys.all, "detail"] as const,
  detail: (id: string) => [...spreadsheetKeys.details(), id] as const,
};

// Hook to fetch all spreadsheets (without loading entire heavy JSON bodies, just metadata)
export function useSpreadsheetsList() {
  return useQuery({
    queryKey: spreadsheetKeys.lists(),
    queryFn: () => spreadsheetService.listSpreadsheets(),
  });
}

// Hook to fetch a single spreadsheet by ID
export function useSpreadsheet(id: string | null | undefined) {
  return useQuery({
    queryKey: spreadsheetKeys.detail(id || ""),
    queryFn: () => spreadsheetService.getSpreadsheet(id!),
    enabled: !!id, // only run query if id is provided
  });
}

// Hook to create a spreadsheet
export function useCreateSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: any }) =>
      spreadsheetService.createSpreadsheet(name, data),
    onSuccess: () => {
      // Invalidate list query to trigger re-fetch of sheets dropdown/list
      queryClient.invalidateQueries({ queryKey: spreadsheetKeys.lists() });
    },
  });
}

// Hook to update a spreadsheet
export function useUpdateSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, data }: { id: string; name: string; data: any }) =>
      spreadsheetService.updateSpreadsheet(id, name, data),
    onSuccess: (data) => {
      // Invalidate the specific sheet's detail query
      queryClient.invalidateQueries({ queryKey: spreadsheetKeys.detail(data.id) });
      // Invalidate list query
      queryClient.invalidateQueries({ queryKey: spreadsheetKeys.lists() });
    },
  });
}

// Hook to delete a spreadsheet
export function useDeleteSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => spreadsheetService.deleteSpreadsheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spreadsheetKeys.lists() });
    },
  });
}
