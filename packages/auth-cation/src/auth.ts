import { betterAuth } from "better-auth";
import { Pool } from "pg";
import "dotenv/config";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  baseURL:
    process.env.AUTH_BASE_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3002/"),

  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [
          process.env.AUTH_BASE_URL,
          process.env.BETTER_AUTH_URL,
          process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : undefined,
        ].filter((url): url is string => Boolean(url))
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3003",
        ],
});
export type Auth = ReturnType<typeof betterAuth>;
export type Session = Auth["$Infer"]["Session"];

