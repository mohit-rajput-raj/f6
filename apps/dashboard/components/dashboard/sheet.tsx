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
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

// Sample extension data
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
}

export function ExtensionSheetDemo({ children }: { children: React.ReactNode }) {
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedIds, setInstalledIds] = useState<(number | string)[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [value, setValue] = useState("");

  const filteredExtensions = sampleExtensions.filter((ext) =>
    ext.name.toLowerCase().includes(value.toLowerCase())
  );

  const handleInstall = async (ext: Extension) => {
    setIsInstalling(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setInstalledIds((prev) => [...prev, ext.id]);
    setIsInstalling(false);
    toast.success(`Installed "${ext.name}"`);
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

          <div className="space-y-4 py-6 overflow-y-scroll">
            {filteredExtensions.length == 0 ? (
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
            identifier: `ext.${selectedExtension.id}`,
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