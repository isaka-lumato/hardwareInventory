import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/database.types'

export function getHomeRoute(role: UserRole): string {
  switch (role) {
    case 'cashier':
      return '/cashier/new-order'
    case 'storekeeper':
      return '/storekeeper/queue'
    case 'admin':
      return '/admin/dashboard'
    default:
      return '/login'
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
}
