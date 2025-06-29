import { useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'

interface AdminRouteProps {
  children: ReactNode
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const navigate = useNavigate()

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (authLoading || profileLoading) {
        console.log("AdminRoute: Loading timeout reached, redirecting to dashboard")
        navigate('/dashboard')
      }
    }, 5000)

    if (!authLoading && !profileLoading) {
      clearTimeout(timeoutId)
      if (!user) {
        navigate('/')
      } else if (profile && profile.role !== 'admin') {
        navigate('/dashboard')
      }
    }

    return () => clearTimeout(timeoutId)
  }, [user, profile, authLoading, profileLoading, navigate])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-roboto text-muted-foreground">Verifying access...</p>
          <p className="font-roboto text-xs text-muted-foreground/60">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  return <>{children}</>
}

export default AdminRoute