# Centralized Environment Variables Registry

This note catalogs all environment variables utilized across root workspace, shared packages, and applications (`apps/dashboard`, `apps/server`, `apps/pyp`).

---

## 🔑 Environment Variable Matrix

| Variable Name | Scope | Required / Optional | Description / Purpose | Default / Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Root, `@repo/db`, `apps/dashboard`, `apps/server` | **Required** | PostgreSQL connection URL with SSL mode enabled | `postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=verify-full` |
| `AUTH_SECRET` | Root, `@repo/auth`, `apps/dashboard` | **Required** | Secret key for signing authentication sessions and tokens | Random high-entropy secret string |
| `BETTER_AUTH_SECRET` | `apps/dashboard`, `@repo/auth` | **Required** | Better Auth session encryption key | Matches `AUTH_SECRET` |
| `BETTER_AUTH_URL` | `apps/dashboard`, `@repo/auth` | **Required** | Public URL where Better Auth endpoints are served | `http://localhost:3002` |
| `AUTH_BASE_URL` | Root, `apps/dashboard` | Optional | Fallback base URL for authentication endpoints | `http://localhost:3002` |
| `NEXT_PUBLIC_AUTH_BASE_URL` | `apps/dashboard` | **Required** | Public client-side URL for Auth client requests | `http://localhost:3002` |
| `GOOGLE_CLIENT_ID` | Root, `apps/dashboard`, `@repo/auth` | **Required** | Google OAuth 2.0 Client ID for social sign-in | `875086...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Root, `apps/dashboard`, `@repo/auth` | **Required** | Google OAuth 2.0 Client Secret | `GOCSPX-...` |
| `GOOGLE_CALLBACK_URL` | Root, `apps/dashboard` | Optional | Google OAuth callback redirect URL | `https://f6-dashboard.vercel.app/api/auth/callback/google` |
| `PORT` | `apps/server`, `apps/pyp` | Optional | HTTP listening port for Express backend or FastAPI | `5000` (server) / `8000` (pyp) |
| `CORS_ORIGIN` / `CORS_ORIGINS` | `apps/server`, `apps/pyp` | Optional | Allowed CORS origins for API requests | `*` or comma-separated URLs |
| `PYP_SERVER_URL` / `BACKEND_PYTHON_URL` | `apps/server`, `apps/dashboard` | Optional | HTTP address of the Python FastAPI engine | `http://localhost:8000` |
| `NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY` | `apps/dashboard` | Optional | License key for Syncfusion grid components | License string |
| `GEMINI_API_KEY` | `apps/dashboard` | Optional | Google Gemini LLM API key for AI features | `AIzaSy...` |
| `CLOUDINARY_CLOUD_NAME` | `@repo/cloudinary` | Optional | Cloudinary cloud account name | Account name string |
| `CLOUDINARY_API_KEY` | `@repo/cloudinary` | Optional | Cloudinary API key | Key string |
| `CLOUDINARY_API_SECRET` | `@repo/cloudinary` | Optional | Cloudinary API secret | Secret string |

---

## 📁 Environment File Locations

1. **Root Configuration**: [`.env`](file:///D:/vscodes/turborepo/f6/.env) & [`.env.example`](file:///D:/vscodes/turborepo/f6/.env.example)
2. **Dashboard App**: [`apps/dashboard/.env`](file:///D:/vscodes/turborepo/f6/apps/dashboard/.env)
3. **Server App**: [`apps/server/src/config/env.ts`](file:///D:/vscodes/turborepo/f6/apps/server/src/config/env.ts)
4. **Python Pyp App**: [`apps/pyp/app/core/config.py`](file:///D:/vscodes/turborepo/f6/apps/pyp/app/core/config.py)
5. **Database Package**: [`packages/database/.env`](file:///D:/vscodes/turborepo/f6/packages/database/.env)
6. **Auth Package**: [`packages/auth-cation/.env`](file:///D:/vscodes/turborepo/f6/packages/auth-cation/.env)

---

## 🔗 Related Notes
* [[Features/Authentication-Flow]] — Authentication parameters overview.
* [[Operations/Build-and-Deployment]] — How environment variables are loaded during build.
