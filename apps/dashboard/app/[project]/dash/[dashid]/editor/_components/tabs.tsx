'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs"


import FileTreeDemo from "@/components/files/fele-tree"
import 'react-folder-tree/dist/style.css';
import { useState } from "react"
export function TabsDemo() {
  return (
    <div className="flex w-full h-full flex-col gap-6">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">errors</TabsTrigger>
          <TabsTrigger value="node">nodes</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          errors 
        </TabsContent>
        <TabsContent value="node">
          sd
        </TabsContent>
        <TabsContent value="password">
          <FileTreeDemo/>
        </TabsContent>
      </Tabs>
    </div>
  )
}



