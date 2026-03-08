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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button onClick={openAdd} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add User
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Role</th>
              <th className="px-4 py-2 text-center font-medium text-gray-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} onClick={() => openEdit(user)} className="cursor-pointer hover:bg-blue-50">
                <td className="px-4 py-2 font-medium">{user.name}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[user.role] || ''}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowPanel(false)} />
          <div className="relative w-full max-w-md bg-white p-6 shadow-xl overflow-y-auto">
            <h2 className="mb-4 text-lg font-bold">{isAddMode ? 'Invite User' : 'Edit User'}</h2>

            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

            {isAddMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                    <option value="cashier">Cashier</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={handleInvite} disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            ) : selectedUser && (
              <div className="space-y-3">
                <div className="text-sm"><span className="font-medium">Name:</span> {selectedUser.name}</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                    <option value="cashier">Cashier</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdateRole} disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Update Role'}
                  </button>
                  <button onClick={handleToggleActive} disabled={saving} className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                    {selectedUser.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setShowPanel(false)} className="mt-4 rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
