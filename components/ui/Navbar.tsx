'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth'
import type { Profile } from '@/lib/database.types'

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Hardware Store'

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (data) setProfile(data as Profile)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      }
    }
    loadProfile()
  }, [])

  const pathname = usePathname()

  const cashierLinks = [
    { href: '/cashier/new-order', label: 'New Order' },
    { href: '/cashier/orders', label: 'My Orders' },
  ]

  return (
    <nav className="flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="font-bold text-gray-900">{storeName}</div>
        {profile?.role === 'cashier' && cashierLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium ${
              pathname === link.href ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {profile && (
          <span className="text-sm text-gray-600">
            {profile.name} ({profile.role})
          </span>
        )}
        <button
          onClick={signOut}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
