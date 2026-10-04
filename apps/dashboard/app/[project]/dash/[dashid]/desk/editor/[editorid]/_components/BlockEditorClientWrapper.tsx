"use client";

import React, { useState } from "react";
import { WorkFlowEditor } from "@/app/[project]/dash/[dashid]/editor/_components/resizable";
import { EditorPasswordBarrier } from "./EditorPasswordBarrier";

interface BlockEditorClientWrapperProps {
  workflowId: string;
  initialNodes: any[];
  initialEdges: any[];
  deskBlockId?: string;
  tabName?: string;
  coOwnerEmail?: string | null;
  isPasswordProtected?: boolean;
  isCoOwnerOrOwner?: boolean;
  deskUrl: string;
  initialUnlocked?: boolean;
}

export function BlockEditorClientWrapper({
  workflowId,
  initialNodes,
  initialEdges,
  deskBlockId,
  tabName = "Block Tab",
  coOwnerEmail,
  isPasswordProtected,
  isCoOwnerOrOwner,
  deskUrl,
  initialUnlocked = false,
}: BlockEditorClientWrapperProps) {
  const [isUnlocked, setIsUnlocked] = useState(
    !isPasswordProtected || isCoOwnerOrOwner || initialUnlocked
  );

  if (!isUnlocked && deskBlockId) {
    return (
      <EditorPasswordBarrier
        blockId={deskBlockId}
        tabName={tabName}
        coOwnerEmail={coOwnerEmail}
        deskUrl={deskUrl}
        onUnlocked={() => setIsUnlocked(true)}
      />
    );
  }

  return (
    <WorkFlowEditor
      workflowId={workflowId}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      deskBlockId={deskBlockId}
    />
  );
}
