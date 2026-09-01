'use client'
import { useQuery, useMutation } from "@tanstack/react-query"
import { getAllWorkFlow, GETusers, getWorkFlow } from "./editor.service"
import { pypApi } from "@/lib/axios"

export interface DynamicAlignPayload {
  master_grid: any[][];
  csv_string: string;
  target_column_path: string;
  custom_prompt?: string;
  sheet_name?: string;
  provider?: string;
  api_key?: string;
  model?: string;
}

export const useDynamicAlignSchema = () => {
  return useMutation({
    mutationFn: async (payload: DynamicAlignPayload) => {
      const response = await pypApi.post("/ai/dynamic-align-schema", payload);
      return response.data;
    },
  });
};

export const getUsersall = () => {
  return useQuery({
    queryKey: ["getAlluser"],
    queryFn: () => GETusers(),
    staleTime: 2000,
  })
}

export const useAllWorkFlow = (id: string) => {
  return useQuery({
    queryKey: ["getAllWorkFlow"],
    queryFn: () => getAllWorkFlow(id),
    staleTime: Infinity,
    enabled: !!id,
    retryOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  })
}

export const usegetWorkFlow = (id: string) => {
  return useQuery({
    queryKey: ["getWorkFlowjj", id],
    queryFn: () => getWorkFlow(id),
    staleTime: Infinity,
    enabled: !!id,
    retryOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  })
}