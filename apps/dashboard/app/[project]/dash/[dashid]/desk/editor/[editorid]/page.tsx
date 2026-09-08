import { WorkFlowEditor } from "@/app/[project]/dash/[dashid]/editor/_components/resizable";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getWorkFlow } from "../../../editor/_actions/editor.service";
import { supabase } from "@repo/db";
import { auth } from "@repo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSharedDeskAccess } from "../../desk-share-actions";

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
    const dashId = resolvedParams.dashid;
    const project = resolvedParams.project;

    // Viewers cannot open the editor
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (session?.user?.email && dashId) {
        const access = await getSharedDeskAccess(dashId, session.user.email);
        if (access.isGuest && access.permission === "viewer") {
            redirect(`/${project}/dash/${dashId}/desk`);
        }
    }

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
        const { data: block } = await supabase
            .from("desk_block")
            .select("id")
            .eq("editorWorkflowId", editorId)
            .maybeSingle();

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