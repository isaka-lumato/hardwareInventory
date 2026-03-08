'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import type { Order } from '@/lib/database.types'

type DateFilter = 'today' | 'week' | 'month' | 'all'

interface OrderWithItemCount extends Order {
  item_count: number
}

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItemCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const router = useRouter()

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        let query = supabase
          .from('orders')
          .select('*, order_items(count)')
          .eq('cashier_id', session.user.id)
          .order('created_at', { ascending: false })

        const now = new Date()
        if (dateFilter === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
          query = query.gte('created_at', start)
        } else if (dateFilter === 'week') {
          const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          query = query.gte('created_at', start)
        } else if (dateFilter === 'month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          query = query.gte('created_at', start)
        }

        const { data, error } = await query

        if (error) {
          console.error('Failed to fetch orders:', error)
          return
        }

        const mapped = (data || []).map((row: Record<string, unknown>) => ({
          ...(row as Order),
          item_count: Array.isArray(row.order_items) && row.order_items.length > 0
            ? (row.order_items[0] as { count: number }).count
            : 0,
        }))

        setOrders(mapped)
      } catch (err) {
        console.error('Failed to fetch orders:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [dateFilter])

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <div className="flex gap-1">
          {(['today', 'week', 'month', 'all'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`rounded-md px-3 py-1 text-sm ${
                dateFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No orders yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Order #</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Date/Time</th>
                <th className="px-4 py-2 text-center font-medium text-gray-700">Items</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Total</th>
                <th className="px-4 py-2 text-center font-medium text-gray-700">Payment</th>
                <th className="px-4 py-2 text-center font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/cashier/orders/${order.id}/print`)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-4 py-2 font-medium">{order.order_number}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center">{order.item_count}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-2 text-center capitalize">
                    {order.payment_method.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] || ''}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
