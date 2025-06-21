import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

const RoleBasedRedirect = () => {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Redirect based on user role
            switch (data.user.role) {
              case 'doctor':
                setLocation('/doctor');
                break;
              case 'admin':
                setLocation('/admin');
                break;
              case 'patient':
              default:
                setLocation('/home');
                break;
            }
          } else {
            // Not authenticated, redirect to login
            setLocation('/login');
          }
        } else {
          // Not authenticated, redirect to login
          setLocation('/login');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setLocation('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkUserRole();
  }, [setLocation]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return null;
};

export default RoleBasedRedirect;