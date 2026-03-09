'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getHomeRoute } from '@/lib/auth'
import { formatError } from '@/lib/errors'
import type { UserRole } from '@/lib/database.types'
import { Wrench } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Hardware Store'

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            router.replace(getHomeRoute(profile.role as UserRole))
            return
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
      }
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        setError('Could not load user profile. Contact your administrator.')
        setLoading(false)
        return
      }

      router.replace(getHomeRoute(profile.role as UserRole))
    } catch (err) {
      setError(formatError(err))
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-zinc-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-6 relative flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden group">
            <Image 
              src="/hms-logo.png" 
              alt="HMS Logo" 
              width={96} 
              height={96} 
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{storeName}</h1>
          <p className="mt-2 text-sm text-zinc-400 font-medium">Point of Sale & Management</p>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-xl p-8 shadow-2xl border border-zinc-800/50">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-500 border border-red-500/20 flex items-start gap-3">
                <Wrench className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-950/50 px-4 py-3.5 text-sm text-white shadow-sm placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-950/50 px-4 py-3.5 text-sm text-white shadow-sm placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-zinc-950 shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent"></span>
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

