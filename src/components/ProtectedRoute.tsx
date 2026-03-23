import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setTimedOut(true), 10_000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !timedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
