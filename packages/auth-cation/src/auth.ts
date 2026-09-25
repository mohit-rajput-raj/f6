import { betterAuth } from "better-auth";
import { Pool } from "pg";
import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import "dotenv/config";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
});

// Helper to remove trailing slashes from URLs safely
const formatUrl = (url?: string) => url?.replace(/\/$/, "");

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Cleaned baseURL fallback without trailing slashes
  baseURL:
    formatUrl(process.env.AUTH_BASE_URL) ||
    formatUrl(process.env.BETTER_AUTH_URL) ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3002"),

  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Ensure local development uses localhost callback even if Vercel URL was left in .env
      redirectURI:
        process.env.NODE_ENV === "development" &&
        process.env.GOOGLE_CALLBACK_URL?.includes("vercel.app")
          ? "http://localhost:3002/api/auth/callback/google"
          : (process.env.GOOGLE_CALLBACK_URL || undefined),
    },
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "a86682d6-d92a-40cd-a609-7553674ef59f",
              slug: "unixl-pro",
            },
            {
              productId: "9ca97042-81a0-47ac-8f32-541edf03dabb",
              slug: "unixl-max",
            },
          ],
          successUrl: "/projects?checkout_id={CHECKOUT_ID}",
          authenticatedUsersOnly: true,
        }),
        portal(),
      ],
    }),
  ],
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
