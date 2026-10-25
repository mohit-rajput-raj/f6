export type OrganizationRole = "owner" | "admin" | "member";

export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  title?: string;
  avatar?: string;
  department?: string;
  joinedAt: string;
}

export interface OrganizationDeskAssignment {
  id: string;
  deskId: string;
  deskName: string;
  assignedToGroup?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  assignedAt: string;
  status: "active" | "in_progress" | "review";
}

export interface OrganizationAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "normal" | "urgent" | "event";
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export interface OrganizationAsset {
  id: string;
  name: string;
  type: "template" | "dataset" | "guideline" | "rule";
  description: string;
  downloadsCount: number;
  updatedAt: string;
}

export interface OrganizationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  channel: "general" | "announcements" | "staff";
  timestamp: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  members: OrganizationMember[];
  assignments: OrganizationDeskAssignment[];
  announcements: OrganizationAnnouncement[];
  assets: OrganizationAsset[];
  messages: OrganizationMessage[];
  rules: string[];
  status?: "ACTIVE" | "PENDING_DELETION" | string;
  deletionRequestedAt?: string | null;
  deletionReason?: string | null;
  deletionRequestedBy?: string | null;
  settings: {
    allowJoinRequests: boolean;
    autoApproveMembers: boolean;
    workingHours?: string;
    defaultDeskTemplate?: string;
  };
}

export interface OrganizationRegistrationDraft {
  step?: number;
  name?: string;
  slug?: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
  website?: string;
  departments?: string;
  rules?: string;
  lastUpdated?: number;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

/** Empty defaults - all real data comes from database */
export const MOCK_USERS: MockUser[] = [];
export const DEFAULT_ORGANIZATIONS: Organization[] = [];

/** Compatibility getters returning real empty states (no localStorage) */
export function getAllOrganizations(): Organization[] {
  return [];
}

export function getOrganizationById(id: string): Organization | undefined {
  return undefined;
}

export function getOrganizationBySlug(slug: string): Organization | undefined {
  return undefined;
}

export function getActiveOrganizationForUser(userEmail?: string): Organization | null {
  return null;
}

export function setActiveOrganizationForUser(userEmail: string, orgId: string): void {
  // Real active organization state is persisted directly in database via switchActiveOrganizationAction
}

export function joinOrganization(
  orgId: string,
  user: { id: string; name?: string; email: string; avatar?: string }
): { success: boolean; organization: Organization } {
  throw new Error("Join requests are managed via database API");
}

export function leaveOrganization(userEmail: string): void {
  // Handled via database API
}

export function createOrganization(
  data: any,
  user: any
): Organization {
  return {
    id: data.slug || `org-${Date.now()}`,
    name: data.name,
    slug: data.slug || "",
    logoUrl: data.logoUrl,
    tagline: data.tagline,
    description: data.description,
    website: data.website,
    contactEmail: data.contactEmail,
    phone: data.phone,
    location: data.location,
    ownerId: user?.id || "",
    ownerEmail: user?.email || "",
    createdAt: new Date().toISOString(),
    rules: data.rules || [],
    settings: {
      allowJoinRequests: true,
      autoApproveMembers: false,
    },
    members: [],
    assignments: [],
    announcements: [],
    assets: [],
    messages: [],
  };
}

export function updateOrganizationRecord(updatedOrg: Organization): void {
  // Updates persist to database via orgApi
}

export function deleteOrganizationRecord(orgId: string): void {
  // Handled via database API
}

export function resetOrganizationsToDefault(): void {
  // No localStorage demo data
}

export function getOrganizationDraft(userEmail?: string): OrganizationRegistrationDraft | null {
  return null;
}

export function saveOrganizationDraft(
  userEmail: string,
  draft: Partial<OrganizationRegistrationDraft>
): void {
  // No localStorage dummy draft
}

export function clearOrganizationDraft(userEmail?: string): void {
  // No-op
}
