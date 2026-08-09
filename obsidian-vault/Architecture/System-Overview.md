# System Architecture Overview

The **UNIXL (Campus)** platform is built as a modular, high-performance monorepo designed for visual workflow automation, real-time dataset collaboration, spreadsheet manipulation, and AI assistance.

---

## 📐 System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer"]
        Browser["User Web Browser"]
    end

    subgraph FrontendApp ["apps/dashboard (Next.js 15)"]
        Pages["App Router Pages & Views"]
        Stores["Zustand Stores (desk, masterSheet, user)"]
        AuthClient["Better Auth Client (@repo/auth)"]
        ORPCClient["ORPC Client (@repo/orpc)"]
        WSClient["WebSocket Client (use-notification-socket)"]
    end

    subgraph AuthLayer ["Authentication"]
        BetterAuth["Better Auth Handler (/api/auth/*)"]
    end

    subgraph NodeServer ["apps/server (Express.js)"]
        ExpressRoutes["REST API (/api/v1/*)"]
        WSManager["WebSocket Server (/ws)"]
        ExpressControllers["Desk, Team, Workflow, Notification Controllers"]
    end

    subgraph PythonServer ["apps/pyp (FastAPI Engine)"]
        FastAPI["FastAPI Entrypoint"]
        DataServices["Data Calculations, Math & Formulas"]
        FileExtractors["PDF, PPTX, XLSX, CSV Extractors"]
        AIRouter["AI Processing Router"]
    end

    subgraph AgentServer ["apps/microSheetAgent"]
        LangChainServer["LangChain Agent Backend"]
    end

    subgraph DataStore ["Database & Storage Layer"]
        PrismaORM["Prisma Client (@repo/db)"]
        PostgresDB[("PostgreSQL Database (Neon / Supabase)")]
        CloudinaryMedia[("Cloudinary Storage (@repo/cloudinary)")]
    end

    %% Client Interactions
    Browser --> Pages
    Pages --> Stores
    Pages --> AuthClient
    Pages --> ORPCClient
    Pages --> WSClient

    %% Frontend App Connectivity
    AuthClient --> BetterAuth
    BetterAuth --> PrismaORM
    ORPCClient --> ExpressRoutes
    WSClient <--> WSManager
    Pages --> ExpressRoutes

    %% Express Server Connections
    ExpressControllers --> PrismaORM
    ExpressControllers -->|Internal HTTP| FastAPI

    %% Python Services
    FastAPI --> DataServices
    FastAPI --> FileExtractors
    FastAPI --> AIRouter
    Pages -->|Direct Request| FastAPI

    %% LangChain Connectivity
    Pages --> LangChainServer

    %% Database Connections
    PrismaORM --> PostgresDB
    Pages --> CloudinaryMedia

    linkStyle default stroke:#6366f1,stroke-width:2px;
```

---

## ⚡ Core Communication Flows

### 1. User Authentication
* **Client**: Uses `authClient` from `apps/dashboard/lib/auth-client.ts` to trigger Google OAuth or Email sign-in.
* **Server**: Proxied through `apps/dashboard/app/api/auth/[...all]/route.ts` which invokes `betterAuth` in `packages/auth-cation`.
* **Persistence**: Auth session is saved directly to PostgreSQL via Prisma ORM (`@repo/db`).
* Learn more: [[Features/Authentication-Flow]].

### 2. Workflow & Desk Block Execution
* **Client**: Workflow canvas built with React Flow in `apps/dashboard`. User adds data blocks or nodes.
* **Express Server**: Handles desk block persistence (`/api/v1/desk/:projectWorkflowId/blocks`) and column-reservation commits to `MasterSheet`.
* **Python Engine**: High-performance calculations (matrix operations, formula evaluations, cell transformations) delegate to `apps/pyp` via HTTP endpoints (`/calculate`, `/formula`, `/transform`).
* Learn more: [[Apps/Dashboard]], [[Apps/Server]], and [[Apps/Pyp-Python-AI]].

### 3. Real-Time Collaboration & WebSockets
* **Express WS Manager**: Operates on `ws://localhost:5000/ws`.
* **Subscriptions**: Clients register with `userId` query parameter or `AUTHENTICATE` payload.
* **Notifications**: Team invite status changes, data commits, and system messages are pushed to connected user sockets in real time.
* Learn more: [[Features/API-Reference]].

---

## ⚙️ Monorepo Shared Package Architecture

```mermaid
graph LR
    subgraph Packages ["packages/"]
        db["@repo/db"]
        auth["@repo/auth"]
        rpc["@repo/orpc"]
        ui["@repo/ui"]
        cloudinary["@repo/cloudinary"]
    end

    subgraph Apps ["apps/"]
        dashboard["apps/dashboard"]
        server["apps/server"]
        pyp["apps/pyp"]
    end

    db --> auth
    db --> rpc
    db --> dashboard
    db --> server
    auth --> dashboard
    rpc --> dashboard
    ui --> dashboard
    cloudinary --> dashboard
```

* **`@repo/db`**: Exported Prisma client for all Node/Next services.
* **`@repo/auth`**: Better Auth engine built on top of `@repo/db`.
* **`@repo/orpc`**: Type-safe RPC router built on top of `@repo/db`.
* **`@repo/ui`**: Shared design system for shadcn/Radix components.
* **`@repo/cloudinary`**: Common media uploader wrapper.

---

## 🔗 Related Notes
* [[Architecture/Folder-Structure]] — Monorepo file breakdown.
* [[Features/Database-Schema]] — Detailed Prisma database structure.
* [[Operations/Build-and-Deployment]] — How the monorepo builds and deploys.
