"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/context/OrgContext";
import { OrganizationRegisterWizard } from "@/components/wizard/OrganizationRegisterWizard";

export default function RegisterOrgPage() {
  const router = useRouter();
  const { currentUser, selectOrg, refresh } = useOrg();

  return (
    <div className="py-2">
      <OrganizationRegisterWizard
        user={currentUser}
        onComplete={async (newOrg) => {
          await refresh();
          await selectOrg(newOrg);
          window.location.href = "/dashboard";
        }}
        onCancel={() => {
          window.location.href = "/dashboard";
        }}
      />
    </div>
  );
}

