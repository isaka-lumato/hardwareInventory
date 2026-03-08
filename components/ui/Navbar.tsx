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
  const pathname = usePathname()

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

  const cashierLinks = [
    { href: '/cashier/new-order', label: 'New Order' },
    { href: '/cashier/orders', label: 'My Orders' },
  ]

  return (
    <nav className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-bold text-gray-900">{storeName}</Link>
        {profile?.role === 'cashier' && cashierLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'text-blue-600 border-b-2 border-blue-600 pb-0.5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{profile.name}</div>
              <div className="text-xs text-gray-500 capitalize">{profile.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
