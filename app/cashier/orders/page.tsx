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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (data || []).map((row: any) => ({
          ...(row as Order),
          item_count: Array.isArray(row.order_items) && row.order_items.length > 0
            ? row.order_items[0].count
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
    pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    fulfilled: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border border-red-500/20',
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Order History</h1>
        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800 backdrop-blur-sm overflow-x-auto shrink-0">
          {(['today', 'week', 'month', 'all'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${dateFilter === f
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32 rounded-3xl border border-zinc-800 bg-zinc-900/20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center px-4">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-600 shadow-inner">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-zinc-300">No Orders Found</h3>
          <p className="mt-2 text-zinc-500 font-medium">You haven't processed any orders in this time period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-zinc-900/50 shadow-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Order #</th>
                <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Date & Time</th>
                <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Items</th>
                <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs">Total</th>
                <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Payment</th>
                <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/cashier/orders/${order.id}/print`)}
                  className="cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{order.order_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-zinc-300 font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{new Date(order.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block bg-zinc-800 text-zinc-300 font-bold px-2.5 py-1 rounded-lg">
                      {order.item_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-white">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      {order.payment_method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${statusColors[order.status] || ''}`}>
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
