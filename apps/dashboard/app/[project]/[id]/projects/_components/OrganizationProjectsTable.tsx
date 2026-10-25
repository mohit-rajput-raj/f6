"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { useSession } from "@/lib/auth-client";
import { useEditorStore } from "@/stores/user.store";
import {
  getOrganizationProjectsForUserAction,
  type OrganizationProjectItem,
} from "../_actions";

export const OrganizationProjectsTable = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const { setDashidValue } = useEditorStore();

  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<OrganizationProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrgProjects = async () => {
    setLoading(true);
    try {
      const res = await getOrganizationProjectsForUserAction(
        user?.id,
        user?.email,
      );
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error("Failed to load organization projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgProjects();
  }, [user?.id, user?.email]);

  const handleOpenDesk = (projectId: string) => {
    setDashidValue(projectId);
    window.open(`/dashboard/dash/${projectId}/desk`, "_blank");
  };

  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.organizationName.toLowerCase().includes(q) ||
      (p.groupName && p.groupName.toLowerCase().includes(q)) ||
      (p.deskName && p.deskName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organization pipelines, desks, institutions..."
            className="pl-9 text-xs h-9 bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrgProjects}
            disabled={loading}
            className="text-xs h-9 border-zinc-800 text-zinc-300 hover:text-white"
          >
            <RefreshCw
              className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-zinc-900 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="size-10 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">
                {search
                  ? "No matching organization projects found"
                  : "No organization projects assigned yet"}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {search
                  ? `No desk projects match "${search}". Try searching for another organization or desk pipeline.`
                  : "When an organization handler creates projects for your desk group, they will appear here with instructions and formats."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/organizations")}
                className="text-xs border-zinc-700 text-zinc-200"
              >
                Explore Organizations
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="w-[30%] font-semibold text-zinc-300">
                  Organization Project
                </TableHead>
                <TableHead className="font-semibold text-zinc-300">
                  Organization
                </TableHead>
                <TableHead className="font-semibold text-zinc-300">
                  Desk Pipeline
                </TableHead>
                <TableHead className="font-semibold text-zinc-300">
                  Format / Category
                </TableHead>
                <TableHead className="font-semibold text-zinc-300">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-zinc-300">
                  Created
                </TableHead>
                <TableHead className="text-right font-semibold text-zinc-300">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-900 text-xs">
              {filtered.map((proj) => (
                <TableRow
                  key={proj.id}
                  className="hover:bg-zinc-900/40 border-zinc-900 transition-colors cursor-pointer"
                  onClick={() => handleOpenDesk(proj.id)}
                >
                  {/* Organization Project */}
                  <TableCell className="py-4">
                    <div className="flex items-start gap-2.5">
                      <FileSpreadsheet className="size-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-100 truncate">
                          {proj.name}
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {proj.description || "Operational desk pipeline"}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Organization */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {proj.organizationLogo ? (
                        <img
                          src={proj.organizationLogo}
                          alt={proj.organizationName}
                          className="size-5 rounded-md object-cover"
                        />
                      ) : (
                        <div className="size-5 rounded-md bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-300">
                          {proj.organizationName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-zinc-200">
                        {proj.organizationName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Desk Pipeline / Group */}
                  <TableCell className="py-4 text-zinc-300 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Layers className="size-3 text-zinc-500" />
                      <span>
                        {proj.deskName || proj.groupName || "Standard Desk"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Format Template */}
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-mono font-medium text-zinc-400 border-zinc-800 capitalize"
                    >
                      {proj.formatTemplate || "Standard"}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-semibold py-0.5 px-2">
                      <CheckCircle2 className="size-3 mr-1 inline" />{" "}
                      {proj.status}
                    </Badge>
                  </TableCell>

                  {/* Created Date */}
                  <TableCell className="py-4 font-mono text-[11px] text-zinc-400">
                    {new Date(proj.createdAt).toLocaleDateString()}
                  </TableCell>

                  {/* Action */}
                  <TableCell
                    className="py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDesk(proj.id)}
                      className="text-xs h-8 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1 font-semibold"
                    >
                      <span>Open Desk</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
