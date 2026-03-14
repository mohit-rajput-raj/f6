"use client";

import { useEffect } from "react";
import { registerLicense } from "@syncfusion/ej2-base";

const AuthRoutesIdProvider = ({ children }: { children: React.ReactNode }) => {
    registerLicense(
        process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY!
    );

    return <>{children}</>;
};

export default AuthRoutesIdProvider;