import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neural-900 via-primary-900 to-purple-900">
      <div className="text-center">
        <h1 className="text-6xl font-display font-bold text-white mb-4">404</h1>
        <p className="text-xl text-neutral-200 mb-8">Page not found in the empire</p>
        <Link to="/" className="btn-primary">
          Return to Empire
        </Link>
      </div>
    </div>
  );
};

export default NotFound;