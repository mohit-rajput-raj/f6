'use client'

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@repo/ui/components/ui/tabs"

import FileTreeDemo from "@/components/files/fele-tree"
import 'react-folder-tree/dist/style.css';
import { useCallback, useState } from "react"
import dynamic from 'next/dynamic';
import SyncProvider from "@/context/syncProvider";
import { useMasterSheetStore } from "@/stores/master-sheet-store";
import { Badge } from "@repo/ui/components/ui/badge";

const SyncComponent = dynamic(() => import('@/components/dashboard/sheet/syncSheet'), { ssr: false });
const MasterSheetPanel = dynamic(() => import('@/components/dashboard/sheet/masterSheetPanel'), { ssr: false });

export function TabsBottom() {
    const { hasNewPush, pendingPushes } = useMasterSheetStore();
    const pendingCount = pendingPushes.filter(p => p.status === 'pending').length;

    return (
        <div className="flex w-full h-full flex-col gap-6 ">
            <Tabs defaultValue="Output">
                <TabsList>
                    <TabsTrigger value="Output">Output</TabsTrigger>
                    <TabsTrigger value="node">Table</TabsTrigger>
                    <TabsTrigger value="master" className="relative">
                        Master Sheet
                        {pendingCount > 0 && (
                            <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-orange-500 text-white animate-pulse">
                                {pendingCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="Output">
                    Output
                </TabsContent>
                <TabsContent value="node" className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <SyncComponent />
                    </div>
                </TabsContent>
                <TabsContent value="master" className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <MasterSheetPanel />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}