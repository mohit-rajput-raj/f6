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

// const SyncfusionLicense = dynamic(() => import('@/app/syncfusion'), { ssr: false });
const Team = dynamic(() => import('@/components/dashboard/sheet/syncSheet'), { ssr: false });
export function TabsBottom() {
    return (
        <div className="flex w-full h-full flex-col gap-6 ">
            <Tabs defaultValue="Output">
                <TabsList>
                    <TabsTrigger value="Output">Output</TabsTrigger>
                    <TabsTrigger value="node">Table</TabsTrigger>
                </TabsList>
                <TabsContent value="Output">
                    Output
                </TabsContent>
                <TabsContent value="node" className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">



                        <Team />
                        {/* </SyncProvider> */}
                    </div>
                </TabsContent>


            </Tabs>
        </div>
    )
}