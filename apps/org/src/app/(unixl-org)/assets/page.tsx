"use client";

import React, { useState } from "react";
import {
  Package,
  Plus,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  ExternalLink,
  Eye,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import {
  useOrganizationAssets,
  useCreateAssetMutation,
} from "@/hooks/use-organization-queries";
import { AssetsSkeleton } from "@/components/ui/skeletons";

export default function AssetsPage() {
  const { activeOrg, isOrganizer } = useOrg();
  const orgId = activeOrg?.id || "";

  const [activeFilter, setActiveFilter] = useState<"ALL" | "image" | "template" | "dataset">("ALL");
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState<"image" | "template" | "dataset" | "guideline">("image");
  const [fileUrl, setFileUrl] = useState("");
  const [description, setDescription] = useState("");

  const { data: assets = [], isLoading } = useOrganizationAssets(
    orgId,
    activeFilter === "ALL" ? undefined : activeFilter
  );
  const createAssetMutation = useCreateAssetMutation(orgId);

  if (!activeOrg) return null;

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter asset title");
      return;
    }

    createAssetMutation.mutate(
      {
        name: name.trim(),
        type,
        fileUrl: fileUrl.trim() || undefined,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          setShowAssetModal(false);
          setName("");
          setFileUrl("");
          setDescription("");
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="inline-flex rounded-xl p-1 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
          {(
            [
              { id: "ALL", label: "All Repository Assets" },
              { id: "image", label: "Images & Media" },
              { id: "template", label: "Templates" },
              { id: "dataset", label: "Datasets" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === t.id
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isOrganizer && (
          <Button
            size="sm"
            onClick={() => setShowAssetModal(true)}
            className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shrink-0"
          >
            <Plus className="size-3.5 mr-1.5" />
            Upload New Asset
          </Button>
        )}
      </div>

      {/* Asset Content */}
      {isLoading ? (
        <AssetsSkeleton count={6} />
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center space-y-3">
          <ImageIcon className="size-10 text-neutral-400 mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            No Assets Found
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Upload institutional assets, brand illustrations, screenshots, datasets, or desk templates for member teams.
          </p>
          {isOrganizer && (
            <Button
              size="sm"
              onClick={() => setShowAssetModal(true)}
              className="text-xs font-semibold mt-2"
            >
              <Plus className="size-3.5 mr-1.5" /> Upload Asset
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((ast: any) => {
            const isImage = ast.type === "image" || (ast.fileUrl && /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(ast.fileUrl));

            return (
              <div
                key={ast.id}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Visual Thumbnail for Images */}
                {isImage && (
                  <div
                    onClick={() => setPreviewImage(ast.fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80")}
                    className="relative h-44 w-full bg-neutral-100 dark:bg-neutral-950 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={ast.fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}
                      alt={ast.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium">
                      <Eye className="size-4" />
                      <span>Preview Image</span>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] uppercase tracking-wider">
                      {ast.type}
                    </Badge>
                    <span className="text-[10px] text-neutral-400">
                      {ast.downloadsCount || 0} downloads
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    {ast.name}
                  </h4>

                  <p className="text-xs text-neutral-500 line-clamp-2">
                    {ast.description || "Shared organization asset ready for desk integration."}
                  </p>
                </div>

                <div className="p-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400">
                    {ast.updatedAt ? new Date(ast.updatedAt).toLocaleDateString() : "Master"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ast.fileUrl && (
                      <a
                        href={ast.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-800"
                      >
                        <ExternalLink className="size-3" />
                        <span>Link</span>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success(`Downloading "${ast.name}"`)}
                      className="text-xs h-7 border-neutral-200 dark:border-neutral-800"
                    >
                      <Download className="size-3 mr-1" /> Get
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Upload New Asset */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Package className="size-4" />
                <span>Upload Organization Asset</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Register an image URL, master pipeline schema, or transformation template.
              </p>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Asset Title *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corporate Brand Guidelines & Logos"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Asset Type
                </label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full text-xs h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="image">Image / Graphic Asset</option>
                  <option value="template">Pipeline Template</option>
                  <option value="dataset">Master Dataset</option>
                  <option value="guideline">Policy & Guideline</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Asset / Image URL
                </label>
                <Input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what this asset is and which desks it serves..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssetModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createAssetMutation.isPending}
                  className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                >
                  {createAssetMutation.isPending ? "Uploading..." : "Publish Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fullscreen Image Lightbox Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img
            src={previewImage}
            alt="Asset Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
