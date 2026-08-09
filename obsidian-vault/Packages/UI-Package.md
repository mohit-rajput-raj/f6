# Shared UI Package (`packages/ui` / `@repo/ui`)

The `@repo/ui` package contains the monorepo's shared component library. It includes 55+ UI components built on Radix UI, Tailwind CSS, and Lucide icons.

---

## 🧩 Included UI Components (`src/components/ui/`)

| Category | Component Files |
| :--- | :--- |
| **Form Inputs** | `input.tsx`, `textarea.tsx`, `checkbox.tsx`, `radio-group.tsx`, `select.tsx`, `switch.tsx`, `slider.tsx`, `field.tsx`, `form.tsx`, `input-group.tsx`, `input-otp.tsx` |
| **Navigation & Menus**| `menubar.tsx`, `navigation-menu.tsx`, `dropdown-menu.tsx`, `context-menu.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `tabs.tsx` |
| **Overlays & Dialogs** | `dialog.tsx`, `alert-dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `popover.tsx`, `tooltip.tsx`, `hover-card.tsx` |
| **Data Display** | `table.tsx`, `card.tsx`, `badge.tsx`, `avatar.tsx`, `chart.tsx`, `carousel.tsx`, `progress.tsx`, `skeleton.tsx`, `File-Tree.tsx` |
| **Feedback & Status** | `alert.tsx`, `sonner.tsx`, `spinner.tsx`, `spotlight-new.tsx` |
| **Layout & Utilities** | `resizable.tsx`, `scroll-area.tsx`, `separator.tsx`, `collapsible.tsx`, `accordion.tsx`, `button-group.tsx` |

---

## 🎨 Design System Principles

* **Tailwind Integration**: Configured via `postcss.config.mjs` and global stylesheet in `src/styles/`.
* **Utility Function**: Shared class merger `cn()` exported from `@repo/ui/lib/utils` combining `clsx` and `tailwind-merge`.

---

## 🔗 Related Notes
* [[Apps/Dashboard]] — Main application consuming `@repo/ui`.
* [[Features/UI-and-Components]] — Visual workflow and sheet component details.
