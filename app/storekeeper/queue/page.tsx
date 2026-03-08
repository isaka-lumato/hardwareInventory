'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderItem } from '@/lib/database.types'

interface QueueOrder extends Order {
  items: OrderItem[]
  cashier_name: string
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function QueuePage() {
  const [orders, setOrders] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [fulfilling, setFulfilling] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchOrders() {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError
      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        return
      }

      // Fetch items and cashier names for all orders
      const orderIds = ordersData.map((o) => o.id)
      const cashierIds = [...new Set(ordersData.map((o) => o.cashier_id))]

      const [itemsResult, cashiersResult] = await Promise.all([
        supabase.from('order_items').select('*').in('order_id', orderIds),
        supabase.from('profiles').select('id, name').in('id', cashierIds),
      ])

      const itemsByOrder: Record<string, OrderItem[]> = {}
      for (const item of (itemsResult.data || []) as OrderItem[]) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
        itemsByOrder[item.order_id].push(item)
      }

      const cashierMap: Record<string, string> = {}
      for (const c of cashiersResult.data || []) {
        cashierMap[c.id] = c.name
      }

      const mapped: QueueOrder[] = (ordersData as Order[]).map((o) => ({
        ...o,
        items: itemsByOrder[o.id] || [],
        cashier_name: cashierMap[o.cashier_id] || 'Unknown',
      }))

      setOrders(mapped)
    } catch (err) {
      console.error('Failed to fetch queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  async function handleFulfill(orderId: string) {
    setFulfilling(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (err) {
      console.error('Failed to fulfill order:', err)
    } finally {
      setFulfilling(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading queue...</div>
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Order Queue</h1>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-gray-500">No pending orders.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold">{order.order_number}</div>
                  <div className="text-sm text-gray-500">
                    {timeAgo(order.created_at)} &middot; Cashier: {order.cashier_name}
                  </div>
                </div>
                <button
                  onClick={() => handleFulfill(order.id)}
                  disabled={fulfilling === order.id}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {fulfilling === order.id ? 'Fulfilling...' : 'Mark as Fulfilled'}
                </button>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="text-gray-700">
                    {item.quantity}x {item.product_name}
                  </li>
                ))}
              </ul>

              {order.notes && (
                <div className="mt-3 rounded bg-yellow-50 p-2 text-sm text-yellow-800">
                  Note: {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
