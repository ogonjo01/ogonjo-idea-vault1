// src/components/PrivateRoute.tsx
import { useEffect, ReactNode } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface PrivateRouteProps {
  children?: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // User is not logged in, redirect to the new /auth page
        toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
        navigate('/auth'); // Redirect to /auth instead of /
      }
    }
  }, [user, authLoading, navigate, toast]);

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

  if (user) {
    return children ? <>{children}</> : <Outlet />;
  }

  return null;
};

export default PrivateRoute;
