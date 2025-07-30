// src/components/AdminRoute.tsx
import { useEffect, ReactNode } from 'react';
import { useNavigate, Outlet } from 'react-router-dom'; // Import Outlet if used for nested routes
import { useAuth } from '@/pages/Auth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/components/ui/use-toast'; // Import toast for user feedback

interface AdminRouteProps {
  children?: ReactNode; // Made optional to allow for Outlet pattern if desired in other parts
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    // Only proceed with access checks once authentication and profile data are fully loaded
    if (!authLoading && !profileLoading) {
      if (!user) {
        // Case 1: Not logged in
        toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
        navigate('/'); // Redirect to landing/login page
      } else if (!profile) {
        // Case 2: Logged in, but profile data failed to load or is null (should be rare, but good to handle)
        console.warn("AdminRoute: User is logged in but profile data is missing, redirecting.");
        toast({ title: "Access Denied", description: "Could not load user profile for access verification.", variant: "destructive" });
        navigate('/dashboard'); // Redirect to a safe page like dashboard
      } else if (profile.role !== 'admin') {
        // Case 3: Logged in, but not an admin
        toast({ title: "Access Denied", description: "You do not have administrative privileges.", variant: "destructive" });
        navigate('/dashboard'); // Redirect non-admins to dashboard
      }
      // Case 4: Logged in AND is admin - do nothing, component will proceed to render children
    }
  }, [user, profile, authLoading, profileLoading, navigate, toast]); // Add toast to dependencies

  // Show loading indicator while authentication/profile status is being determined
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-roboto text-muted-foreground">Verifying admin access...</p>
          <p className="font-roboto text-xs text-muted-foreground/60">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  // If user is authenticated AND is an admin, render the children or Outlet
  if (user && profile && profile.role === 'admin') {
    return children ? <>{children}</> : <Outlet />;
  }

  // If we reach here, it means access was denied and a redirect was initiated in useEffect,
  // or it will be initiated shortly. Returning null prevents flickering.
  return null;
};

export default AdminRoute;
