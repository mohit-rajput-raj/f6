# Dashboard Application (`apps/dashboard`)

The **Dashboard Application** is the main Next.js web application for UNIXL. It provides the visual workflow canvas, spreadsheet interface, project navigation, authentication UI, and real-time collaboration updates.

---

## 🛠️ Tech Stack & Key Libraries

| Library | Version / Description |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router) |
| **UI Components** | `@repo/ui` (Radix UI, Tailwind CSS, Lucide icons) |
| **State Management** | Zustand stores |
| **Workflow Canvas** | `@xyflow/react` / React Flow |
| **RPC Client** | `@orpc/client` via [`apps/dashboard/lib/orpc.ts`](file:///D:/vscodes/turborepo/f6/apps/dashboard/lib/orpc.ts) |
| **Auth Client** | Better Auth React Client via [`apps/dashboard/lib/auth-client.ts`](file:///D:/vscodes/turborepo/f6/apps/dashboard/lib/auth-client.ts) |
| **Spreadsheet Grid** | Syncfusion / Custom Table Engine |

---

## 🗺️ App Router Page Structure

```text
apps/dashboard/app/
├── page.tsx                    # Landing / Hero Page
├── layout.tsx                  # Global App Layout with Providers & Toaster
├── header.tsx                  # Top Header bar with navigation & profile
├── auth/
│   ├── layout.tsx              # Auth sub-layout
│   ├── sign-in/[[...sign-in]]/ # Login Page with Email & Google OAuth
│   └── sign-up/[[...sign-up]]/ # Registration Page
├── [project]/
│   ├── layout.tsx              # Project Workspace Sidebar & Navigation
│   ├── page.tsx                # Project Overview Page
│   ├── dash/[dashid]/          # Master Sheet Spreadsheet Dashboard View
│   └── [id]/                   # Visual Workflow Editor View
│       ├── billing/            # Project Billing settings
│       ├── connections/        # Database & integration links
│       ├── notifications/      # Real-time notifications pane
│       ├── peoples/            # Project team collaborators
│       └── settings/           # Project settings
├── api/auth/[...all]/          # Better Auth handler route
└── rpc/[[...rest]]/            # ORPC handler route
```

---

## 🧠 State Management (Zustand Stores)

The dashboard uses modular Zustand stores in `apps/dashboard/stores/`:

1. **`desk-store.ts`**:
   * Manages Desk Blocks (`DeskBlockState`), hierarchy trees, text inputs, block execution status, output previews, and column restrictions.
2. **`master-sheet-store.ts`**:
   * Manages the shared MasterSheet state, column definitions, data rows, history logs, and merge/commit operations.
3. **`data-library-store.ts`**:
   * Tracks files uploaded to the data library, types, metadata, and associations with workflows.
4. **`spreadsheet-store.ts`**:
   * Handles local grid data and cell updates.
5. **`ui.store.ts`**:
   * Controls modals, sidebars, and drawer toggles.

---

## ⚡ Real-Time Integration

* **WebSocket Hook**: [`apps/dashboard/lib/use-notification-socket.ts`](file:///D:/vscodes/turborepo/f6/apps/dashboard/lib/use-notification-socket.ts)
* Connects automatically to `ws://localhost:5000/ws` passing the active `userId`.
* Listens for `NOTIFICATION`, `DESK_INVITE`, and `DATA_COMMIT` events and invalidates local state or triggers Sonner toast alerts.

---

## 🔗 Related Notes
* [[Features/UI-and-Components]] — UI architecture and workflow components.
* [[Features/Authentication-Flow]] — Authentication implementation details.
* [[Packages/RPC-Package]] — How ORPC connects to Next.js.
