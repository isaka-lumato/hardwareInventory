'use client'

import { useState, useEffect, Fragment } from 'react'
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
    pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    fulfilled: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border border-red-500/20',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Sales History</h1>
        <button
          onClick={exportCSV}
          className="rounded-xl bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-emerald-950 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Data CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-4 bg-zinc-900/50 p-4 border border-zinc-800 rounded-2xl">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Time Period</label>
          <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value as typeof dateFilter); setPage(0) }} className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Cashier</label>
          <select value={cashierFilter} onChange={(e) => { setCashierFilter(e.target.value); setPage(0) }} className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
            <option value="">All Cashiers</option>
            {cashiers.filter((c) => c.role === 'cashier').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Order Status</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }} className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Payment Method</label>
          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(0) }} className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
            <option value="">All Payments</option>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="credit">Store Credit</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center px-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-600 mb-6 shadow-inner">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-zinc-300">No Orders Found</h3>
          <p className="mt-2 text-zinc-500 font-medium">Try adjusting your filters to find what you're looking for.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-zinc-900/50 shadow-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Order #</th>
                  <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Date</th>
                  <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Cashier</th>
                  <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs hidden sm:table-cell">Items</th>
                  <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs hidden md:table-cell">Subtotal</th>
                  <th className="px-6 py-4 text-right font-bold text-zinc-400 uppercase tracking-wider text-xs">Total</th>
                  <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs hidden sm:table-cell">Payment</th>
                  <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {orders.map((order) => (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => toggleExpand(order.id)}
                      className={`cursor-pointer transition-colors ${expandedId === order.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/40 group'}`}
                    >
                      <td className="px-6 py-4 font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedId === order.id ? (
                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-zinc-500 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          )}
                          {order.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-zinc-300 font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{new Date(order.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-300">{order.cashier_name}</td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
                        <span className="inline-block bg-zinc-800 text-zinc-300 font-bold px-2.5 py-1 rounded-lg">
                          {order.item_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-500 font-medium hidden md:table-cell">{formatCurrency(order.subtotal)}</td>
                      <td className="px-6 py-4 text-right font-black text-white">{formatCurrency(order.total)}</td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
                        <span className="inline-block px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                          {order.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-items`}>
                        <td colSpan={8} className="bg-zinc-950/80 p-0 border-b-2 border-zinc-800">
                          <div className="px-12 py-6">
                            <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Order Items Breakdown</div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-zinc-800 text-zinc-500">
                                  <th className="py-2 text-left font-medium">Product</th>
                                  <th className="py-2 text-center font-medium">Qty</th>
                                  <th className="py-2 text-right font-medium">Unit Price</th>
                                  <th className="py-2 text-right font-medium">Line Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/30">
                                {expandedItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                                    <td className="py-3 font-semibold text-zinc-200">{item.product_name}</td>
                                    <td className="py-3 text-center">
                                      <span className="inline-block bg-zinc-800 text-zinc-300 font-bold px-2 py-0.5 rounded-md text-xs">{item.quantity}</span>
                                    </td>
                                    <td className="py-3 text-right text-zinc-400">{formatCurrency(item.unit_selling_price)}</td>
                                    <td className="py-3 text-right font-bold text-zinc-200">{formatCurrency(item.line_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {order.notes && (
                              <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <span className="block text-[10px] font-black uppercase text-amber-500 mb-1 tracking-widest opacity-80">Order Notes</span>
                                <p className="text-sm font-medium text-amber-200/80">{order.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-sm gap-4">
            <span className="text-zinc-500 font-medium">
              Showing <span className="font-bold text-white">{page * PAGE_SIZE + 1}</span> to <span className="font-bold text-white">{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of <span className="font-bold text-white">{totalCount}</span> orders
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
