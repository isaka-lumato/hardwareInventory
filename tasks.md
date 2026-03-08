# HMS Build Tasks
# Hardware Store Management System

**How to use this file:**
- Give Claude Code the prompt inside each task's `PROMPT` block
- Test using the `TEST` checklist before marking done
- Change `[ ]` to `[x]` when a task passes all tests
- Never skip a task — each one builds on the previous

---

## PHASE 1 — PROJECT SETUP

---

### Task 1 — Initialize Next.js Project
- [ ] Done

**PROMPT:**
```
Create a new Next.js 14 project using the App Router. Use TypeScript. Install and configure Tailwind CSS. Install the Supabase client library (@supabase/supabase-js and @supabase/ssr). Create a .env.local file with placeholder variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Create a /lib/supabase folder with a client.ts file (browser client) and a server.ts file (server client using cookies). The app should start without errors.
```

**TEST:**
- [ ] `npm run dev` starts with no errors
- [ ] App loads at localhost:3000
- [ ] Tailwind styles work (add a test `className="text-red-500"` and confirm it renders red)
- [ ] `.env.local` exists with the two Supabase placeholder keys

---

### Task 2 — Supabase Project & Database Schema
- [ ] Done

**PROMPT:**
```
Create a file at /supabase/schema.sql with the full database schema for the HMS system. Use the following tables:

1. profiles — id (UUID, FK to auth.users), name (text), role (text: 'cashier' | 'storekeeper' | 'admin'), is_active (boolean, default true), created_at
2. categories — id (UUID), name (text), created_at
3. products — id (UUID), name (text), sku (text, nullable), category_id (UUID FK → categories), cost_price (integer, in cents), selling_price (integer, in cents), stock_quantity (integer, default 0), unit (text, e.g. 'piece', 'meter'), is_active (boolean, default true), created_at
4. orders — id (UUID), order_number (text, unique), cashier_id (UUID FK → profiles), status (text: 'pending' | 'fulfilled' | 'cancelled'), payment_method (text: 'cash' | 'mobile_money' | 'credit'), subtotal (integer), discount (integer, default 0), total (integer), notes (text, nullable), created_at, fulfilled_at (nullable)
5. order_items — id (UUID), order_id (UUID FK → orders), product_id (UUID FK → products), product_name (text), quantity (numeric), unit_cost_price (integer), unit_selling_price (integer), line_total (integer)

Add these indexes: orders.status, orders.created_at, orders.cashier_id, products.is_active.

Also create a SQL function: next_order_number() that returns a sequential order number in format 'ORD-0001', auto-incrementing based on existing orders count.
```

**TEST:**
- [ ] File `/supabase/schema.sql` exists
- [ ] Open the file and confirm all 5 tables are present
- [ ] Go to your Supabase project → SQL Editor → paste and run the schema → no errors
- [ ] All 5 tables appear in Supabase Table Editor
- [ ] Run `SELECT next_order_number();` in SQL Editor — it should return `ORD-0001`

---

### Task 3 — Supabase Auth & Row Level Security
- [ ] Done

**PROMPT:**
```
Create a file at /supabase/rls.sql with Row Level Security policies for all tables.

Rules:
- profiles: users can read their own profile; admins can read all profiles
- products: all authenticated users can read active products; only admins can insert/update/delete
- categories: all authenticated users can read; only admins can insert/update/delete
- orders: cashiers can insert and read their own orders; storekeepers can read all orders and update status; admins can do everything
- order_items: cashiers can insert items for their own orders; storekeepers and admins can read all

Also create a Supabase database trigger: when a new user signs up (insert into auth.users), automatically insert a row into profiles with role = 'cashier' by default.

Create the file /supabase/seed.sql that inserts:
- 3 categories: 'Plumbing', 'Electrical', 'Hardware'
- 5 sample products across those categories with realistic cost and selling prices (stored as integers in cents, e.g. 1000 = $10.00)
```

**TEST:**
- [ ] `/supabase/rls.sql` exists
- [ ] `/supabase/seed.sql` exists
- [ ] Run rls.sql in Supabase SQL Editor — no errors
- [ ] Run seed.sql in Supabase SQL Editor — no errors
- [ ] Confirm 3 categories and 5 products appear in Table Editor

---

### Task 4 — Auth Pages (Login)
- [ ] Done

**PROMPT:**
```
Build the login page at /app/login/page.tsx. 

Requirements:
- Email and password fields
- "Sign In" button that calls Supabase signInWithPassword
- Show error message if login fails (e.g. "Invalid email or password")
- Show loading state on the button while signing in
- After successful login, read the user's role from the profiles table and redirect:
  - cashier → /cashier/new-order
  - storekeeper → /storekeeper/queue
  - admin → /admin/dashboard
- If the user is already logged in and visits /login, redirect them to their role's home page
- Style it cleanly with Tailwind — centered card layout, store name as the heading
- Add a sign out utility function to /lib/auth.ts
```

**TEST:**
- [ ] Go to localhost:3000 — should redirect to /login
- [ ] Login page renders without errors
- [ ] Entering wrong credentials shows an error message
- [ ] Create a test user in Supabase Auth (manually), set their profile role to 'admin', login → redirects to /admin/dashboard
- [ ] Create another user with role 'cashier' → login redirects to /cashier/new-order

---

### Task 5 — Route Guards & Layout Shells
- [ ] Done

**PROMPT:**
```
Create route protection middleware using Next.js middleware.ts at the project root.

Rules:
- Unauthenticated users trying to access any /cashier/*, /storekeeper/*, or /admin/* route should be redirected to /login
- Authenticated users accessing a route not meant for their role should be redirected to their correct home page (e.g. a cashier visiting /admin/dashboard redirects to /cashier/new-order)

Then create three layout shell components:
1. /app/cashier/layout.tsx — shows a top nav with: store logo/name, current user name, and a Sign Out button
2. /app/storekeeper/layout.tsx — same top nav structure
3. /app/admin/layout.tsx — top nav with the store name, current user name, Sign Out button, and a sidebar with links to: Dashboard, Products, Inventory, Sales, Users

Create placeholder pages (just an h1 heading) for all routes listed in the PRD so the app doesn't crash when navigating:
- /cashier/new-order
- /cashier/orders
- /storekeeper/queue
- /admin/dashboard
- /admin/products
- /admin/inventory
- /admin/sales
- /admin/users
```

**TEST:**
- [ ] Visiting localhost:3000/admin/dashboard while logged out redirects to /login
- [ ] Logging in as cashier and manually navigating to /admin/dashboard redirects to /cashier/new-order
- [ ] All 8 placeholder pages load without errors when logged in as the correct role
- [ ] Sign Out button works and returns to /login
- [ ] Admin layout shows sidebar with all nav links

---

## PHASE 2 — CASHIER FLOW

---

### Task 6 — Product Search Component
- [ ] Done

**PROMPT:**
```
Build a reusable ProductSearch component at /components/ProductSearch.tsx.

Requirements:
- Text input that searches products by name or SKU as the user types (debounced 300ms)
- Queries Supabase for active products matching the search term
- Shows results in a dropdown list below the input
- Each result shows: product name, SKU (if exists), selling price (formatted as currency), and unit
- Clicking a result calls an onSelect(product) callback prop and clears the search input
- Shows "No products found" if search returns empty
- Shows a loading indicator while fetching
- Closes the dropdown if user clicks outside the component

Do not connect it to a cart yet — just build and export the component. Test it by temporarily dropping it into the /cashier/new-order page.
```

**TEST:**
- [ ] Component renders on the new-order page
- [ ] Typing a product name shows matching results from Supabase
- [ ] Typing a SKU also finds the product
- [ ] Clicking a result fires onSelect (log it to console for now) and clears input
- [ ] Typing something with no match shows "No products found"
- [ ] Clicking outside closes the dropdown

---

### Task 7 — Order Cart
- [ ] Done

**PROMPT:**
```
Build the full order cart on /cashier/new-order/page.tsx.

Requirements:
- Use the ProductSearch component from Task 6
- When a product is selected, add it to the cart (local state)
- If the product is already in the cart, increase its quantity by 1
- Cart table shows columns: Product Name, Unit, Qty, Unit Price, Line Total, and a Remove button
- Quantity field in the cart is editable (input field, min 0.1, supports decimals for things like meters)
- Setting quantity to 0 removes the item from the cart
- Below the cart show: Subtotal, and Total (same as subtotal for now — discounts come later)
- All prices displayed formatted as currency (e.g. TZS 1,000 or your local currency)
- Cart persists if user accidentally refreshes (use localStorage for cart state only)
- "Clear Cart" button empties the cart with a confirmation prompt
```

**TEST:**
- [ ] Adding a product adds it to the cart table
- [ ] Adding the same product again increments quantity
- [ ] Changing quantity recalculates the line total and subtotal in real-time
- [ ] Removing an item updates the subtotal correctly
- [ ] Clearing the cart empties it after confirmation
- [ ] Refreshing the page restores the cart from localStorage

---

### Task 8 — Order Submission
- [ ] Done

**PROMPT:**
```
Add order submission to /cashier/new-order/page.tsx.

Requirements:
- Add a "Payment Method" dropdown: Cash, Mobile Money, Credit
- Add an optional "Notes" textarea
- Add a "Submit Order" button (disabled if cart is empty)
- On submit:
  1. Call next_order_number() Supabase function to get the order number
  2. Insert a row into the orders table with status = 'pending'
  3. Insert all cart items into order_items table
  4. Clear the cart from localStorage
  5. Redirect to /cashier/orders/[orderId]/print
- Show a loading state on the button while submitting
- Show an error message if submission fails
- Do not build the print page yet — just redirect to the URL and show a placeholder
```

**TEST:**
- [ ] Submit button is disabled with empty cart
- [ ] Selecting a payment method and clicking submit inserts a new order in Supabase orders table
- [ ] Order items appear in order_items table in Supabase
- [ ] Order number is sequential (ORD-0001, ORD-0002, etc.)
- [ ] After submit, cart is cleared and user is redirected
- [ ] Order status in Supabase is 'pending'

---

### Task 9 — Print Invoice
- [ ] Done

**PROMPT:**
```
Build the print invoice page at /cashier/orders/[orderId]/print/page.tsx.

Requirements:
- Fetch the order and its items from Supabase using the orderId from the URL
- Display a clean invoice layout with:
  - Store name and tagline at the top (hardcode as "Hardware Store" for now — make it a config constant)
  - Order number and date/time (formatted nicely)
  - Cashier name
  - Table of items: Product Name, Qty, Unit, Unit Price, Line Total
  - Subtotal and Grand Total
  - Payment method
  - Footer: "Thank you for your business!"
- Two buttons (visible on screen but hidden when printing):
  - "Print" — calls window.print()
  - "New Order" — navigates back to /cashier/new-order
- Add a print-specific CSS block using @media print:
  - Hide the two buttons
  - Remove page margins
  - Use black text on white background only
  - Make the layout fit A4 paper
- After loading, automatically trigger the print dialog
```

**TEST:**
- [ ] Navigate to the print page after submitting an order — invoice renders correctly
- [ ] All order items appear with correct quantities and prices
- [ ] Totals are correct
- [ ] Clicking "Print" opens the browser print dialog
- [ ] In the print preview, the buttons are NOT visible
- [ ] "New Order" button goes back to the order creation page
- [ ] Print dialog opens automatically on page load

---

### Task 10 — Cashier Order History
- [ ] Done

**PROMPT:**
```
Build the cashier's order history page at /cashier/orders/page.tsx.

Requirements:
- Shows a table of all orders placed by the currently logged-in cashier
- Columns: Order Number, Date/Time, Items (count), Total, Payment Method, Status (badge: pending=yellow, fulfilled=green, cancelled=red)
- Sorted by most recent first
- Clicking any row navigates to the print page for that order (/cashier/orders/[orderId]/print)
- Add a date filter (Today / This Week / This Month / All Time) — default to Today
- Show a "No orders yet" empty state if none exist
- Add a link to this page in the cashier top nav
```

**TEST:**
- [ ] Orders page shows orders for the logged-in cashier
- [ ] Orders from other cashiers do NOT appear
- [ ] Status badges show correct colors
- [ ] Clicking a row opens the correct print page
- [ ] Date filter correctly filters results
- [ ] "Today" filter shows only today's orders

---

## PHASE 3 — STOREKEEPER FLOW

---

### Task 11 — Storekeeper Order Queue (Static)
- [ ] Done

**PROMPT:**
```
Build the storekeeper order queue at /storekeeper/queue/page.tsx.

Requirements:
- Fetch all orders with status = 'pending' from Supabase, sorted oldest first
- Display each order as a card showing:
  - Order number (large, bold)
  - Time created (e.g. "14 minutes ago" using relative time)
  - Cashier name
  - List of items: quantity + product name + unit (e.g. "3x PVC Pipe 1 inch (piece)")
  - Notes (if any, shown in a highlighted box)
  - "Mark as Fulfilled" button (green)
- Clicking "Mark as Fulfilled" updates order status to 'fulfilled' and sets fulfilled_at to now() in Supabase
- Fulfilled orders immediately disappear from the queue
- Show "No pending orders" empty state when queue is empty
- Build this as static (no real-time yet — that comes in the next task)
```

**TEST:**
- [ ] Submit a new order as cashier, then log in as storekeeper — it appears in the queue
- [ ] Order card shows all items correctly
- [ ] Clicking "Mark as Fulfilled" removes it from the queue
- [ ] Check Supabase — order status changed to 'fulfilled' and fulfilled_at is set
- [ ] Empty state shows when no pending orders exist

---

### Task 12 — Real-Time Order Queue
- [ ] Done

**PROMPT:**
```
Add Supabase Realtime to the storekeeper queue page (/storekeeper/queue/page.tsx).

Requirements:
- Subscribe to the orders table for INSERT and UPDATE events using Supabase Realtime
- When a new order with status='pending' is inserted: add it to the queue immediately without page refresh
- When an order is updated to status='fulfilled' or 'cancelled': remove it from the queue immediately
- Show a subtle visual flash/highlight on newly arrived order cards (e.g. a brief green border animation for 2 seconds)
- Add a connection status indicator in the top right corner: green dot = connected, red dot = disconnected
- Clean up the Realtime subscription when the component unmounts
```

**TEST:**
- [ ] Open the storekeeper queue in one browser tab
- [ ] In another tab (or incognito), log in as cashier and submit a new order
- [ ] The new order appears on the storekeeper screen within 3 seconds WITHOUT refreshing
- [ ] The new card briefly shows a highlight animation
- [ ] Mark the order as fulfilled — it disappears from the queue in real-time
- [ ] Green connection dot is visible in the corner

---

## PHASE 4 — ADMIN FLOW

---

### Task 13 — Product Management (Admin)
- [ ] Done

**PROMPT:**
```
Build the admin products page at /admin/products/page.tsx.

Requirements:
- Table showing all products with columns: Name, SKU, Category, Cost Price, Selling Price, Stock, Unit, Status (Active/Inactive)
- Search input to filter products by name or SKU
- Filter dropdown to filter by category
- "Add Product" button opens a slide-over panel (or modal) with a form:
  - Name (required)
  - SKU (optional)
  - Category (dropdown from categories table)
  - Cost Price (number input — display in currency, store in cents)
  - Selling Price (number input — display in currency, store in cents)
  - Stock Quantity (integer)
  - Unit (text input with suggestions: piece, meter, kg, liter, box, roll)
  - Active toggle
- Clicking any product row opens the same panel in edit mode pre-filled with that product's data
- Save button inserts or updates the product in Supabase
- "Deactivate" button on edit mode sets is_active = false (does not delete)
- Show profit margin percentage next to each product: ((selling - cost) / selling × 100)%
```

**TEST:**
- [ ] Products page loads and shows the 5 seeded products
- [ ] Search filters products correctly
- [ ] Category filter works
- [ ] Adding a new product saves it and it appears in the table
- [ ] Editing a product updates the values in Supabase
- [ ] Deactivating a product marks it inactive — it no longer appears in cashier product search
- [ ] Profit margin % is shown and is mathematically correct

---

### Task 14 — Admin Dashboard (Reports)
- [ ] Done

**PROMPT:**
```
Build the admin dashboard at /admin/dashboard/page.tsx.

Requirements:
- Date range selector at the top: Today / This Week / This Month / Custom Range — default to Today
- Summary cards row showing for the selected period:
  - Total Revenue (sum of order totals for fulfilled orders)
  - Total Cost (sum of order_item.unit_cost_price × quantity for fulfilled orders)
  - Gross Profit (Revenue − Cost)
  - Profit Margin % ((Profit / Revenue) × 100, show 0% if no revenue)
  - Number of Orders
  - Average Order Value
- Bar chart showing daily revenue for the last 30 days (use Recharts library)
- Table: Top 10 best-selling products by quantity sold (for the selected period)
- Table: Top 10 products by revenue (for the selected period)
- All monetary values formatted as currency
- Show loading skeletons while data is fetching
- All queries should only count orders with status = 'fulfilled'
```

**TEST:**
- [ ] Dashboard loads without errors
- [ ] Fulfill a few test orders (via storekeeper queue) then check dashboard
- [ ] Revenue = sum of fulfilled order totals ✓
- [ ] Cost = sum of cost prices × quantities from those orders ✓
- [ ] Profit = Revenue − Cost ✓
- [ ] Switching date range updates all cards and charts
- [ ] Cancelled or pending orders are NOT counted in the metrics
- [ ] Bar chart renders and shows correct daily data
- [ ] Top products tables populate correctly

---

### Task 15 — Admin Sales History
- [ ] Done

**PROMPT:**
```
Build the admin sales history page at /admin/sales/page.tsx.

Requirements:
- Paginated table (20 rows per page) of all orders across all cashiers
- Columns: Order Number, Date/Time, Cashier Name, Items Count, Subtotal, Total, Payment Method, Status
- Filters: date range picker, cashier dropdown (list of all cashiers), status dropdown, payment method dropdown
- Clicking any row expands it (or navigates to a detail view) showing the full list of items in that order
- "Export CSV" button that exports the filtered results as a .csv file (client-side generation, no server needed)
- Summary row at the bottom of the current page showing totals for visible rows
```

**TEST:**
- [ ] Sales page loads and shows all orders
- [ ] Filtering by cashier shows only that cashier's orders
- [ ] Filtering by status works
- [ ] Clicking a row shows the order's items
- [ ] CSV export downloads a file with correct data
- [ ] Pagination works (if more than 20 orders exist)

---

### Task 16 — Admin User Management
- [ ] Done

**PROMPT:**
```
Build the admin user management page at /admin/users/page.tsx.

Requirements:
- Table of all users showing: Name, Email, Role, Status (Active/Inactive), Date Joined
- "Add User" button opens a form to invite a new user:
  - Name
  - Email
  - Role (cashier / storekeeper / admin)
  - Use Supabase's inviteUserByEmail to send an invitation email
- Clicking a user opens an edit panel:
  - Change their role
  - Deactivate/reactivate account (sets is_active on profiles)
- Admin cannot deactivate their own account
- Show a badge for each role with distinct colors: cashier=blue, storekeeper=orange, admin=purple
```

**TEST:**
- [ ] Users page shows all existing users
- [ ] Role badges show with correct colors
- [ ] Inviting a new user sends an email (check Supabase Auth → Users)
- [ ] Changing a user's role updates their profile in Supabase
- [ ] Deactivating a user sets is_active = false — they can no longer log in (Supabase will block them via RLS)
- [ ] Trying to deactivate your own account shows an error

---

## PHASE 5 — POLISH & EDGE CASES

---

### Task 17 — Error Handling & Loading States
- [ ] Done

**PROMPT:**
```
Audit the entire application and add consistent error handling and loading states everywhere they are missing.

Specifically:
- Every Supabase query should have a try/catch that shows a user-friendly error message (not a raw error object)
- Add a global error boundary component that catches React render errors and shows a friendly "Something went wrong" page with a Reload button
- All buttons that trigger async operations must show a loading spinner and be disabled while loading (prevent double-submit)
- If the Supabase connection fails, show a clear "Connection error — please refresh" banner at the top
- Add form validation to all forms:
  - Product form: name required, selling price must be > 0, selling price must be >= cost price
  - Order submission: must have at least one item, must select payment method
- Show a toast notification (top-right corner) for all success and error events (e.g. "Order submitted successfully", "Product saved", "Error saving product")
```

**TEST:**
- [ ] Temporarily break the Supabase URL in .env.local — connection error banner appears
- [ ] Try submitting the order form with no items — shows validation error
- [ ] Try adding a product with selling price < cost price — shows a warning
- [ ] Submit a valid order — success toast appears
- [ ] All buttons show loading state and are non-clickable during submission
- [ ] Restore the correct Supabase URL — everything works again

---

### Task 18 — Mobile Responsiveness
- [ ] Done

**PROMPT:**
```
Make the following pages mobile-responsive (they are most likely to be used on tablets or phones):

1. /storekeeper/queue — order cards should stack vertically and be full-width on small screens. The "Mark as Fulfilled" button should be large and easy to tap.

2. /cashier/new-order — the product search and cart should work on a tablet. The cart table should collapse to a card view on small screens (< 768px).

3. /login — should be centered and usable on any screen size.

The admin screens do NOT need to be mobile-optimized for the MVP.
```

**TEST:**
- [ ] Open storekeeper queue on a phone/tablet screen (or use Chrome DevTools responsive mode at 768px width) — cards are readable and button is tappable
- [ ] Open cashier new-order on a tablet — search and cart are usable
- [ ] Login page looks good at 375px (iPhone size)

---

### Task 19 — Store Configuration
- [ ] Done

**PROMPT:**
```
Create a store configuration system.

1. Create a /lib/config.ts file that exports a STORE_CONFIG object with:
   - storeName: string
   - currency: string (e.g. "TZS")
   - currencySymbol: string (e.g. "TSh")
   - lowStockThreshold: number (default 5)
   - invoiceFooter: string

2. Update ALL places in the app where "Hardware Store" is hardcoded or where currency is formatted to use these config values instead.

3. Add a simple Settings page at /admin/settings/page.tsx where the admin can update storeName, currency symbol, and invoiceFooter. Save these to a settings table in Supabase (single-row config table). On app load, fetch and override the defaults from STORE_CONFIG with the values from the database.

4. Add the Settings link to the admin sidebar.
```

**TEST:**
- [ ] Change the store name in the settings page — it updates in the top nav and on the invoice
- [ ] Change the invoice footer — it appears on newly printed invoices
- [ ] Currency symbol appears consistently everywhere prices are shown
- [ ] Settings persist after page refresh (they come from Supabase, not just local state)

---

### Task 20 — Final QA & Deployment Prep
- [ ] Done

**PROMPT:**
```
Prepare the application for production deployment.

1. Create a /supabase/README.md with step-by-step instructions to set up the Supabase project from scratch (run schema.sql, rls.sql, seed.sql in order).

2. Create a .env.example file showing all required environment variables with placeholder values.

3. Create a top-level README.md with:
   - Project description
   - Tech stack
   - Local development setup instructions
   - Supabase setup instructions
   - How to create the first admin user (manual step via Supabase dashboard)
   - Deployment instructions for Vercel

4. Audit and remove all console.log statements from production code.

5. Make sure the Next.js build passes with no errors: run `npm run build` and fix any TypeScript or build errors.

6. Create a vercel.json file with the necessary environment variable keys listed (values will be set in Vercel dashboard).
```

**TEST:**
- [ ] `npm run build` completes with 0 errors and 0 warnings
- [ ] No console.log statements remain in /app or /components
- [ ] .env.example file has all required keys
- [ ] README.md exists and setup instructions are clear
- [ ] Deploy to Vercel — add environment variables in Vercel dashboard — app loads correctly on the live URL
- [ ] Test the full flow on the live URL: login → create order → storekeeper fulfills → admin sees it in dashboard

---

## TASK SUMMARY

| # | Task | Phase | Done |
|---|---|---|---|
| 1 | Initialize Next.js Project | Setup | [ ] |
| 2 | Database Schema | Setup | [ ] |
| 3 | Auth & Row Level Security | Setup | [ ] |
| 4 | Login Page | Setup | [ ] |
| 5 | Route Guards & Layout Shells | Setup | [ ] |
| 6 | Product Search Component | Cashier | [ ] |
| 7 | Order Cart | Cashier | [ ] |
| 8 | Order Submission | Cashier | [ ] |
| 9 | Print Invoice | Cashier | [ ] |
| 10 | Cashier Order History | Cashier | [ ] |
| 11 | Storekeeper Queue (Static) | Storekeeper | [ ] |
| 12 | Real-Time Queue | Storekeeper | [ ] |
| 13 | Product Management | Admin | [ ] |
| 14 | Admin Dashboard | Admin | [ ] |
| 15 | Sales History | Admin | [ ] |
| 16 | User Management | Admin | [ ] |
| 17 | Error Handling & Loading States | Polish | [ ] |
| 18 | Mobile Responsiveness | Polish | [ ] |
| 19 | Store Configuration | Polish | [ ] |
| 20 | Final QA & Deployment | Polish | [ ] |
