# Shared Database Package (`packages/database` / `@repo/db`)

The `@repo/db` package encapsulates the database layer for the entire monorepo. It manages the Prisma ORM schema, migrations, connection pool adapter, and generated TypeScript types.

---

## ⚙️ Client Configuration ([`src/client.ts`](file:///D:/vscodes/turborepo/f6/packages/database/src/client.ts))

To ensure maximum performance and serverless compatibility (e.g. Neon PostgreSQL pooler), the Prisma Client uses the `@prisma/adapter-pg` driver:

```typescript
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
```

---

## 🗄️ Database Schema & Models Summary

* **Prisma Schema Path**: [`prisma/schema.prisma`](file:///D:/vscodes/turborepo/f6/packages/database/prisma/schema.prisma)
* **Output Path**: `src/generated/prisma`
* **Models**:
  1. `User`, `Session`, `Account`, `Verification` (Better Auth tables)
  2. `Workflow`, `WorkflowVersion`, `WorkflowShare`, `PublishedWorkflow`, `WorkflowInstallation`
  3. `DataLibraryFile`, `SharedNode`
  4. `MasterSheet`, `MasterSheetHistory`, `DeskShare`, `DeskBlock`
  5. `Notification`

---

## 🔗 Related Notes
* [[Features/Database-Schema]] — Detailed model schema and ERD diagram.
* [[Packages/Auth-Package]] — Better Auth integration using `@repo/db`.
* [[Apps/Server]] — Express backend using `@repo/db`.
