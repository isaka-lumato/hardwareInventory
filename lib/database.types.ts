// This file will be populated with generated Supabase types after the schema is created.
// For now, define the basic types manually based on the PRD data models.

export type UserRole = 'cashier' | 'storekeeper' | 'admin'
export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled'
export type PaymentMethod = 'cash' | 'mobile_money' | 'credit'

export interface Profile {
  id: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  sku: string | null
  category_id: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  unit: string
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  cashier_id: string
  status: OrderStatus
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  total: number
  notes: string | null
  created_at: string
  fulfilled_at: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_cost_price: number
  unit_selling_price: number
  line_total: number
}
