'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth'
import type { Profile } from '@/lib/database.types'
import { LogOut, User } from 'lucide-react'

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
    <nav className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-zinc-700">
            <Image src="/hms-logo.png" alt="HMS Logo" fill className="object-cover" />
          </div>
          <span className="text-xl font-black text-zinc-100 tracking-tight">{storeName}</span>
        </Link>

        {profile?.role === 'cashier' && cashierLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-semibold transition-all duration-200 relative ${pathname === link.href
                ? 'text-amber-500'
                : 'text-zinc-400 hover:text-zinc-100'
              }`}
          >
            {link.label}
            {pathname === link.href && (
              <span className="absolute -bottom-[21px] left-0 w-full h-[2px] bg-amber-500 rounded-t-full shadow-[0_-2px_8px_rgba(245,158,11,0.5)]" />
            )}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-6">
        {profile && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-zinc-100">{profile.name}</span>
              <span className="text-xs font-medium text-amber-500/80 capitalize tracking-wide">{profile.role}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 shadow-inner">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}

        <div className="w-px h-6 bg-zinc-800"></div>

        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  )
}

