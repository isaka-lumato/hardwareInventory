# CLAUDE_PROMPT.md
# One-time kickoff prompt for the HMS build.
---

## WHAT YOU ARE BUILDING

A Hardware Store Management System (HMS). Read `PRD.md` now for the full product spec. Read `CLAUDE.md` now for the persistent rules you must follow throughout this entire project. Read `tasks.md` now for the complete list of tasks you will execute.

Do not write any code until you have read all three files.

---

## YOUR JOB

Work through every task in `tasks.md` from Task 1 to Task 20, in order, autonomously. Do not wait for the user between tasks unless you hit a blocker. Do not skip tasks. Do not combine tasks.

---

## BEFORE YOU START TASK 1 — PRINT THIS FOR THE USER

Print the following block exactly, then wait for the user to confirm all steps are complete:

```
╔══════════════════════════════════════════════════════════════╗
║           HMS — ONE-TIME SETUP (do this before we start)     ║
╚══════════════════════════════════════════════════════════════╝

You need to complete 4 steps before I start building.
Tell me when each step is done.

──────────────────────────────────────────────────────────────
STEP 1 — Check Node.js
──────────────────────────────────────────────────────────────
Run this in your terminal:
  node -v

✅ You need version 18.17 or higher.
❌ If lower or missing: go to https://nodejs.org → download LTS
   version → install → restart terminal → re-run node -v


──────────────────────────────────────────────────────────────
STEP 2 — Create a Supabase project
──────────────────────────────────────────────────────────────
1. Go to https://supabase.com → sign up for free
2. Click "New Project"
3. Name it: hms-store (or anything you like)
4. Set a strong database password → WRITE IT DOWN SOMEWHERE SAFE
5. Pick a region closest to your country
6. Wait ~2 minutes for the project to finish setting up

When it's ready:
→ Go to Project Settings → API
→ Copy these two values and keep them ready:
   - Project URL  (looks like: https://xxxx.supabase.co)
   - anon/public key  (long string starting with "eyJ...")


──────────────────────────────────────────────────────────────
STEP 3 — Set up your .env.local file
──────────────────────────────────────────────────────────────
In your project folder, copy .env.example to a new file called
.env.local

Open .env.local and fill in:
  NEXT_PUBLIC_SUPABASE_URL=        ← paste your Project URL here
  NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← paste your anon key here

For the store config values, fill in your store's real details.
Example for Tanzania:
  NEXT_PUBLIC_STORE_NAME=Karibu Hardware
  NEXT_PUBLIC_CURRENCY=TZS
  NEXT_PUBLIC_CURRENCY_SYMBOL=TSh

The SUPABASE_SERVICE_ROLE_KEY can be left blank for now —
I will remind you when it is needed (Task 3).


──────────────────────────────────────────────────────────────
STEP 4 — Confirm your project folder contains these files
──────────────────────────────────────────────────────────────
  ✅ PRD.md
  ✅ tasks.md
  ✅ CLAUDE_PROMPT.md
  ✅ CLAUDE.md
  ✅ .env.example
  ✅ .env.local  (just created in Step 3)

──────────────────────────────────────────────────────────────

When all 4 steps are done → tell me: "Setup complete, start building."
```

---

## HOW TO RUN BETWEEN TASKS

After every task completes, print this exact block:

```
╔══════════════════════════════════════════════════════════════╗
║  ✅ TASK [N] COMPLETE: [task name]
╚══════════════════════════════════════════════════════════════╝

HOW TO TEST THIS RIGHT NOW:
──────────────────────────────────────────────────────────────
1. [exact terminal command to run, e.g. "npm run dev"]
2. Open: http://localhost:3000/[exact path]
3. [exactly what to click or do]
4. [exactly what you should see if it is working]
──────────────────────────────────────────────────────────────

AUTOMATED TESTS: [N passed] / [N total]
GIT COMMIT: ✅  "task [N]: [description]"

Moving to Task [N+1]: [task name]...
```

Then immediately begin the next task without waiting.

---

## HOW TO HANDLE BLOCKERS

If something genuinely requires the user (missing keys, Supabase not provisioned, etc.), stop and print:

```
╔══════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Task [N]: [task name]
╚══════════════════════════════════════════════════════════════╝

I need something from you before I can continue.

WHAT I NEED:
[exactly what is missing]

HOW TO GET IT:
[exact steps]

WHAT TO TELL ME WHEN DONE:
[exactly what the user should say to resume]
```

Do not attempt to continue or work around the blocker. Wait.

---

## HOW TO HANDLE FAILING TESTS

1. Read the failure output carefully
2. Fix the root cause — do not patch around it
3. Re-run the tests
4. Repeat until all pass
5. Only then mark the task done and move on

If you have failed to fix the same test after 3 attempts, stop and print a blocker message explaining what is failing and what you have already tried.

---

## TESTING SETUP (do this inside Task 1, before scaffolding the app)

Install test tooling:

```bash
npm install -D vitest @playwright/test tsx
npx playwright install chromium
```

Create these files during Task 1:

**`/tests/setup.ts`**
Initializes a Supabase test client using `TEST_SUPABASE_URL` and
`TEST_SUPABASE_SERVICE_ROLE_KEY` from env. Exports a `testSupabase`
client that uses the service role key so tests can bypass RLS for
setup and teardown.

**`/tests/fixtures.ts`**
Factory functions for test data. Each returns the created record
plus a `cleanup()` function that deletes it after the test:
- `createTestUser(role)` — creates user in Auth + profiles
- `createTestProduct(overrides?)` — inserts product with defaults
- `createTestOrder(cashierId, items)` — inserts full order with items

**Test file naming convention:**
- `/tests/e2e/task-[N].spec.ts` — Playwright browser tests
- `/tests/unit/task-[N].test.ts` — Vitest logic and utility tests
- `/tests/db/task-[N].ts` — Supabase schema and RLS verification

**Add to `package.json`:**
```json
"test": "vitest run",
"test:e2e": "playwright test",
"test:db": "tsx tests/db/task-2.ts"
```

---

## WHAT TO TEST IN EACH TASK

### Tasks 1–3 (Project setup, schema, RLS)
Write `tsx` scripts that connect to Supabase and assert:
- All 5 tables exist with the correct column names and types
- RLS correctly blocks a `cashier` from reading another cashier's orders
- RLS correctly blocks a `cashier` from inserting into the products table
- Seed data is present (3 categories, 5 products)

### Tasks 4–5 (Login, route guards)
Playwright tests:
- Wrong credentials → error message visible on screen
- Correct cashier credentials → redirect to `/cashier/new-order`
- Correct admin credentials → redirect to `/admin/dashboard`
- Logged-out user visits `/admin/dashboard` → redirect to `/login`
- Cashier visits `/admin/dashboard` → redirect to `/cashier/new-order`

### Tasks 6–10 (Cashier flow)
Playwright walking the full cashier journey:
- Type a product name in search → results appear → click result → item in cart
- Change quantity → line total and subtotal recalculate correctly
- Submit order → order appears in Supabase with status `pending`
- Print page loads with correct items, quantities, and totals

### Tasks 11–12 (Storekeeper queue)
Playwright with two browser contexts running simultaneously:
- Context 1: logged in as cashier
- Context 2: logged in as storekeeper, queue page open
- Cashier submits order → assert new card appears in storekeeper queue within 3 seconds
- Storekeeper clicks "Mark as Fulfilled" → card disappears from queue
- Check Supabase: order status = `fulfilled`, `fulfilled_at` is set

### Tasks 13–16 (Admin screens)
Playwright:
- Add a new product → appears in product table → appears in cashier search
- Deactivate a product → disappears from cashier search
- Dashboard totals match the sum of fulfilled test orders
- CSV export from sales history downloads and contains the correct rows

### Tasks 17–20 (Polish, deployment)
- Unit test `/lib/currency.ts` with: zero, large number, negative, decimal input
- Unit test order number generator produces sequential non-duplicate values
- Submit order form with empty cart → assert validation error appears
- Submit product form with selling price less than cost price → assert warning appears
- `npm run build` exits with 0 errors

---

## PRE-TASK CHECKLIST (run through this mentally before writing code for any task)

- [ ] Have I re-read the relevant section of PRD.md for this task?
- [ ] Am I storing all money as integers in cents?
- [ ] Am I using `/lib/currency.ts` for every price display?
- [ ] Am I using the correct Supabase client (server.ts vs client.ts)?
- [ ] Does any new component with hooks or event handlers have `"use client"`?
- [ ] Will Realtime subscriptions be cleaned up on unmount?
- [ ] Are all environment variables in `.env.local`, not hardcoded?
- [ ] Will I commit to git when this task is done?

---

## IF THE USER CLOSES AND REOPENS CLAUDE CODE

`CLAUDE.md` handles continuity — Claude Code reads it automatically on startup.

When resuming a session:
1. Read `CLAUDE.md` for all project rules
2. Read `tasks.md` and find the first task not marked `[x] Done`
3. Print: `"Resuming from Task [N]: [task name]. Starting now..."`
4. Continue building

---

## THE BUILD IS COMPLETE WHEN

All 20 tasks in `tasks.md` are marked `[x] Done` and `npm run build` passes with zero errors.

Print this final block:

```
╔══════════════════════════════════════════════════════════════╗
║  🎉 HMS BUILD COMPLETE — all 20 tasks done
╚══════════════════════════════════════════════════════════════╝

What was built:
  ✅ Cashier: product search, cart, order submission, print invoice
  ✅ Storekeeper: real-time order queue with live updates
  ✅ Admin: product management, dashboard, sales history, users
  ✅ Auth: login, role-based routing, route protection
  ✅ Reports: daily revenue, profit/loss, top products

──────────────────────────────────────────────────────────────
FINAL STEPS TO GO LIVE
──────────────────────────────────────────────────────────────

1. Push to GitHub:
     git remote add origin https://github.com/YOUR_USERNAME/hms
     git push -u origin main

2. Deploy on Vercel:
     → Go to https://vercel.com
     → Click "Add New Project" → import your GitHub repo
     → Add every variable from your .env.local into Vercel's
       Environment Variables settings
     → Click Deploy
     → Wait ~2 minutes → your live URL will appear

3. Create your first admin user:
     → Supabase Dashboard → Authentication → Users → Add User
       (enter the owner's email and a temporary password)
     → Table Editor → profiles → find that user's row
     → Set role = 'admin' → Save
     → Log in at your live URL with those credentials
     → Go to Admin → Users to invite the rest of the staff

Your store is live. 🚀
──────────────────────────────────────────────────────────────
```
