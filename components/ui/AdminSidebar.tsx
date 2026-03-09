'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PackageSearch, Store, CircleDollarSign, Users, Settings } from 'lucide-react'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: PackageSearch },
  { href: '/admin/inventory', label: 'Inventory', icon: Store },
  { href: '/admin/sales', label: 'Sales', icon: CircleDollarSign },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 min-h-[calc(100vh-4rem)] relative">
      <nav className="flex flex-col gap-1.5 p-4 pt-6 relative z-10">
        <div className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Management
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${isActive
                  ? 'bg-amber-500/10 text-amber-500 shadow-sm ring-1 ring-amber-500/20'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:shadow-sm'
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-500' : 'text-zinc-500'}`} />
              {link.label}
            </Link>
          )
        })}
      </nav>
      {/* Decorative gradient bleed */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-zinc-900/50 to-transparent pointer-events-none" />
    </aside>
  )
}

