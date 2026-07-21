"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SettingsRootPage() {
  const router = useRouter();
  const params = useParams();

  const project = params?.project || "projects";
  const id = params?.id || "0";

  useEffect(() => {
    router.replace(`/${project}/${id}/settings/general/profile`);
  }, [router, project, id]);

  return null;
}