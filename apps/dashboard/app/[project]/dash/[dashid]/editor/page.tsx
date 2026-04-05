import { WorkFlowEditor } from "@/app/[project]/dash/[dashid]/editor/_components/resizable";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getWorkFlow } from "./_actions/editor.service";

type Props = {
  params: Promise<{
    project: string;
    dashid: string;
  }>;
};

const Page = async ({ params }: Props) => {
  const resolvedParams = await params;
  const id = resolvedParams.dashid;

  if (!id) {
    return <div>Invalid dashboard ID</div>;
  }

  // Load the workflow from DB on the server side
  let initialNodes: any[] = [];
  let initialEdges: any[] = [];
  
  try {
    const workflow = await getWorkFlow(id);
    if (workflow?.definition) {
      const def = workflow.definition as any;
      initialNodes = def?.reactFlow?.nodes ?? [];
      initialEdges = def?.reactFlow?.edges ?? [];
    }
  } catch (err) {
    console.error("Failed to load workflow:", err);
  }

  return (
    <div className="w-full h-screen p-1 flex flex-col gap-1">
      <ErrorBoundary fallback={<p>Something went wrong</p>}>
        <Suspense fallback={<p>Loading workflow...</p>}>
          <WorkFlowEditor
            workflowId={id}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default Page;