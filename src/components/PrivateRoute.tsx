// ogonjo-web-app/src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const PrivateRoute: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;