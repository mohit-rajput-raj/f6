"use client";

import { useEffect } from "react";
import { registerLicense } from "@syncfusion/ej2-base";

const AuthRoutesIdProvider = ({ children }: { children: React.ReactNode }) => {
    registerLicense(
        "IAk8BicRIAEqCzQhAR8kAxMHIgRJXmFXf013TGhYfUFzdUpPaVVYVHdeSFhqQ3taZiUeUn1ecnJVRWFYUUZ1XUZeYk57VH1GYQ=="
    );

    return <>{children}</>;
};

export default AuthRoutesIdProvider;