import { auth } from "@repo/auth";   // or "@/packages/auth/src/auth" if alias issues
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST, PUT, DELETE } = toNextJsHandler(auth);