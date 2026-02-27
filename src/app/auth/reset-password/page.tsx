'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const t = searchParams.get('access_token') || searchParams.get('token') || ''
    if (t) setToken(t)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!token) {
      setError('Missing or invalid token')
      return
    }
    try {
      setSubmitting(true)
      const resp = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, new_password: newPassword })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Failed to reset password')
      setMessage('Password has been reset. You can now sign in.')
      setTimeout(() => router.push('/auth/login'), 1500)
    } catch (e: any) {
      setError(e.message || 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4">Reset Password</h1>
        {message && <div className="mb-3 p-2 bg-green-50 text-green-700 border border-green-200 rounded">{message}</div>}
        {error && <div className="mb-3 p-2 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" placeholder="New password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={submitting} className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}


