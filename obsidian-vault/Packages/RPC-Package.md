# Shared RPC Package (`packages/rpc` / `@repo/orpc`)

The `@repo/orpc` package defines end-to-end type-safe RPC procedures and routers using `@orpc/server`.

---

## 🛣️ Router Definition ([`src/router/index.ts`](file:///D:/vscodes/turborepo/f6/packages/rpc/src/router/index.ts))

```typescript
import { listUsers } from "./users";

export const router = {
  users: {
    list: listUsers,
  },
};
```

---

## ⚡ User Procedure ([`src/router/users.ts`](file:///D:/vscodes/turborepo/f6/packages/rpc/src/router/users.ts))

```typescript
import { os } from "@orpc/server";
import { z } from "zod";

export const listUsers = os
  .route({
    method: "GET",
    path: "/users",
    summary: "List users",
    tags: ["Users"],
  })
  .input(z.void())
  .output(
    z.object({
      users: z.array(
        z.object({
          id: z.number(),
          name: z.string().nullable(),
          email: z.string(),
        })
      ),
    })
  )
  .handler(async () => {
    // Returns typed user records
  });
```

---

## 🔗 Related Notes
* [[Apps/Dashboard]] — How Next.js mounts ORPC fetch handler on `/rpc`.
* [[Features/API-Reference]] — Complete RPC & REST API reference.
