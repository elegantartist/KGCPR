import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isOnline = useOnlineStatus();

  return (
    <div className="min-h-screen relative">
      {children}
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-50 shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              You are currently offline. Some features may be limited.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}