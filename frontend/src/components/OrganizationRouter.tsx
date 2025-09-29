import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const OrganizationRouter: React.FC = () => {
  const { organization } = useAuthStore();

  if (!organization) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/dashboard/${organization.slug}`} replace />;
};

export default OrganizationRouter;