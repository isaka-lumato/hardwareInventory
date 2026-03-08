'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import type { Order, OrderItem, Profile } from '@/lib/database.types'

interface SalesOrder extends Order {
  cashier_name: string
  item_count: number
  items?: OrderItem[]
}

const PAGE_SIZE = 20

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [cashiers, setCashiers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<OrderItem[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [cashierFilter, setCashierFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const supabase = createClient()

  useEffect(() => {
    async function loadCashiers() {
      const { data } = await supabase.from('profiles').select('*')
      setCashiers((data as Profile[]) || [])
    }
    loadCashiers()
  }, [])

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      try {
        let query = supabase
          .from('orders')
          .select('*, order_items(count)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (statusFilter) query = query.eq('status', statusFilter)
        if (cashierFilter) query = query.eq('cashier_id', cashierFilter)
        if (paymentFilter) query = query.eq('payment_method', paymentFilter)

        const now = new Date()
        if (dateFilter === 'today') {
          query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        } else if (dateFilter === 'week') {
          query = query.gte('created_at', new Date(now.getTime() - 7 * 86400000).toISOString())
        } else if (dateFilter === 'month') {
          query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
        }

        const { data, count, error } = await query
        if (error) throw error

        const cashierMap: Record<string, string> = {}
        for (const c of cashiers) cashierMap[c.id] = c.name

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: SalesOrder[] = (data || []).map((row: any) => ({
          ...(row as Order),
          cashier_name: cashierMap[row.cashier_id] || 'Unknown',
          item_count: Array.isArray(row.order_items) && row.order_items.length > 0
            ? row.order_items[0].count
            : 0,
        }))

        setOrders(mapped)
        setTotalCount(count || 0)
      } catch (err) {
        console.error('Failed to fetch sales:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [page, statusFilter, cashierFilter, paymentFilter, dateFilter, cashiers])

  async function toggleExpand(orderId: string) {
    if (expandedId === orderId) {
      setExpandedId(null)
      return
    }
    const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId)
    setExpandedItems((data as OrderItem[]) || [])
    setExpandedId(orderId)
  }

  function exportCSV() {
    const headers = ['Order Number', 'Date', 'Cashier', 'Items', 'Subtotal', 'Total', 'Payment', 'Status']
    const rows = orders.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleString(),
      o.cashier_name,
      o.item_count,
      (o.subtotal / 100).toFixed(2),
      (o.total / 100).toFixed(2),
      o.payment_method,
      o.status,
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <button
          onClick={exportCSV}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value as typeof dateFilter); setPage(0) }} className="rounded-md border px-3 py-2 text-sm">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <select value={cashierFilter} onChange={(e) => { setCashierFilter(e.target.value); setPage(0) }} className="rounded-md border px-3 py-2 text-sm">
          <option value="">All Cashiers</option>
          {cashiers.filter((c) => c.role === 'cashier').map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }} className="rounded-md border px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(0) }} className="rounded-md border px-3 py-2 text-sm">
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="credit">Credit</option>
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No orders found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Order #</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Cashier</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Items</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Subtotal</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Payment</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      onClick={() => toggleExpand(order.id)}
                      className="cursor-pointer hover:bg-blue-50"
                    >
                      <td className="px-3 py-2 font-medium">{order.order_number}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{order.cashier_name}</td>
                      <td className="px-3 py-2 text-center">{order.item_count}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(order.subtotal)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(order.total)}</td>
                      <td className="px-3 py-2 text-center capitalize">{order.payment_method.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-items`}>
                        <td colSpan={8} className="bg-gray-50 px-6 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="py-1 text-left">Product</th>
                                <th className="py-1 text-center">Qty</th>
                                <th className="py-1 text-right">Unit Price</th>
                                <th className="py-1 text-right">Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedItems.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1">{item.product_name}</td>
                                  <td className="py-1 text-center">{item.quantity}</td>
                                  <td className="py-1 text-right">{formatCurrency(item.unit_selling_price)}</td>
                                  <td className="py-1 text-right">{formatCurrency(item.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
