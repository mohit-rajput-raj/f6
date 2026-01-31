import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db";
import "dotenv/config";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
baseURL: process.env.AUTH_BASE_URL || "http://localhost:3002/",
 socialProviders: {
    google: {
      prompt: "select_account", 
      clientId: process.env.GOOGLE_CLIENT_ID! ,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET! ,
    },
   
  },
  trustedOrigins:
    process.env.NODE_ENV === "production" ? [
      "https://my-production-domain.com"
    ].filter((url): url is string =>Boolean(url)) : 
    [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003"
    ],
});
export type Auth = ReturnType<typeof betterAuth>;
export type Session = Auth["$Infer"]["Session"];