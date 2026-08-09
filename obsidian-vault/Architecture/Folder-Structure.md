# Workspace Folder Structure

The UNIXL project is organized as a pnpm monorepo managed by Turborepo. Below is the complete directory topology of `apps/`, `packages/`, and key root files.

---

## 📁 Root Workspace

```text
D:\vscodes\turborepo\f6
├── .env                       # Centralized root environment variables
├── .env.example               # Example root environment variables
├── .gitignore                 # Root git ignore definitions
├── package.json               # Root workspace manifest & global scripts
├── pnpm-lock.yaml             # Lockfile for pnpm dependencies
├── pnpm-workspace.yaml        # Defines workspace packages (apps/*, packages/*)
├── turbo.json                 # Turborepo task pipeline configuration
├── apps/                      # Application deployments
└── packages/                  # Shared modular packages
```

---

## 📱 Applications Breakdown (`apps/`)

### 1. `apps/dashboard` (Next.js 15 Web App)
The primary user-facing web dashboard.
```text
apps/dashboard/
├── app/
│   ├── [project]/             # Dynamic project workspace route
│   │   ├── [id]/              # Project workflow & settings route
│   │   └── dash/              # Master sheet dashboard view
│   ├── api/
│   │   └── auth/[...all]/     # Better Auth HTTP endpoint proxy
│   ├── auth/                  # Login, Register, Callback pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── rpc/[[...rest]]/       # ORPC fetch handler route
│   ├── header.tsx             # Main layout top navigation header
│   ├── layout.tsx             # Root app layout
│   └── page.tsx               # Landing page & hero section
├── components/
│   ├── dashboard/             # Flow canvas & master sheet UI components
│   │   ├── flow/              # React Flow nodes, edges, drawers
│   │   └── sheet/             # SyncSheet & MasterSheet panels
│   ├── landing/               # Marketing landing components
│   └── ui/                    # App-specific UI components
├── lib/                       # API clients & hooks
│   ├── auth-client.ts         # Better Auth client instance
│   ├── notifications-api.ts   # REST notification SDK
│   ├── orpc.ts                # ORPC client instantiation
│   └── use-notification-socket.ts # Real-time WebSocket hook
└── stores/                    # Zustand state management
    ├── desk-store.ts          # Desk blocks & tree hierarchy state
    ├── master-sheet-store.ts  # Master spreadsheet data state
    ├── data-library-store.ts  # File library state
    └── spreadsheet-store.ts   # Sheet data grid state
```

### 2. `apps/server` (Express Node Backend)
Express.js REST & WebSockets server.
```text
apps/server/
├── src/
│   ├── config/                # Port, CORS, and PYP URL environment configs
│   ├── controllers/           # Desk, Workflow, Team, Notification controllers
│   ├── middlewares/           # Global rate limiting & error handling
│   ├── routes/                # Express router endpoints (/api/v1)
│   ├── services/              # Business logic & Prisma query wrappers
│   ├── websocket.ts           # WebSocket connection manager & heartbeat
│   └── index.ts               # HTTP server entrypoint
├── package.json
└── tsconfig.json
```

### 3. `apps/pyp` (Python FastAPI Server)
Python data engine for tabular parsing and calculations.
```text
apps/pyp/
├── app/
│   ├── api/routers/           # AI router endpoints
│   ├── core/                  # Settings, Pydantic configs, env parsing
│   ├── services/              # Pandas calculation service & file parser
│   └── tools/                 # Data manipulation helper tools
├── main.py                    # FastAPI application setup & legacy endpoints
├── requirements.txt           # Python dependencies (pandas, fastapi, pdfplumber, etc.)
└── vercel.json                # Vercel deployment config for Python
```

### 4. `apps/microSheetAgent` (LangChain Subagent)
```text
apps/microSheetAgent/
├── frontend/                  # Next.js micro-agent interface
└── langchainServer/           # LangChain python server & agent utilities
```

### 5. `apps/api` (Helper Parsing Scripts)
```text
apps/api/campus/
├── camp.py                    # Standalone Pandas extraction script (PPTX/PDF/CSV)
└── AI_csv.csv                 # Sample dataset
```

---

## 📦 Shared Packages Breakdown (`packages/`)

### 1. `packages/database` (`@repo/db`)
```text
packages/database/
├── prisma/
│   ├── schema.prisma          # PostgreSQL models schema
│   └── migrations/            # Migration SQL history
├── src/
│   ├── client.ts              # PrismaClient instantiated with pg Pool adapter
│   ├── generated/             # Generated Prisma TypeScript types
│   └── index.ts               # Package exports
├── prisma.config.ts
└── package.json
```

### 2. `packages/auth-cation` (`@repo/auth`)
```text
packages/auth-cation/
├── src/
│   ├── auth.ts                # Better Auth server configuration with Prisma adapter
│   ├── client.ts              # React Better Auth client setup
│   └── index.ts               # Package exports
└── package.json
```

### 3. `packages/rpc` (`@repo/orpc`)
```text
packages/rpc/
├── src/
│   ├── router/
│   │   ├── index.ts           # ORPC root router map
│   │   └── users.ts           # User procedures
│   └── index.ts               # Package exports
└── package.json
```

### 4. `packages/ui` (`@repo/ui`)
```text
packages/ui/
├── src/
│   ├── components/ui/         # 55+ reusable React/shadcn UI components
│   ├── hooks/                 # Shared React hooks
│   ├── lib/                   # Utility helpers (cn, tailwind-merge)
│   └── styles/                # Global CSS tokens & Tailwind imports
└── package.json
```

### 5. `packages/cloudinary` (`@repo/cloudinary`)
```text
packages/cloudinary/
├── src/
│   └── index.ts               # Cloudinary v2 SDK initializer
└── package.json
```

---

## 🔗 Related Notes
* [[Architecture/System-Overview]] — Overview of interaction between folders.
* [[Operations/Build-and-Deployment]] — How Turborepo builds these apps and packages.
