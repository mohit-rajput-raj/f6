"use client";

import React, { useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import { OrganizationAnnouncement } from "@/lib/organization-data";

export default function AnnouncementsPage() {
  const { activeOrg, currentUser, updateOrg } = useOrg();
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState("");
  const [newAnnounceContent, setNewAnnounceContent] = useState("");
  const [newAnnouncePriority, setNewAnnouncePriority] = useState<"normal" | "urgent" | "event">("normal");

  if (!activeOrg) return null;

  const handleCreateAnnouncement = () => {
    if (!newAnnounceTitle.trim() || !newAnnounceContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    const newAnn: OrganizationAnnouncement = {
      id: `ann-${Date.now()}`,
      title: newAnnounceTitle.trim(),
      content: newAnnounceContent.trim(),
      priority: newAnnouncePriority,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      createdAt: new Date().toISOString().split("T")[0],
    };

    updateOrg({
      ...activeOrg,
      announcements: [newAnn, ...(activeOrg.announcements || [])],
    });

    setShowAnnounceModal(false);
    setNewAnnounceTitle("");
    setNewAnnounceContent("");
    toast.success("Broadcast notice published across organization");
  };

  const handleDeleteAnnouncement = (id: string) => {
    updateOrg({
      ...activeOrg,
      announcements: (activeOrg.announcements || []).filter((a) => a.id !== id),
    });
    toast.info("Announcement removed");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Institutional Broadcasts & Notices
          </h2>
          <p className="text-xs text-neutral-500">
            Official communications visible across all departmental workspaces and desk operators.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAnnounceModal(true)}
          className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        >
          <Plus className="size-3.5 mr-1.5" />
          Create Announcement
        </Button>
      </div>

      <div className="space-y-3">
        {(activeOrg.announcements || []).map((ann) => (
          <div
            key={ann.id}
            className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    {ann.title}
                  </h4>
                  <Badge
                    className={`text-[9px] ${
                      ann.priority === "urgent"
                        ? "bg-red-500/10 text-red-600 border-red-500/20"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {ann.priority}
                  </Badge>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Published by {ann.authorName} ({ann.authorRole}) · {ann.createdAt}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAnnouncement(ann.id)}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
              {ann.content}
            </p>
          </div>
        ))}
      </div>

      {/* Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Create Organization Announcement
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Title *
                </label>
                <Input
                  value={newAnnounceTitle}
                  onChange={(e) => setNewAnnounceTitle(e.target.value)}
                  placeholder="e.g. Schedule Maintenance & Schema Cutover"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Content *
                </label>
                <textarea
                  value={newAnnounceContent}
                  onChange={(e) => setNewAnnounceContent(e.target.value)}
                  rows={4}
                  placeholder="Write announcement details..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Priority
                </label>
                <select
                  value={newAnnouncePriority}
                  onChange={(e) => setNewAnnouncePriority(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                >
                  <option value="normal" className="bg-white dark:bg-neutral-900">Normal Bulletin</option>
                  <option value="urgent" className="bg-white dark:bg-neutral-900">Urgent Notice</option>
                  <option value="event" className="bg-white dark:bg-neutral-900">Event / Milestone</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnnounceModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateAnnouncement}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Publish Notice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
