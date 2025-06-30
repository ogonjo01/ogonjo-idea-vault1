// src/components/PrivateRoute.tsx
import { useEffect, ReactNode } from 'react';
import { useNavigate, Outlet } from 'react-router-dom'; // Import Outlet for nested routes
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast'; // Import toast for user feedback

interface PrivateRouteProps {
  children?: ReactNode; // Optional, for direct component rendering if used as <PrivateRoute><MyComp/></PrivateRoute>
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    // Only proceed with checks once authentication status is settled
    if (!authLoading) {
      if (!user) {
        // User is not logged in, redirect to landing/login page
        toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
        navigate('/');
      }
      // If user is logged in, do nothing here; the component will render its children/Outlet
    }
  }, [user, authLoading, navigate, toast]); // Add toast to dependencies

  // Show a loading indicator while authentication status is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-roboto text-muted-foreground">Verifying login status...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and loading is complete, render children (for direct use) or Outlet (for nested routes)
  if (user) {
    return children ? <>{children}</> : <Outlet />;
  }

  // If user is not authenticated and not loading, we've already initiated a redirect.
  // Return null to prevent any flickering of unauthorized content.
  return null;
};

export default PrivateRoute;
