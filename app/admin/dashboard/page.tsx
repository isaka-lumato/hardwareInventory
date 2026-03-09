'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/currency'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type DateFilter = 'today' | 'week' | 'month'

interface Metrics {
  revenue: number
  cost: number
  profit: number
  margin: number
  orderCount: number
  avgOrderValue: number
}

interface DailyRevenue {
  date: string
  revenue: number
}

interface TopProduct {
  product_name: string
  total_qty: number
  total_revenue: number
}

function getDateRange(filter: DateFilter): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  let start: string

  if (filter === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else if (filter === 'week') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  return { start, end }
}

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [metrics, setMetrics] = useState<Metrics>({ revenue: 0, cost: 0, profit: 0, margin: 0, orderCount: 0, avgOrderValue: 0 })
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [topByQty, setTopByQty] = useState<TopProduct[]>([])
  const [topByRevenue, setTopByRevenue] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      try {
        const { start, end } = getDateRange(dateFilter)

        // Fetch fulfilled orders in range
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total')
          .eq('status', 'fulfilled')
          .gte('created_at', start)
          .lt('created_at', end)

        const orderIds = (orders || []).map((o) => o.id)
        const revenue = (orders || []).reduce((sum, o) => sum + o.total, 0)

        let cost = 0
        const productQtyMap: Record<string, { name: string; qty: number; revenue: number }> = {}

        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds)

          for (const item of items || []) {
            cost += item.unit_cost_price * item.quantity
            const key = item.product_name
            if (!productQtyMap[key]) productQtyMap[key] = { name: key, qty: 0, revenue: 0 }
            productQtyMap[key].qty += Number(item.quantity)
            productQtyMap[key].revenue += item.line_total
          }
        }

        const profit = revenue - cost
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0
        const orderCount = orderIds.length
        const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0

        setMetrics({ revenue, cost, profit, margin, orderCount, avgOrderValue })

        const sorted = Object.values(productQtyMap)
        setTopByQty([...sorted].sort((a, b) => b.qty - a.qty).slice(0, 10).map((p) => ({
          product_name: p.name, total_qty: p.qty, total_revenue: p.revenue,
        })))
        setTopByRevenue([...sorted].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((p) => ({
          product_name: p.name, total_qty: p.qty, total_revenue: p.revenue,
        })))

        // Daily revenue for last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('total, created_at')
          .eq('status', 'fulfilled')
          .gte('created_at', thirtyDaysAgo)

        const dailyMap: Record<string, number> = {}
        for (const o of recentOrders || []) {
          const day = new Date(o.created_at).toISOString().split('T')[0]
          dailyMap[day] = (dailyMap[day] || 0) + o.total
        }

        const days: DailyRevenue[] = []
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const key = d.toISOString().split('T')[0]
          days.push({ date: key.slice(5), revenue: dailyMap[key] || 0 })
        }
        setDailyRevenue(days)
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [dateFilter])

  const cards = [
    { label: 'Total Revenue', value: formatCurrency(metrics.revenue) },
    { label: 'Total Cost', value: formatCurrency(metrics.cost) },
    { label: 'Gross Profit', value: formatCurrency(metrics.profit) },
    { label: 'Profit Margin', value: metrics.margin.toFixed(1) + '%' },
    { label: 'Orders', value: metrics.orderCount.toString() },
    { label: 'Avg Order Value', value: formatCurrency(Math.round(metrics.avgOrderValue)) },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white tracking-tight">Dashboard</h1>
        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800 backdrop-blur-sm">
          {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${dateFilter === f
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900/50 border border-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-zinc-800/30 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500" />
                <div className="text-sm font-bold tracking-widest text-zinc-500 uppercase">{card.label}</div>
                <div className="mt-2 text-3xl font-black text-white">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-6 text-lg font-bold text-white">Daily Revenue (Last 30 Days)</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="#71717a" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="#71717a" tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    cursor={{ fill: '#27272a' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="mb-6 text-lg font-bold text-white">Top Products by Quantity</h2>
              {topByQty.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">No data available for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="pb-3 text-left font-semibold text-zinc-400">Product</th>
                        <th className="pb-3 text-right font-semibold text-zinc-400">Qty Sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {topByQty.map((p, i) => (
                        <tr key={i} className="group hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 font-medium text-zinc-200">{p.product_name}</td>
                          <td className="py-3 text-right font-bold text-amber-500">{p.total_qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="mb-6 text-lg font-bold text-white">Top Products by Revenue</h2>
              {topByRevenue.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">No data available for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="pb-3 text-left font-semibold text-zinc-400">Product</th>
                        <th className="pb-3 text-right font-semibold text-zinc-400">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {topByRevenue.map((p, i) => (
                        <tr key={i} className="group hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 font-medium text-zinc-200">{p.product_name}</td>
                          <td className="py-3 text-right font-bold text-emerald-400">{formatCurrency(p.total_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
