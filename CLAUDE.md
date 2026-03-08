# CLAUDE.md
# Hardware Store Management System (HMS)
# Claude Code reads this file automatically at the start of every session.

---

## What This Project Is

A full-stack Point-of-Sale and store management system for a hardware business. Built with Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Realtime), and Tailwind CSS.

Reference files:
- `PRD.md` — full product requirements and data models
- `tasks.md` — 20 sequential build tasks with test checklists
- `CLAUDE_PROMPT.md` — the original build instructions

---

## Current Build Status

Check `tasks.md` to see which tasks are `[x] Done` and which are `[ ]` pending.

**When resuming a session:**
1. Read `tasks.md` and find the first task that is NOT marked done
2. Do not re-do completed tasks
3. Resume from the first incomplete task
4. Follow all rules below as if starting fresh

---

## Non-Negotiable Rules

### Money
- ALL prices stored as **integers in cents** — never floats
- Example: TSh 1,500 is stored as `150000`
- ALL display formatting goes through `/lib/currency.ts` — never format inline
- Never use `toFixed()` for money — use `Intl.NumberFormat`

### TypeScript
- Strict mode is ON — no disabling it
- All Supabase results use generated types from `/lib/database.types.ts`
- No `any` type — if unavoidable, add a `// TODO: type this` comment

### Supabase Clients
- `/lib/supabase/server.ts` → use in Server Components and API routes ONLY
- `/lib/supabase/client.ts` → use in Client Components ONLY
- NEVER use the `service_role` key in client-side code

### Next.js App Router
- Add `"use client"` to any component using hooks, browser APIs, or event handlers
- Server Components fetch data directly — no useEffect for initial data loading
- Client Components handle interactivity and real-time subscriptions

### Error Handling
- Every async function must have try/catch
- Never show raw Supabase error objects to users
- Use `/lib/errors.ts` for standardized error formatting
- Log full errors to console for debugging

### Git
- Commit after every completed task: `git add -A && git commit -m "task [N]: [description]"`

---

## Folder Structure

```
/app
  /login
  /cashier
    /new-order
    /orders/[orderId]/print
  /storekeeper
    /queue
  /admin
    /dashboard
    /products
    /inventory
    /sales
    /users
    /settings
/components
  /ui              ← base primitives (Button, Input, Badge, Toast)
/lib
  currency.ts      ← ALL money formatting lives here
  errors.ts        ← standardized error handling
  database.types.ts ← Supabase generated types
  /supabase
    client.ts      ← browser Supabase client
    server.ts      ← server Supabase client
/supabase
  schema.sql
  rls.sql
  seed.sql
/tests
  /e2e             ← Playwright tests
  /unit            ← Vitest tests
  /db              ← database/RLS tests
  fixtures.ts
  setup.ts
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| Charts | Recharts |
| Testing | Playwright (E2E) + Vitest (unit) |
| Deployment | Vercel |

---

## User Roles & Routes

| Role | Home Route | Access |
|---|---|---|
| cashier | `/cashier/new-order` | `/cashier/*` only |
| storekeeper | `/storekeeper/queue` | `/storekeeper/*` only |
| admin | `/admin/dashboard` | `/admin/*` only |

Route protection is handled by `middleware.ts` at the project root.

---

## Key Data Model Notes

- `products.cost_price` and `products.selling_price` → integers (cents)
- `order_items.quantity` → `numeric` type (supports decimals for meters, kg etc.)
- `order_items` stores **snapshots** of price at time of sale — not live references
- Order numbers format: `ORD-0001` via `next_order_number()` Postgres function using a sequence
- All timestamps stored in UTC, displayed in user's local timezone

---

## Common Pitfalls (read before every session)

1. **Empty Supabase query results** = almost always an RLS policy blocking the request. Test the query in Supabase SQL Editor first (bypasses RLS).
2. **Realtime subscriptions** must be cleaned up in `useEffect` return function or memory leaks occur.
3. **"use client" missing** = cryptic hydration errors. Add it to any component with hooks or event handlers.
4. **Decimal quantities** = use `numeric` in Postgres and `parseFloat` in JS, never `parseInt`.
5. **Print layout** = test in both Chrome and Firefox. Always check the print preview before marking Task 9 done.
