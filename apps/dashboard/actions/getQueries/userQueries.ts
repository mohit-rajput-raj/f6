

import { useQuery } from "@tanstack/react-query";
import { getAllPosts, getAllusers } from "../automations";

export const useUsersQueries = () => {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: () => getAllusers(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
   
  });
}
export const usePostsQueries = () => {
  return useQuery({
    queryKey: ["all-posts"],
    queryFn: () => getAllPosts(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
   
  });
}