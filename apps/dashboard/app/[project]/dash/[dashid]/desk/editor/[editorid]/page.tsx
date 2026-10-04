import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getWorkFlow } from "../../../editor/_actions/editor.service";
import { supabase } from "@repo/db";
import { auth } from "@repo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSharedDeskAccess } from "../../desk-share-actions";
import { verifyUnlockToken } from "@/lib/password-utils";
import { BlockEditorClientWrapper } from "./_components/BlockEditorClientWrapper";

type Props = {
    params: Promise<{
        project: string;
        dashid: string;
        editorid: string;
    }>;
    searchParams?: Promise<{
        token?: string;
    }>;
};

const Page = async ({ params, searchParams }: Props) => {
    const resolvedParams = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const editorId = resolvedParams.editorid;
    const dashId = resolvedParams.dashid;
    const project = resolvedParams.project;
    const token = resolvedSearchParams?.token;

    // Viewers cannot open the editor
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const userEmail = session?.user?.email;

    let isOwner = true;
    if (userEmail && dashId) {
        const access = await getSharedDeskAccess(dashId, userEmail);
        if (access.isGuest && access.permission === "viewer") {
            redirect(`/${project}/dash/${dashId}/desk`);
        }
        isOwner = access.isOwner;
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

    // Find the DeskBlock that owns this editor workflow
    let deskBlockId: string | undefined;
    let tabName = "Block Editor";
    let coOwnerEmail: string | null = null;
    let isPasswordProtected = false;
    let isCoOwner = false;
    let initialUnlocked = false;

    try {
        const { data: block } = await supabase
            .from("desk_block")
            .select("id, name, coOwnerEmail, isPasswordProtected, passwordHash")
            .eq("editorWorkflowId", editorId)
            .maybeSingle();

        if (block) {
            deskBlockId = block.id;
            tabName = block.name;
            coOwnerEmail = block.coOwnerEmail || null;
            isPasswordProtected = Boolean(block.isPasswordProtected && block.passwordHash);

            if (userEmail && coOwnerEmail && coOwnerEmail.toLowerCase() === userEmail.toLowerCase()) {
                isCoOwner = true;
            }

            if (token && verifyUnlockToken(token, block.id, editorId)) {
                initialUnlocked = true;
            }
        }
    } catch {
        // Not a desk block editor
    }

    const deskUrl = `/${project}/dash/${dashId}/desk`;

    return (
        <div className="w-full h-screen p-1 flex flex-col gap-1 bg-zinc-950">
            <ErrorBoundary fallback={<p className="text-red-500 p-4">Something went wrong</p>}>
                <Suspense fallback={<p className="text-zinc-400 p-4">Loading workflow...</p>}>
                    <BlockEditorClientWrapper
                        workflowId={editorId}
                        initialNodes={initialNodes}
                        initialEdges={initialEdges}
                        deskBlockId={deskBlockId}
                        tabName={tabName}
                        coOwnerEmail={coOwnerEmail}
                        isPasswordProtected={isPasswordProtected}
                        isCoOwnerOrOwner={isOwner || isCoOwner}
                        deskUrl={deskUrl}
                        initialUnlocked={initialUnlocked}
                    />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
};

export default Page;