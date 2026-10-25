"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi, DBGroup, DBMember, DBAsset, DBJoinRequest, DBOrganization, DBProject } from "@/lib/org-api";
import { toast } from "sonner";

// ── Query Keys ──
export const ORG_QUERY_KEYS = {
  publicOrgs: (search?: string) => ["organizations", "public", search || ""],
  orgDetails: (idOrSlug: string) => ["organization", idOrSlug],
  members: (orgId: string) => ["organization", orgId, "members"],
  groups: (orgId: string) => ["organization", orgId, "groups"],
  groupDetails: (groupId: string) => ["group", groupId],
  joinRequests: (orgId: string, status?: string) => ["organization", orgId, "joinRequests", status || "ALL"],
  assets: (orgId: string, type?: string) => ["organization", orgId, "assets", type || "ALL"],
  projects: (orgId: string) => ["organization", orgId, "projects"],
  userStars: (userId: string, currentUserId?: string) => ["user", userId, "stars", currentUserId || ""],
};

// ── Organizations Hooks ──

export function usePublicOrganizations(search?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.publicOrgs(search),
    queryFn: () => orgApi.getPublicOrganizations(search),
  });
}

export function useOrganizationDetails(idOrSlug?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.orgDetails(idOrSlug || ""),
    queryFn: () => orgApi.getOrganizationDetails(idOrSlug!),
    enabled: Boolean(idOrSlug),
  });
}

export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizerId, data }: { organizerId: string; data: any }) =>
      orgApi.createOrganization(organizerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization workspace initialized successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create organization");
    },
  });
}

// ── Members & Employees Hooks ──

export function useOrganizationMembers(orgId?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.members(orgId || ""),
    queryFn: () => orgApi.getMembers(orgId!),
    enabled: Boolean(orgId),
  });
}

export function useAddMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; role?: any; title?: string; department?: string }) =>
      orgApi.addMember(orgId, data),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.members(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      toast.success(`Staff member "${newMember.name}" invited successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add member");
    },
  });
}

export function useRemoveMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => orgApi.removeMember(orgId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.members(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      toast.success("Member removed from organization");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove member");
    },
  });
}

// ── Desk Groups Hooks ──

export function useOrganizationGroups(orgId?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.groups(orgId || ""),
    queryFn: () => orgApi.getGroups(orgId!),
    enabled: Boolean(orgId),
  });
}

export function useGroupDetails(groupId?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.groupDetails(groupId || ""),
    queryFn: () => orgApi.getGroupById(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroupMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug?: string;
      description?: string;
      deskName?: string;
      memberIds: string[];
      leaderId?: string;
    }) => orgApi.createGroup(orgId, data),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groups(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      toast.success(`Desk Group "${newGroup.name}" created with assigned team!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create group");
    },
  });
}

export function useSetGroupLeaderMutation(groupId: string, orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newLeaderMemberId: string) => orgApi.setGroupLeader(groupId, newLeaderMemberId),
    onSuccess: (updatedGroup) => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groupDetails(groupId) });
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groups(orgId) });
        queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      }
      toast.success(`Group leadership ownership transferred to ${updatedGroup.leaderName || "new leader"}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to transfer group leadership");
    },
  });
}

export function useAddMemberToGroupMutation(groupId: string, orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role?: string }) =>
      orgApi.addMemberToGroup(groupId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groupDetails(groupId) });
      if (orgId) queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groups(orgId) });
      toast.success("Employee added to desk group");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add member to group");
    },
  });
}

export function useRemoveMemberFromGroupMutation(groupId: string, orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => orgApi.removeMemberFromGroup(groupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groupDetails(groupId) });
      if (orgId) queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.groups(orgId) });
      toast.success("Employee removed from desk group");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove member from group");
    },
  });
}

// ── Join Requests Hooks ──

export function useJoinRequests(orgId?: string, status?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.joinRequests(orgId || "", status),
    queryFn: () => orgApi.getJoinRequests(orgId!, status),
    enabled: Boolean(orgId),
  });
}

export function useSubmitJoinRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      organizationId: string;
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
      department?: string;
      message?: string;
    }) => orgApi.submitJoinRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Application submitted! The organization admin will review your request.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit join request");
    },
  });
}

export function useReviewJoinRequestMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      reviewerName,
    }: {
      requestId: string;
      action: "approve" | "reject";
      reviewerName: string;
    }) => orgApi.reviewJoinRequest(requestId, action, reviewerName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.joinRequests(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.members(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      if (variables.action === "approve") {
        toast.success("Member approved and added to organizational staff!");
      } else {
        toast.info("Join request rejected.");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to review join request");
    },
  });
}

// ── Assets Hooks (Images) ──

export function useOrganizationAssets(orgId?: string, type?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.assets(orgId || "", type),
    queryFn: () => orgApi.getAssets(orgId!, type),
    enabled: Boolean(orgId),
  });
}

export function useCreateAssetMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type?: "image" | "template" | "dataset" | "guideline";
      fileUrl?: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
    }) => orgApi.createAsset(orgId, data),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.assets(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      toast.success(`Asset "${asset.name}" uploaded successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create asset");
    },
  });
}

// ── Projects Hooks ──

export function useOrganizationProjects(orgId?: string) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.projects(orgId || ""),
    queryFn: () => orgApi.getProjects(orgId!),
    enabled: Boolean(orgId),
  });
}

export function useCreateProjectMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; creatorEmail?: string; creatorName?: string }) =>
      orgApi.createProject(orgId, data),
    onSuccess: (proj) => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.projects(orgId) });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgDetails(orgId) });
      toast.success(`Project "${proj.name}" added to organization`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create project");
    },
  });
}

// ── Group Desk Projects (Real Workflows) Hooks ──

export function useGroupDeskProjects(groupId?: string) {
  return useQuery({
    queryKey: ["group", groupId, "desk-projects"],
    queryFn: () => orgApi.getGroupDeskProjects(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroupDeskProjectMutation(groupId: string, orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      instructions?: string;
      formatTemplate?: string;
      organizerEmail?: string;
      leaderEmail?: string;
    }) =>
      orgApi.createGroupDeskProject({
        groupId,
        organizationId: orgId!,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "desk-projects"] });
      toast.success("Group project created successfully with format template and instructions!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create group project");
    },
  });
}

export function useDeleteGroupDeskProjectMutation(groupId: string, orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => orgApi.deleteGroupDeskProject(workflowId, orgId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "desk-projects"] });
      toast.success("Group project deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete group project");
    },
  });
}

