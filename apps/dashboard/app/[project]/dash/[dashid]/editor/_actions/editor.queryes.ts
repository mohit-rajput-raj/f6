'use client'
import { useQuery } from "@tanstack/react-query"
import { getAllWorkFlow, GETusers, getWorkFlow } from "./editor.service"






export const getUsersall = ()=>{
    return useQuery({
        queryKey:["getAlluser"],
        queryFn:()=>GETusers(),
        staleTime:2000
    })
}

export const useAllWorkFlow = (id:string)=>{
    return useQuery({
        queryKey:["getAllWorkFlow"],
        queryFn:()=>getAllWorkFlow(id),
        staleTime:Infinity,
        enabled:!!id,
        retryOnMount:false,
        refetchOnReconnect:true,
        refetchOnWindowFocus:false
    })
}
export const usegetWorkFlow = (id:string)=>{
    return useQuery({
        queryKey:["getWorkFlowjj", id],
        queryFn:()=>getWorkFlow(id),
        staleTime:Infinity,
        enabled:!!id,
        retryOnMount:false,
        refetchOnReconnect:true,
        refetchOnWindowFocus:false
    })
}