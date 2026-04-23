import { WorkFlowEditor } from "@/app/[project]/dash/[dashid]/editor/_components/resizable";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getWorkFlow } from "../../../editor/_actions/editor.service";
import { prisma } from "@repo/db";

type Props = {
    params: Promise<{
        project: string;
        dashid: string;
        editorid: string;
    }>;
};

const Page = async ({ params }: Props) => {
    const resolvedParams = await params;
    const editorId = resolvedParams.editorid;

    if (!editorId) {
        return <div className="p-10 text-red-600">Invalid editor ID</div>;
    }

    // Load the workflow for this block's editor
    let initialNodes: any[] = [];
    let initialEdges: any[] = [];

    try {
        const workflow = await getWorkFlow(editorId);
        if (workflow?.definition) {
            const def = workflow.definition as any;
            initialNodes = def?.reactFlow?.nodes ?? [];
            initialEdges = def?.reactFlow?.edges ?? [];
        }
    } catch (err) {
        console.error("Failed to load block editor workflow:", err);
    }

    // Find the DeskBlock that owns this editor workflow so we can pass blockId
    let deskBlockId: string | undefined;
    try {
        const block = await prisma.deskBlock.findUnique({
            where: { editorWorkflowId: editorId },
            select: { id: true },
        });
        deskBlockId = block?.id;
    } catch {
        // Not a desk block editor — regular editor
    }

    return (
        <div className="w-full h-screen p-1 flex flex-col gap-1">
            <ErrorBoundary fallback={<p>Something went wrong</p>}>
                <Suspense fallback={<p>Loading workflow...</p>}>
                    <WorkFlowEditor
                        workflowId={editorId}
                        initialNodes={initialNodes}
                        initialEdges={initialEdges}
                        deskBlockId={deskBlockId}
                    />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
};

export default Page;