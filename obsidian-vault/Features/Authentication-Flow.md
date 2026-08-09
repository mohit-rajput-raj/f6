# Authentication Flow

Authentication in UNIXL is managed by **Better Auth** (`@repo/auth`), backed by PostgreSQL database tables (`user`, `session`, `account`, `verification`) managed through Prisma ORM (`@repo/db`).

---

## 🔁 Authentication Lifecycle Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Page as Next.js Page (/auth/sign-in)
    participant AuthClient as Auth Client (@repo/auth)
    participant Route as Next.js API (/api/auth/[...all])
    participant AuthEngine as Better Auth Core
    participant DB as PostgreSQL (@repo/db)

    alt Email & Password Login
        User->>Page: Fill Email & Password
        Page->>AuthClient: signIn.email({ email, password })
        AuthClient->>Route: POST /api/auth/sign-in/email
        Route->>AuthEngine: Validate Credentials
        AuthEngine->>DB: Query User & Account table
        DB-->>AuthEngine: Return User Record
        AuthEngine->>DB: Create Session in session table
        AuthEngine-->>Route: Set HTTP Cookie (session_token)
        Route-->>AuthClient: 200 OK (User + Session payload)
        AuthClient-->>Page: Redirect to /
    else Google OAuth 2.0 Login
        User->>Page: Click "Continue with Google"
        Page->>AuthClient: signIn.social({ provider: "google" })
        AuthClient->>Route: GET /api/auth/sign-in/social?provider=google
        Route->>User: Redirect to accounts.google.com
        User->>Route: Callback to /api/auth/callback/google
        Route->>AuthEngine: Exchange OAuth Code for Tokens
        AuthEngine->>DB: Upsert User & Account records
        AuthEngine->>DB: Create Session record
        AuthEngine-->>User: Set Cookie & Redirect to /
    end
```

---

## 🗄️ Related Database Tables

* **`User`**: Core user profile (stores `id`, `name`, `email`, `image`, API keys for Gemini/OpenAI/Claude).
* **`Session`**: Active browser sessions (stores `token`, `expiresAt`, `ipAddress`, `userAgent`).
* **`Account`**: OAuth provider links (stores `providerId`, `accessToken`, `refreshToken`, `password` hash for credentials).
* **`Verification`**: Temporary verification tokens for email confirmation or password reset.

---

## 🔒 Security Observations & Recommendations

> [!WARNING]
> The Express server (`apps/server`) currently receives `userId` via `req.query.userId` or `req.body.userId`. Implementing an auth middleware in `apps/server` to validate the `Session` cookie token against Prisma before fulfilling API requests is strongly recommended.

---

## 🔗 Related Notes
* [[Packages/Auth-Package]] — `@repo/auth` configuration.
* [[Packages/Database-Package]] — Database models for identity tables.
* [[Apps/Dashboard]] — Frontend authentication forms and views.
