'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/sales', label: 'Sales' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r bg-gray-50">
      <nav className="flex flex-col gap-1 p-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              pathname === link.href
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
