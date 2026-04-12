"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@repo/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog";
import { Badge } from "@repo/ui/components/ui/badge";
import { Separator } from "@repo/ui/components/ui/separator";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import {
    Download, Star, Calendar, HardDrive, Clock, Users
} from "lucide-react";

interface Extension {
    id: number;
    name: string;
    publisher: string;
    icon: React.ReactNode;
    description: string;
    longDescription?: string;
    downloads: string;
    rating: number;
    reviews: string;
    category: string;
    image: string;
    version: string;
    lastUpdated: string;
    size: string;
    published: string;
    identifier: string;
    requirements?: string[];
    categories: string[];
    screenshots?: string[];   // Add more images to show "How it works"

}

const sampleExtension: Extension = {
    id: 1,
    name: "Go",
    publisher: "golang",
    icon: <span className="text-5xl">🐹</span>, // or use real SVG
    description: "Rich Go language support for Visual Studio Code",
    longDescription: "This workflow provides rich and viltered data support for the your dashboard.",
    downloads: "16,749,332",
    rating: 4.8,
    reviews: "9",
    category: "Programming Languages",
    image: "https://picsum.photos/id/1015/800/450",
    version: "0.52.2",
    lastUpdated: "4 days ago",
    size: "2.82MB",
    published: "5 years ago",
    identifier: "golang.go",
    requirements: [
        "Visual Studio Code 1.90 or newer",
        "Go 1.21 or newer"
    ],
    categories: ["Programming Languages", "Snippets", "Linters", "Debuggers", "Formatters", "Testing"],
    screenshots: [
        "https://picsum.photos/id/1015/800/450",
        "https://picsum.photos/id/201/800/450",
        "https://picsum.photos/id/237/800/450",
    ]
};

export function ExtensionDetailDialog({
    extension = sampleExtension,
    open,
    onOpenChange,
    onInstall,
    isInstalled = false,
}: {
    extension?: Extension;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInstall?: () => Promise<void>;
    isInstalled?: boolean;
}) {
    const [isInstalling, setIsInstalling] = useState(false);

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            if (onInstall) {
                await onInstall();
            } else {
                await new Promise(resolve => setTimeout(resolve, 1500));
                alert("✅ Extension installed successfully!");
            }
        } catch (err) {
            console.error("Install failed:", err);
        } finally {
            setIsInstalling(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="min-w-full xl:min-w-[92vw] h-[92vh] p-0 dark bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col">
                <DialogHeader className="hidden">
                    <DialogTitle>WorkFlow Details</DialogTitle>
                    <DialogDescription>
                        View detailed information about the WorkFlow.
                    </DialogDescription>
                </DialogHeader>
                {/* Header */}
                <div className="border-b border-zinc-800 p-6 flex items-start gap-5">
                    <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-zinc-900 flex items-center justify-center text-6xl">
                        {extension.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-semibold text-white">{extension.name}</h1>
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                        </div>
                        <p className="text-zinc-400 text-lg">{extension.publisher}</p>

                        <div className="flex items-center gap-6 mt-3 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Download className="w-4 h-4" />
                                <span>{extension.downloads}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>{extension.rating}</span>
                                <span className="text-zinc-500">({extension.reviews})</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Updated {extension.lastUpdated}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">Disable</Button>
                        <Button variant="destructive" size="sm" onClick={handleInstall} disabled={isInstalling}>
                            {isInstalling ? "Installing..." : "Install"}
                        </Button>
                        <Button variant="ghost" size="icon">⚙️</Button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 overflow-auto p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <Badge className="bg-emerald-500/10 text-emerald-400">Popular</Badge>
                            <Badge variant="outline">{extension.category}</Badge>
                        </div>

                        <p className="text-zinc-300 text-lg leading-relaxed">
                            {extension.longDescription}
                        </p>

                        {/* Screenshots / How it works */}
                        <div className="mt-10">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                How it works
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {extension.screenshots?.map((src, index) => (
                                    <div key={index} className="rounded-xl overflow-hidden border border-zinc-800">
                                        <img
                                            src={src}
                                            alt={`Screenshot ${index + 1}`}
                                            className="w-full h-auto object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Requirements */}
                        <div className="mt-12">
                            <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                            <ul className="space-y-2 text-zinc-300">
                                {extension.requirements?.map((req, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-emerald-400 mt-1">•</span>
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Quick Start */}
                        <div className="mt-12">
                            <h3 className="text-lg font-semibold mb-3">Quick Start</h3>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-zinc-300">
                                <p className="flex items-center gap-2 mb-4">
                                    Welcome! 👋
                                </p>
                                <p>
                                    Whether you are new to Go or an experienced Go developer, we hope this extension fits your needs and enhances your development experience.
                                </p>
                                <ol className="mt-6 space-y-3 list-decimal pl-5">
                                    <li>Install Go 1.21 or newer if you haven't already.</li>
                                    <li>Open any Go project in VS Code.</li>
                                    <li>Enjoy intelligent autocompletion, debugging, and formatting.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Installation Info */}
                    <div className="w-40 sm:w-45 md:w-55 lg:w-60 xl:w-80 border-l border-zinc-800 bg-zinc-950 p-6 overflow-auto">
                        <h3 className="font-semibold mb-4 text-lg">Installation</h3>

                        <div className="space-y-5 text-sm">
                            <div>
                                <p className="text-zinc-500">Identifier</p>
                                <p className="font-mono text-zinc-300">{extension.identifier}</p>
                            </div>

                            <div>
                                <p className="text-zinc-500">Version</p>
                                <p className="text-zinc-300">{extension.version}</p>
                            </div>

                            <div>
                                <p className="text-zinc-500">Last Updated</p>
                                <p className="text-zinc-300">{extension.lastUpdated}</p>
                            </div>

                            <div>
                                <p className="text-zinc-500">Size</p>
                                <p className="text-emerald-400 font-medium">{extension.size}</p>
                            </div>

                            <Separator className="bg-zinc-800" />

                            <div>
                                <p className="text-zinc-500">Published</p>
                                <p className="text-zinc-300">{extension.published}</p>
                            </div>

                            <div>
                                <p className="text-zinc-500">Last Released</p>
                                <p className="text-zinc-300">1 month ago</p>
                            </div>
                        </div>

                        <div className="mt-10">
                            <h4 className="font-semibold mb-3">Categories</h4>
                            <div className="flex flex-wrap gap-2">
                                {extension.categories.map((cat, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                        {cat}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-8">
                            <Button
                                onClick={handleInstall}
                                disabled={isInstalling || isInstalled}
                                className={`w-full text-white ${isInstalled ? "bg-emerald-600 hover:bg-emerald-600 cursor-default" : "bg-blue-600 hover:bg-blue-700"}`}
                            >
                                {isInstalled ? "✅ Installed" : isInstalling ? "Installing..." : "Get Workflow"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}





