# Product Requirements Document
# Hardware Store Management System (HMS)

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** March 2026

---

## 1. Overview

A web-based Point-of-Sale and store management system for a hardware business. The system enables front desk staff to create and print customer orders, gives the storekeeper a real-time digital order queue to prepare items, and provides the owner/admin with financial reporting (daily income, profit, and loss).

---

## 2. Goals

- Replace manual/paper-based order tracking with a digital system
- Give the storekeeper visibility into pending orders without relying solely on printed slips
- Enable the owner to track daily sales, revenue, and profitability at a glance
- Keep the system simple enough for non-technical staff to use with minimal training

---

## 3. User Roles

### 3.1 Cashier (Front Desk)
The staff member who interacts with the customer directly. They search for products, build orders, collect payment, and print invoices.

### 3.2 Storekeeper
The staff member in the storage area or warehouse. They receive order notifications in real-time on their own screen and prepare/fulfill items for the customer.

### 3.3 Admin (Owner/Manager)
Has full access to the system including product management, inventory, user management, and all financial reports.

---

## 4. Data Models

### Product
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | e.g. "PVC Pipe 1 inch" |
| sku | string | Optional barcode/code |
| category | string | e.g. "Plumbing", "Electrical" |
| cost_price | decimal | What the store paid |
| selling_price | decimal | What the customer pays |
| stock_quantity | integer | Current units in stock |
| unit | string | e.g. "piece", "meter", "kg" |
| is_active | boolean | Hide discontinued products |
| created_at | timestamp | |

### Order
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| order_number | string | Human-readable, e.g. "ORD-0042" |
| cashier_id | UUID | FK → User |
| status | enum | pending, fulfilled, cancelled |
| payment_method | enum | cash, mobile_money, credit |
| subtotal | decimal | Sum of line items |
| discount | decimal | Optional flat or % discount |
| total | decimal | Final amount charged |
| notes | string | Optional order notes |
| created_at | timestamp | |
| fulfilled_at | timestamp | When storekeeper marks done |

### OrderItem
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| order_id | UUID | FK → Order |
| product_id | UUID | FK → Product |
| product_name | string | Snapshot at time of sale |
| quantity | decimal | Supports partial units |
| unit_cost_price | decimal | Snapshot at time of sale |
| unit_selling_price | decimal | Snapshot at time of sale |
| line_total | decimal | qty × selling_price |

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | Display name |
| email | string | Login email |
| role | enum | cashier, storekeeper, admin |
| is_active | boolean | |
| created_at | timestamp | |

---

## 5. Features

### 5.1 Authentication
- Email + password login
- Role-based access control (RBAC)
- Each role sees only their relevant screens
- Session persists across page refreshes

---

### 5.2 Cashier — Order Creation

**Screen: New Order**

- Search products by name or SKU (live search as you type)
- Click a product to add to cart; set quantity manually
- Cart shows: product name, unit, qty, unit price, line total
- Edit or remove items from cart at any time
- Apply a discount (flat amount or percentage)
- Order summary shows subtotal, discount, and final total
- Select payment method (cash / mobile money / credit)
- Add optional order notes
- **Submit Order** button creates the order with status = `pending`
- After submit: show print dialog with invoice layout
- System auto-assigns order number (sequential)

**Invoice Print Layout**

- Store name and logo (configurable)
- Order number and date/time
- Cashier name
- Line items table: product name, qty, unit price, total
- Subtotal, discount, grand total
- Payment method
- Footer: "Thank you" message (configurable)
- Clean black-and-white layout optimized for thermal/A4 printing

---

### 5.3 Storekeeper — Order Queue

**Screen: Order Queue**

- Shows all orders with status = `pending`, sorted oldest first
- Each order card displays:
  - Order number
  - Time created
  - List of items and quantities
  - Notes (if any)
- Real-time updates — new orders appear automatically without page refresh (via Supabase Realtime)
- **Mark as Fulfilled** button on each card → changes status to `fulfilled`
- **Flag Issue** button → marks order with a flag and optional note (e.g. "Item out of stock")
- Fulfilled orders move to a "Completed Today" section at the bottom (collapsed by default)

---

### 5.4 Admin — Product Management

**Screen: Products**

- Table view of all products with search and category filter
- Add new product (all fields from Product model)
- Edit existing product (name, prices, stock, category)
- Deactivate product (soft delete — hides from cashier search)
- Bulk CSV import for initial product setup

**Screen: Inventory**

- Same as Products but focused on stock levels
- Highlight low-stock items (configurable threshold, default: 5 units)
- Manually adjust stock quantity with a reason log (e.g. "Received new shipment", "Damaged goods")

---

### 5.5 Admin — Reports & Analytics

**Screen: Dashboard**

Displayed metrics (all filterable by date range):

| Metric | Calculation |
|---|---|
| Total Revenue | Sum of `order.total` for completed orders |
| Total Cost | Sum of `orderitem.unit_cost_price × qty` |
| Gross Profit | Revenue − Cost |
| Profit Margin | (Profit / Revenue) × 100 |
| Number of Orders | Count of orders |
| Average Order Value | Revenue / Number of Orders |

**Charts:**
- Daily revenue bar chart (last 30 days)
- Top 10 best-selling products by quantity
- Top 10 products by revenue

**Screen: Sales History**

- Paginated table of all orders
- Filter by: date range, cashier, status, payment method
- Click any order to view full detail
- Export to CSV

---

## 6. Screens Summary

| Screen | Role | Path |
|---|---|---|
| Login | All | `/login` |
| New Order | Cashier | `/cashier/new-order` |
| Order History | Cashier | `/cashier/orders` |
| Order Queue | Storekeeper | `/storekeeper/queue` |
| Dashboard | Admin | `/admin/dashboard` |
| Products | Admin | `/admin/products` |
| Inventory | Admin | `/admin/inventory` |
| Sales History | Admin | `/admin/sales` |
| Users | Admin | `/admin/users` |

---

## 7. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Full-stack, fast, great DX |
| Styling | Tailwind CSS | Rapid UI development |
| Database | Supabase (PostgreSQL) | Managed DB + Realtime built in |
| Auth | Supabase Auth | Email/password, RBAC via RLS |
| Real-time | Supabase Realtime | Storekeeper live order queue |
| Printing | Browser `window.print()` | No library needed for MVP |
| Deployment | Vercel | Free tier, CI/CD from GitHub |

---

## 8. MVP Scope (Phase 1)

Build only these features for the first working version:

- [x] Login (all roles)
- [x] Cashier: Create order + print invoice
- [x] Storekeeper: Real-time order queue + mark fulfilled
- [x] Admin: Add/edit products with cost and selling price
- [x] Admin: Dashboard with daily revenue and profit summary

**Out of scope for MVP:**
- Inventory stock tracking and adjustments
- CSV bulk import
- Sales history export
- Flagging orders
- Low stock alerts
- Discounts

---

## 9. Non-Functional Requirements

- System must work on desktop browsers (Chrome, Firefox)
- Storekeeper queue must update within 3 seconds of a new order being placed
- Invoice print layout must work on both A4 paper and standard thermal receipt paper (80mm)
- No data should be lost if the browser is refreshed mid-order
- All money values stored as integers (cents/smallest currency unit) to avoid floating point errors

---

## 10. Open Questions

1. What is the store's currency? (affects formatting)
2. Should cashiers be able to edit or cancel orders after submission?
3. Does the storekeeper screen need to run on a specific device (tablet, desktop)?
4. Should the system support multiple cashier terminals simultaneously?
5. Is there a need for customer records (name, phone) on orders, or are orders anonymous?
6. What payment methods are used? (Cash only? Mobile money? Credit accounts?)

---

## 11. Suggested Claude Code Prompting Order

Use this sequence to build the system efficiently:

```
1. "Read PRD.md and set up a Next.js 14 + Supabase project. Create the full database schema as a SQL migration file based on the data models in the PRD."

2. "Set up Supabase Auth with three roles: cashier, storekeeper, admin. Create the login page and route guards so each role can only access their screens."

3. "Build the Cashier New Order screen: product search, cart, quantity editing, total calculation, and order submission. Store the order in Supabase."

4. "Add a print invoice feature to the order confirmation screen. Create a clean print-only CSS layout based on the invoice spec in the PRD."

5. "Build the Storekeeper Order Queue screen. Use Supabase Realtime to show new orders live. Add a Mark as Fulfilled button."

6. "Build the Admin Products screen: table view, add product form, edit product form with all fields from the PRD data model."

7. "Build the Admin Dashboard. Query Supabase to calculate total revenue, cost, gross profit, and number of orders for today. Add a 30-day bar chart using Recharts."
```