'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/lib/database.types'

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [isAddMode, setIsAddMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Add user form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('cashier')

  // Edit form
  const [editRole, setEditRole] = useState<UserRole>('cashier')

  const supabase = createClient()

  async function fetchUsers() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setCurrentUserId(session.user.id)

      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers((data as Profile[]) || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  function openAdd() {
    setIsAddMode(true)
    setNewName('')
    setNewEmail('')
    setNewRole('cashier')
    setError('')
    setShowPanel(true)
  }

  function openEdit(user: Profile) {
    setIsAddMode(false)
    setSelectedUser(user)
    setEditRole(user.role)
    setError('')
    setShowPanel(true)
  }

  async function handleInvite() {
    if (!newEmail.trim()) { setError('Email is required'); return }
    setSaving(true)
    setError('')

    try {
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: newEmail.trim(),
        options: {
          data: { name: newName.trim() || newEmail.trim() },
        },
      })

      if (inviteError) throw inviteError

      setShowPanel(false)
      // Note: profile gets created by the trigger on auth.users INSERT
      // The role will need to be updated manually since invite creates as 'cashier'
      setTimeout(fetchUsers, 2000)
    } catch (err) {
      console.error('Invite error:', err)
      setError('Failed to invite user. Make sure OTP/magic link is enabled in Supabase.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateRole() {
    if (!selectedUser) return
    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editRole })
        .eq('id', selectedUser.id)

      if (error) throw error
      setShowPanel(false)
      fetchUsers()
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update role.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    if (!selectedUser) return
    if (selectedUser.id === currentUserId) {
      setError('You cannot deactivate your own account.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !selectedUser.is_active })
        .eq('id', selectedUser.id)

      if (error) throw error
      setShowPanel(false)
      fetchUsers()
    } catch (err) {
      console.error('Toggle error:', err)
      setError('Failed to update user status.')
    } finally {
      setSaving(false)
    }
  }

  const roleBadge: Record<string, string> = {
    cashier: 'bg-blue-100 text-blue-800',
    storekeeper: 'bg-orange-100 text-orange-800',
    admin: 'bg-purple-100 text-purple-800',
  }

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
        <button onClick={openAdd} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite User
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-zinc-900/50 shadow-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Name</th>
              <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs">Role</th>
              <th className="px-6 py-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 text-left font-bold text-zinc-400 uppercase tracking-wider text-xs hidden sm:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => openEdit(user)}
                className={`cursor-pointer transition-colors group ${user.is_active ? 'hover:bg-zinc-800/40' : 'opacity-50 hover:opacity-100 hover:bg-zinc-800/20'}`}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{user.name || 'Pending Invite'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    user.role === 'storekeeper' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-500 font-medium hidden sm:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity" onClick={() => setShowPanel(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-y-auto flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-black text-white tracking-tight">{isAddMode ? 'Invite New User' : 'Manage User Role'}</h2>
              <button onClick={() => setShowPanel(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex-1">
              {error && <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-500">{error}</div>}

              {isAddMode ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Full Name</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Email Address <span className="text-amber-500">*</span></label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" placeholder="john@example.com" />
                    <p className="mt-2 text-xs text-zinc-500">They will receive a magic link to sign in.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">System Role</label>
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
                      <option value="cashier">Cashier</option>
                      <option value="storekeeper">Storekeeper</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              ) : selectedUser && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{selectedUser.name}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Update Role</label>
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
                      <option value="cashier">Cashier</option>
                      <option value="storekeeper">Storekeeper</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky bottom-0 z-10">
              {isAddMode ? (
                <button onClick={handleInvite} disabled={saving} className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-amber-950 shadow-lg hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950 border-t-transparent"></span> Sending...</>
                  ) : (
                    'Send Invitation Link'
                  )}
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button onClick={handleUpdateRole} disabled={saving || editRole === selectedUser?.role} className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-amber-950 shadow-lg hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {saving ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950 border-t-transparent"></span> Updating...</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  {selectedUser && currentUserId !== selectedUser.id && (
                    <button onClick={handleToggleActive} disabled={saving} className={`w-full rounded-xl border px-4 py-3.5 text-sm font-bold transition-all ${selectedUser.is_active
                      ? 'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}>
                      {selectedUser.is_active ? 'Deactivate Account' : 'Reactivate Account'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
