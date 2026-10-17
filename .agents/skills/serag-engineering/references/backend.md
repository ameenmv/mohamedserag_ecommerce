# Backend Engineering Guide (NestJS & Prisma)

This document details the backend architecture, database integration, validation pipes, authentication mechanics, and security guards in `apps/api`.

---

## 1. NestJS 12 Modular Architecture

The API runs on **NestJS 12** configured with strict TypeScript, SWC compilation for Vitest, and oxlint.

### Module Structure
Every domain module follows a standard separation of concerns:
```text
src/
├── app.module.ts              # Root module configuring global providers & guards
├── main.ts                    # Application bootstrapper (trust proxy, helmet, cookie-parser)
├── auth/                      # Admin authentication, session management, RBAC guards
├── audit/                     # Mutation auditing interceptor & decorators
├── test-seed/                 # E2E test data seeding (environment-guarded)
├── prisma/                    # PrismaService wrapper & PostgreSQL adapter lifecycle
└── common/                    # Shared pipes, filters, and interceptors
```

### Global Pipeline (`AppModule`)
Global providers are registered in `app.module.ts`:
1. `ThrottlerGuard` (`APP_GUARD`): Rate limiting protection.
2. `SessionGuard` (`APP_GUARD`): Validates session cookies and CSRF tokens on admin routes.
3. `PermissionGuard` (`APP_GUARD`): Enforces fail-closed role-based access control.
4. `AuditInterceptor` (`APP_INTERCEPTOR`): Writes mutation audit records to PostgreSQL.

---

## 2. In-House Zod Validation Pipe

`nestjs-zod` does not yet support NestJS 12. Therefore, validation is handled by an in-house pipe located at:
`apps/api/src/common/zod-validation.pipe.ts`.

### How It Works:
- Accepts any Zod schema (`z.ZodType`).
- Executes `schema.safeParse(value)`.
- On success: returns typed parsed output `z.output<T>`.
- On failure: formats field issues into `{ message: 'بيانات غير صحيحة', errors: { field: ['message'] } }` and throws a `BadRequestException` (HTTP 400).

```ts
// Usage in controller:
@Post('login')
async login(
  @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
): Promise<AuthSessionPayload> {
  // body is strictly typed and validated
}
```

---

## 3. Prisma 7 & PostgreSQL

The database layer runs on **PostgreSQL 17** (Debian image) managed via **Prisma 7.10.1**.

### Configuration Highlights (`apps/api/prisma/schema.prisma`):
- **Generator**: Uses the Prisma 7 client generator:
  ```prisma
  generator client {
    provider            = "prisma-client"
    output              = "../src/generated/prisma"
    moduleFormat        = "esm"
    importFileExtension = "js"
    previewFeatures     = ["postgresqlExtensions"]
  }
  ```
- **Driver Adapter**: Uses `@prisma/adapter-pg` backed by `pg.Pool` in `PrismaService` (`apps/api/src/prisma/prisma.service.ts`).
- **Postgres Extensions**: Enables `pg_trgm` for trigram similarity search on Arabic product names and specifications (`searchText`).
- **Money Representation**: All currency columns are stored as integer piastres (`Int`). For example, `2890000` represents 28,900 EGP. Floats or decimals are forbidden for money.

### Database Commands:
```bash
pnpm db:up        # Start PostgreSQL containers (5432 dev, 5433 test)
pnpm db:migrate   # Apply migrations to dev DB (prisma migrate dev)
pnpm db:generate  # Regenerate Prisma ESM client
pnpm db:seed      # Seed catalog, zones, settings, demo orders, and admin
pnpm db:studio    # Open Prisma Studio web interface
```

---

## 4. Admin Authentication, Session & CSRF

Admin authentication is stateful and secured with multi-layered defenses:

### Password Hashing
Passwords are saved using Argon2 (`argon2.hash()`) with secure salt parameters.

### Session Lifecycle
1. **Login (`POST /api/admin/auth/login`)**:
   - Validates credentials via `AuthService`.
   - Generates a cryptographically random session token (nanoid).
   - Generates a 32-character CSRF token (nanoid).
   - Hashes the session token with SHA-256 (`hashSessionToken`) and persists a `Session` record in the database.
   - Sets an `httpOnly`, `SameSite=Lax`, `path=/` cookie named `serag_sid` holding the raw session token.
   - Returns user profile, permissions array, and the `csrfToken` in the response body.
2. **Session Rolling**:
   - `SessionGuard` checks `session.updatedAt`.
   - If more than 12 hours (`SESSION_EXTEND_THRESHOLD_MS`) have elapsed since update, it extends `expiresAt` by 7 days (`SESSION_TTL_MS`) and re-issues the cookie.
3. **Logout (`POST /api/admin/auth/logout`)**:
   - Deletes the session row in PostgreSQL and clears the `serag_sid` cookie.

### CSRF Protection (`verifyCsrfToken`)
Every state-modifying request (`POST`, `PUT`, `PATCH`, `DELETE`) hitting an admin route must provide the header:
`x-csrf-token: <csrfToken>`
If the header is missing or does not match `session.csrfToken`, `SessionGuard` throws `ForbiddenException('انتهت الجلسة، حدّث الصفحة')`.

---

## 5. Fail-Closed Permission Guard (`PermissionGuard`)

RBAC is enforced globally on all admin routes by `apps/api/src/auth/permission.guard.ts`.

### Guard Behavior:
- **Non-Admin Routes**: Automatically bypassed (`isAdminRoute(req)` is false).
- **Public Admin Routes**: Bypassed if annotated with `@Public()` (e.g. `POST /api/admin/auth/login`).
- **Any Admin Allowed**: Allowed if annotated with `@AnyAdmin()` (e.g. `/api/admin/auth/me`, `/logout`).
- **Permission Checking**: Requires `@RequirePermission(...permissions)`.
  - Every required permission must be present in `admin.permissions` (`every()`).
- **Fail-Closed Guarantee**: If an admin controller route has **no** annotation (`@Public`, `@AnyAdmin`, or `@RequirePermission`), the guard logs a warning and **denies access with 403 Forbidden**. Unannotated endpoints are never accidentally left open.

```ts
// Example route definition:
@Post('orders/:id/confirm')
@RequirePermission('orders.confirmPayment')
async confirmPayment(@Param('id') id: string) { ... }
```

---

## 6. Audit Logging (`AuditInterceptor`)

Mutations performed by admin users are automatically audited:

- **Interceptor**: `apps/api/src/audit/audit.interceptor.ts`.
- **Trigger**: Any non-GET request on an admin route with an `@Audit('entityName')` decorator.
- **Data Captured**:
  - `userId`: ID of the acting administrator (`req.admin?.userId`).
  - `action`: `<entity>.<handlerName>` (e.g. `orders.confirmPayment`).
  - `entityId`: Extracted from route params (`id`) or response body.
  - `after`: JSON snapshot of the response body, truncated to 20 KB (`MAX_AUDIT_JSON_BYTES`) if oversized.
  - `ip`: Extracted client IP.

---

## 7. Rate Limiting (`ThrottlerModule`) & Trust Proxy

- **Trust Proxy**: In `main.ts`, `app.set('trust proxy', 1)` is configured so Express trusts Caddy's `X-Forwarded-For` header. Rate limiting binds to the actual client IP, not Caddy's internal container IP.
- **Global Limits**: 120 requests per 60 seconds.
- **Sensitive Route Throttling**: `@Throttle({ default: { limit: 5, ttl: 60_000 } })` applied to `/api/admin/auth/login` to prevent brute-force attacks.

---

## 8. Test Seed Module (`TestSeedModule`)

To support browser E2E tests without slow UI workflows or catalog pollution, the API includes an isolated test seed module at `apps/api/src/test-seed/`.

### Security Restrictions:
- **Dynamic Module**: `TestSeedModule.forRoot()` checks:
  1. `process.env.ALLOW_TEST_SEED === 'true'`
  2. `process.env.TEST_SEED_SECRET` is at least 16 characters long.
- **404 Behavior**: If either condition is not met, the controller is **not registered**. All `/api/test/*` routes return 404 Not Found.
- **403 Behavior**: When enabled, every request must include:
  `x-test-seed-secret: <TEST_SEED_SECRET>`
  Missing or invalid secrets return 403 Forbidden (verified using constant-time `timingSafeEqual`).
- **Production Safety**: `ALLOW_TEST_SEED` must NEVER be set to `true` in production (`compose.yml`). It is only enabled in `compose.e2e.yml` and local test runners.

### Test Seed Endpoints:
- `POST /api/test/seed/product`: Seed a test product tagged with `runId`.
- `POST /api/test/seed/order`: Seed a test order tagged with `runId`.
- `POST /api/test/seed/admin-session`: Create a valid admin session without UI login.
- `DELETE /api/test/run/:runId`: Delete all products, orders, and sessions tagged with `runId`.
- `POST /api/test/reset`: Wipe all test data prefixed with `E2E-`.
