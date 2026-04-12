"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@repo/ui/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/ui/sheet";
import { Badge } from "@repo/ui/components/ui/badge";
import { ExtensionDetailDialog } from "./appdetails";
import { Input } from "../ui/components";
import {
  Sparkles,
  Flame,
  Bug,
  Atom,
  Coffee,
  Download,
  Star,
  Users,
  Workflow,
} from "lucide-react";
import { getPublishedWorkflows, installWorkflow } from "@/app/[project]/dash/[dashid]/editor/_actions/publish.service";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

// Sample extension data (fallback when no published workflows)
const sampleExtensions: Extension[] = [
  {
    id: 1,
    name: "Prisma - Insider",
    publisher: "Prisma",
    icon: <Sparkles className="w-8 h-8 text-blue-500" />,
    description: "This is the Insider Build of the Prisma VS Code extension. Get the latest features and improvements before everyone else.",
    downloads: "2686ms",
    rating: 4.8,
    reviews: "1.2k",
    category: "Database",
    image: "https://picsum.photos/id/1015/600/400",
  },
  {
    id: 2,
    name: "Pyrefly - Python Language Tooling",
    publisher: "meta",
    icon: <Flame className="w-8 h-8 text-orange-500" />,
    description: "Python autocomplete, typechecking, code navigation, and more. Powered by advanced static analysis.",
    downloads: "45k",
    rating: 4.9,
    reviews: "3.4k",
    category: "Programming Languages",
    image: "https://picsum.photos/id/201/600/400",
  },
  {
    id: 3,
    name: "clangd",
    publisher: "llvm-vs-code-extensions",
    icon: <Bug className="w-8 h-8 text-cyan-500" />,
    description: "C/C++ completion, navigation, and insights powered by clangd.",
    downloads: "1.2M",
    rating: 4.7,
    reviews: "8.9k",
    category: "C/C++",
    image: "https://picsum.photos/id/237/600/400",
  },
  {
    id: 4,
    name: "Debugger for Java",
    publisher: "vscjava",
    icon: <Coffee className="w-8 h-8 text-red-500" />,
    description: "A lightweight Java debugger for Visual Studio Code.",
    downloads: "890k",
    rating: 4.6,
    reviews: "12k",
    category: "Java",
    image: "https://picsum.photos/id/180/600/400",
  },
  {
    id: 5,
    name: "ES7+ React/Redux/React-Native",
    publisher: "dsznajder",
    icon: <Atom className="w-8 h-8 text-blue-400" />,
    description: "Extensions for React, React-Native and Redux in JS/TS.",
    downloads: "14.8M",
    rating: 4.9,
    reviews: "45k",
    category: "JavaScript",
    image: "https://picsum.photos/id/1018/600/400",
  },
];

interface Extension {
  id: number | string;
  name: string;
  publisher: string;
  icon: React.ReactNode;
  description: string;
  downloads: string;
  rating: number;
  reviews: string;
  category: string;
  image: string;
  // Extra fields for published workflows
  publishedWorkflowId?: string;
  publishedDefinition?: any;
  inputSchema?: any;
  outputSchema?: any;
}

export function ExtensionSheetDemo({ children }: { children: React.ReactNode }) {
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedIds, setInstalledIds] = useState<(number | string)[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [value, setValue] = useState("");
  const [publishedExtensions, setPublishedExtensions] = useState<Extension[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  // Fetch published workflows on mount
  useEffect(() => {
    const fetchPublished = async () => {
      setIsLoading(true);
      try {
        const workflows = await getPublishedWorkflows();
        const mapped: Extension[] = workflows.map((w: any) => ({
          id: w.id,
          name: w.name,
          publisher: w.publisher?.name ?? "Unknown",
          icon: <span className="text-2xl">{w.icon || "⚡"}</span>,
          description: w.description ?? "A published workflow",
          downloads: `${w.downloads}`,
          rating: 4.5,
          reviews: `${w.downloads}`,
          category: w.categories?.[0] ?? "Workflow",
          image: "https://picsum.photos/id/1015/600/400",
          publishedWorkflowId: w.id,
          publishedDefinition: w.definition,
          inputSchema: w.inputSchema,
          outputSchema: w.outputSchema,
        }));
        setPublishedExtensions(mapped);
      } catch (err) {
        console.error("Failed to fetch published workflows:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublished();
  }, []);

  // Combine sample + published
  const allExtensions = [...publishedExtensions, ...sampleExtensions];

  const filteredExtensions = allExtensions.filter((ext) =>
    ext.name.toLowerCase().includes(value.toLowerCase())
  );

  const handleInstall = async (ext: Extension) => {
    if (!ext.publishedWorkflowId || !session?.user?.id) {
      // Fake install for sample extensions
      setIsInstalling(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setInstalledIds((prev) => [...prev, ext.id]);
      setIsInstalling(false);
      return;
    }

    setIsInstalling(true);
    try {
      const result = await installWorkflow({
        publishedWorkflowId: ext.publishedWorkflowId,
        userId: session.user.id,
      });

      if (result.alreadyInstalled) {
        toast.info("Workflow already installed");
      } else {
        toast.success(`Installed "${ext.name}"!`);
      }
      setInstalledIds((prev) => [...prev, ext.id]);
    } catch (err) {
      console.error("Install failed:", err);
      toast.error("Failed to install workflow");
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>

        <SheetContent className="w-[420px] sm:w-[480px] overflow-hidden flex flex-col dark bg-zinc-950 border-l border-zinc-800">
          <SheetHeader className="border-b border-zinc-800 pb-4">
            <SheetTitle className="text-xl font-semibold">
              {/* Extensions */}
            </SheetTitle>

            <SheetDescription className="text-zinc-400">
              Recommended and installed extensions
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <Input placeholder="Search extensions" id="search" value={value} onChange={(e) => {
              setValue(e.target.value);
            }} className="w-full" />
          </div>

          {/* Published workflows section */}
          {publishedExtensions.length > 0 && (
            <div className="px-4 pt-2">
              <Badge variant="outline" className="text-xs text-indigo-400 border-indigo-800">
                <Workflow className="w-3 h-3 mr-1" />
                {publishedExtensions.length} Published Workflow{publishedExtensions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          <div className="space-y-4 py-6 overflow-y-scroll">
            {isLoading ? (
              <div className="w-full text-text flex items-center justify-center py-8">
                <p className="text-zinc-400 animate-pulse">Loading marketplace...</p>
              </div>
            ) : filteredExtensions.length == 0 ? (
              <div className="w-full text-text flex items-center justify-center">
                <p>No extensions Available in Market</p>
              </div>
            ) : filteredExtensions.map((ext) => (
              <div
                key={ext.id}
                onClick={() => {
                  setSelectedExtension(ext);
                  setDetailOpen(true);
                }}
                className="group flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-900/70 border border-transparent hover:border-zinc-800 cursor-pointer transition-all duration-200"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {ext.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                      {ext.name}
                    </p>
                    {installedIds.includes(ext.id) && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-950 text-emerald-400">Installed</Badge>
                    )}
                    {ext.publishedWorkflowId && !installedIds.includes(ext.id) && (
                      <Badge variant="outline" className="text-[10px] border-indigo-700 text-indigo-400">Workflow</Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 truncate">{ext.publisher}</p>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1.5 leading-snug">
                    {ext.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <SheetFooter className="border-t border-zinc-800 pt-4">
            <SheetClose asChild>
              <Button variant="secondary" className="w-full">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Detail Dialog */}
      {selectedExtension && (
        <ExtensionDetailDialog
          extension={{
            ...selectedExtension,
            // Map fields to match the Extension interface expected by appdetails
            longDescription: selectedExtension.description,
            version: "1.0.0",
            lastUpdated: "recently",
            size: "—",
            published: "recently",
            identifier: selectedExtension.publishedWorkflowId || `ext.${selectedExtension.id}`,
            requirements: [],
            categories: [selectedExtension.category],
          } as any}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          isInstalled={installedIds.includes(selectedExtension.id)}
          onInstall={async () => {
            await handleInstall(selectedExtension);
          }}
        />
      )}
    </>
  );
}