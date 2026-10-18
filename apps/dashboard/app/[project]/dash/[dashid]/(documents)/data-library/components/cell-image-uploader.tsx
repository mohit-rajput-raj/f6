"use client";

import React, { useState, useRef } from "react";
import { uploadImage } from "@/lib/imageUpload";
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
  Check,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";

interface CellImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  compact?: boolean;
}

export const CellImageUploader: React.FC<CellImageUploaderProps> = ({
  value,
  onChange,
  placeholder = "Upload image or paste URL...",
  compact = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageValue =
    Boolean(value) &&
    (value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image/") ||
      value.startsWith("/") ||
      /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(value));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadImage(formData);

      if (res.success && res.url) {
        onChange(res.url);
        toast.success("Image uploaded & link attached!");
      } else {
        toast.error(res.error || "Failed to upload image");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("An error occurred during image upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleApplyUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setInputUrl("");
    setShowUrlInput(false);
    toast.success("Image link saved");
  };

  const copyToClipboard = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success("Image link copied to clipboard");
  };

  // Compact variant for table cells or minimal rows
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {isImageValue ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative group shrink-0">
              <img
                src={value}
                alt="Cell preview"
                className="size-7 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-xs"
                title="Remove image"
              >
                <X className="size-2.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer truncate"
            >
              Replace
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-6.5 text-[10px] px-2 py-0 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            {isUploading ? (
              <Loader2 className="size-2.5 animate-spin mr-1" />
            ) : (
              <Upload className="size-2.5 mr-1 text-zinc-500" />
            )}
            <span>Add Image</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {isImageValue ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative group shrink-0">
              <img
                src={value}
                alt="Uploaded preview"
                className="size-11 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-2xs"
              />
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition"
                title="Open full size"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate" title={value}>
                {value.startsWith("data:") ? "Local Image Data (Saved in cell)" : value}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <Copy className="size-2.5" />
                  <span>Copy link</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="hover:text-zinc-800 dark:hover:text-zinc-300 underline cursor-pointer"
                >
                  Change file
                </button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500 shrink-0"
            title="Remove image"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : showUrlInput ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste image link (https://...)"
            className="h-8 text-xs bg-background"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={handleApplyUrl}
            className="h-8 px-2.5 text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shrink-0"
          >
            <Check className="size-3 mr-1" />
            <span>Save</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(false)}
            className="h-8 px-2 text-xs text-zinc-500 shrink-0"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* File Picker from browser */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-8 text-xs px-3 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex-1 justify-center cursor-pointer shadow-2xs"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <Upload className="size-3.5 mr-1.5 text-zinc-500" />
            )}
            <span>{isUploading ? "Uploading image..." : "Browse & Upload Image"}</span>
          </Button>

          {/* Or Paste URL */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUrlInput(true)}
            className="h-8 text-xs px-3 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            <LinkIcon className="size-3 mr-1 text-zinc-400" />
            <span>Paste URL</span>
          </Button>
        </div>
      )}
    </div>
  );
};
