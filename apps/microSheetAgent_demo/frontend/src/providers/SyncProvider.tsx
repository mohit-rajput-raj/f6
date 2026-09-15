"use client";

import React, { useEffect } from "react";
import { registerLicense } from "@syncfusion/ej2-base";

const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY;

if (licenseKey) {
  registerLicense(licenseKey.trim().replace(/^['"]|['"]$/g, ""));
}

const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const removeLicensePopup = () => {
      const licensingElements = document.querySelectorAll(
        '#js-licensing, div[id*="js-licensing"], .e-lic-banner, div[style*="z-index: 99999"]'
      );
      licensingElements.forEach((el) => el.remove());
    };

    removeLicensePopup();

    const observer = new MutationObserver(() => {
      removeLicensePopup();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
};

export default SyncProvider;