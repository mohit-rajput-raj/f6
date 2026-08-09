# Shared Authentication Package (`packages/auth-cation` / `@repo/auth`)

The `@repo/auth` package provides centralized authentication configuration powered by **Better Auth** with a Prisma ORM adapter.

---

## 🔐 Server Configuration ([`src/auth.ts`](file:///D:/vscodes/turborepo/f6/packages/auth-cation/src/auth.ts))

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

---

## 📱 React Client Configuration ([`src/client.ts`](file:///D:/vscodes/turborepo/f6/packages/auth-cation/src/client.ts))

```typescript
import { createAuthClient as createBetterAuthClient } from "better-auth/react";

export const createAuthClient = () => createBetterAuthClient();
```

---

## 🔗 Related Notes
* [[Features/Authentication-Flow]] — Step-by-step auth lifecycle documentation.
* [[Packages/Database-Package]] — Database tables powering session/account storage.
* [[Apps/Dashboard]] — Next.js frontend pages consuming auth client hooks.
