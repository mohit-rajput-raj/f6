"use client";

import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ProfileForm } from "./_components/profile-form";
import { ProfileSkeleton } from "../../_components/settings-skeletons";
import { SettingsErrorFallback } from "../../_components/settings-error-boundary";

export default function ProfileSettingsPage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileForm />
      </Suspense>
    </ErrorBoundary>
  );
}