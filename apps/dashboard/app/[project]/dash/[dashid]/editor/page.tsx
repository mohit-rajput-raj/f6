import Flow from "@/app/[project]/dash/[dashid]/editor/_components/reactFlow";
import { WorkFlowEditor } from "@/app/[project]/dash/[dashid]/editor/_components/resizable";
import { EditorWorkFlowContextProvider } from "@/context/WorkFlowContextProvider";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import DemoCamelCaseFlow from "./_components/nodes/input-nodes/test-nodes";

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

  return (
    <div className="w-full h-screen p-1 flex flex-col gap-1">
      <ErrorBoundary fallback={<p>Something went wrong</p>}>
        <Suspense fallback={<p>Loading workflow...</p>}>
          <EditorWorkFlowContextProvider>
            <WorkFlowEditor  />
           
          </EditorWorkFlowContextProvider>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default Page;