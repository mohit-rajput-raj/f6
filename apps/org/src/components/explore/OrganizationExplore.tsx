"use client";

import React, { useState } from "react";
import {
  Building2,
  Search,
  Users,
  MapPin,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  Globe,
  Plus,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import {
  Organization,
  MockUser,
} from "@/lib/organization-data";

interface OrganizationExploreProps {
  organizations: Organization[];
  activeOrg: Organization | null;
  user: MockUser;
  onSelectOrgWorkspace: (org: Organization) => void;
  onRegisterClick: () => void;
  onRefresh: () => void;
}

export const OrganizationExplore: React.FC<OrganizationExploreProps> = ({
  organizations,
  activeOrg,
  user,
  onSelectOrgWorkspace,
  onRegisterClick,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingJoinOrg, setPendingJoinOrg] = useState<Organization | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const filteredOrgs = organizations.filter((org) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.slug.toLowerCase().includes(q) ||
      (org.description && org.description.toLowerCase().includes(q)) ||
      (org.location && org.location.toLowerCase().includes(q)) ||
      (org.tagline && org.tagline.toLowerCase().includes(q))
    );
  });

  const totalMembers = organizations.reduce((acc, o) => acc + (o.members?.length || 0), 0);
  const totalDesks = organizations.reduce((acc, o) => acc + (o.assignments?.length || 0), 0);

  const handleJoinClick = (org: Organization) => {
    if (activeOrg && activeOrg.id === org.id) {
      onSelectOrgWorkspace(org);
      return;
    }

    if (activeOrg && activeOrg.id !== org.id) {
      setPendingJoinOrg(org);
      setShowSwitchModal(true);
      return;
    }

    onSelectOrgWorkspace(org);
    toast.success(`Selected "${org.name}".`);
  };

  const handleConfirmSwitch = () => {
    if (!pendingJoinOrg) return;
    onSelectOrgWorkspace(pendingJoinOrg);
    toast.success(`Switched active organization to "${pendingJoinOrg.name}".`);
    setShowSwitchModal(false);
    setPendingJoinOrg(null);
  };

  const handleConfirmLeave = () => {
    if (!activeOrg) return;
    toast.info(`Left "${activeOrg.name}".`);
    setShowLeaveModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ============================================================
          TOP STATUS HERO BANNER
      ============================================================ */}
      {activeOrg ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 sm:p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {activeOrg.logoUrl ? (
                <img
                  src={activeOrg.logoUrl}
                  alt={activeOrg.name}
                  className="size-12 rounded-xl object-cover border border-emerald-500/40 shadow-sm"
                />
              ) : (
                <div className="size-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {activeOrg.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {activeOrg.name}
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium text-[10px]">
                    <CheckCircle2 className="size-3 mr-1 inline" /> Active Workspace
                  </Badge>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-1">
                  {activeOrg.tagline || activeOrg.description || "Active enterprise organization"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveModal(true)}
                className="text-xs text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="size-3.5 mr-1.5" />
                Leave
              </Button>
              <Button
                size="sm"
                onClick={() => onSelectOrgWorkspace(activeOrg)}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 shadow-sm"
              >
                Open Workspace
                <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Solo Operational Mode
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
                You are currently working in personal mode. Join an existing verified organization below to unlock shared team desks, collaborative MasterSheets, and departmental pipelines.
              </p>
            </div>
            <Button
              onClick={onRegisterClick}
              size="sm"
              className="text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
            >
              <Plus className="size-3.5 mr-1.5" />
              Register New Organization
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================
          METRICS RIBBON & DISCOVERY SEARCH
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Organizations
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {organizations.length}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Staff
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {totalMembers}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Active Desks
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {totalDesks}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Security Status
          </div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-2">
            <ShieldCheck className="size-4" /> Zero-Trust Verified
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations by name, domain, location..."
            className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegisterClick}
            className="text-xs h-9 border-neutral-200 dark:border-neutral-800"
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Org
          </Button>
        </div>
      </div>

      {/* ============================================================
          ORGANIZATIONS DIRECTORY GRID
      ============================================================ */}
      {filteredOrgs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center space-y-3 bg-neutral-50/50 dark:bg-neutral-900/20">
          <div className="size-12 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
            <Building2 className="size-6" />
          </div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No organizations match your query
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try adjusting your search criteria or register a brand-new enterprise organization.
          </p>
          <Button
            onClick={onRegisterClick}
            size="sm"
            className="text-xs mt-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          >
            Register Organization
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrgs.map((org) => {
            const isUserMember = org.members.some(
              (m) => m.email.toLowerCase() === user.email.toLowerCase()
            );
            const isOwner =
              org.ownerEmail.toLowerCase() === user.email.toLowerCase() ||
              org.ownerId === user.id;
            const isActiveCurrent = activeOrg?.id === org.id;

            return (
              <div
                key={org.id}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isActiveCurrent
                    ? "border-emerald-500/50 bg-emerald-500/[0.03] shadow-md dark:border-emerald-500/40"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="size-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs"
                        />
                      ) : (
                        <div className="size-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-base shadow-xs">
                          {org.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                            {org.name}
                          </h3>
                          {isActiveCurrent && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1.5">
                              Active
                            </Badge>
                          )}
                          {isOwner && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] py-0 px-1.5">
                              Owner
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400">
                          @{org.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                        <Users className="size-3" />
                        {org.members?.length ?? (org as any).membersCount ?? 1}
                      </span>
                    </div>
                  </div>

                  {/* Tagline / Description */}
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {org.tagline || org.description || "Enterprise organization workspace"}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                    {org.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-neutral-400" />
                        {org.location}
                      </span>
                    )}
                    {org.website && (
                      <a
                        href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 truncate max-w-[170px] hover:text-emerald-500 hover:underline transition-colors"
                      >
                        <Globe className="size-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{org.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</span>
                        <ExternalLink className="size-2.5 opacity-60 shrink-0" />
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FileSpreadsheet className="size-3 text-neutral-400" />
                      {org.assignments?.length || 0} Desks
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-neutral-400">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2">
                    {isActiveCurrent ? (
                      <Button
                        size="sm"
                        onClick={() => onSelectOrgWorkspace(org)}
                        className="text-xs h-8 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      >
                        Enter Workspace
                        <ArrowRight className="size-3.5 ml-1" />
                      </Button>
                    ) : isUserMember ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJoinClick(org)}
                        className="text-xs h-8"
                      >
                        Switch to this Org
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleJoinClick(org)}
                        className="text-xs h-8"
                      >
                        Join Organization
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          SWITCH ORG MODAL
      ============================================================ */}
      {showSwitchModal && pendingJoinOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Switch Organization Workspace?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                You are currently affiliated with <strong>{activeOrg?.name}</strong>. Enterprise policy allows membership in exactly one active organization at a time.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-300">
              Joining <strong>{pendingJoinOrg.name}</strong> will update your active organization context and grant access to its desks and pipelines.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSwitchModal(false);
                  setPendingJoinOrg(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSwitch}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Confirm & Switch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          LEAVE ORG MODAL
      ============================================================ */}
      {showLeaveModal && activeOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="size-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <LogOut className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Leave {activeOrg.name}?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Are you sure you want to leave this organization? You will revert to solo workspace mode and lose access to organization desks, discussions, and shared assets.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveModal(false)}
                className="text-xs"
              >
                Stay
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmLeave}
                className="text-xs font-semibold"
              >
                Confirm Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
