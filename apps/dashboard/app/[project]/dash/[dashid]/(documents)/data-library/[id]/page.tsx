"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DatasetIndexPage() {
  const params = useParams();
  const router = useRouter();
  const project = (params?.project as string) || "";
  const dashid = (params?.dashid as string) || "";
  const id = (params?.id as string) || "";

  useEffect(() => {
    if (project && dashid && id) {
      router.replace(`/${project}/dash/${dashid}/data-library/${id}/add`);
    }
  }, [project, dashid, id, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <span>Loading dataset workspace...</span>
      </div>
    </div>
  );
}
