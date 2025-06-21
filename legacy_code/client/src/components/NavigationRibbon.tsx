import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, LogOut, Play, Settings, Home, MessageCircle, BarChart, Camera, Trophy, User, Stethoscope } from 'lucide-react';

interface NavigationRibbonProps {
  showLogout?: boolean;
  userType?: 'patient' | 'doctor' | 'admin';
  onOrientationVideo?: () => void;
}

const NavigationRibbon = ({ showLogout = false, userType = 'patient', onOrientationVideo }: NavigationRibbonProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Logout response:', { status: response.status, ok: response.ok, data });

      if (response.ok && data.success) {
        toast({
          title: "Logged out successfully",
          description: "You have been safely logged out of KGCPR.",
        });
        // Force navigation to login page
        window.location.href = '/login';
      } else {
        console.error('Logout failed:', data);
        toast({
          title: "Logout failed",
          description: data.message || "There was an issue logging you out. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Connection error",
        description: "Unable to connect to the server. Please check your connection.",
        variant: "destructive"
      });
    }
  };

  const handleOrientationVideo = () => {
    console.log('handleOrientationVideo called, onOrientationVideo:', onOrientationVideo);
    if (onOrientationVideo) {
      console.log('Calling onOrientationVideo callback');
      onOrientationVideo();
    } else {
      console.log('No callback provided, opening in new tab');
      window.open('https://youtu.be/ET8aoaQjJn0', '_blank');
    }
  };

  const getMenuItems = () => {
    switch (userType) {
      case 'patient':
        return [
          { icon: Home, label: 'Dashboard', href: '/' },
          { icon: BarChart, label: 'Daily Self-Scores', href: '/scores' },
          { icon: Camera, label: 'Motivation', href: '/motivation' },
          { icon: Trophy, label: 'Progress Milestones', href: '/progress' },
          { icon: MessageCircle, label: 'Chat', href: '/chat' },
        ];
      case 'doctor':
        return [
          { icon: Stethoscope, label: 'Doctor Dashboard', href: '/doctor' },
          { icon: User, label: 'Patients', href: '/doctor/patients' },
          { icon: BarChart, label: 'Reports', href: '/doctor/reports' },
          { icon: Settings, label: 'Settings', href: '/doctor/settings' },
        ];
      case 'admin':
        return [
          { icon: Settings, label: 'Admin Dashboard', href: '/admin' },
          { icon: User, label: 'Manage Doctors', href: '/admin/doctors' },
          { icon: BarChart, label: 'Analytics', href: '/admin/analytics' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white shadow-sm border-b relative">
      {/* Left: Three dots with Orientation link inside */}
      <div className="flex items-center relative">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          title="KGC Orientation"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        <span className="text-xs text-gray-500 ml-2 font-medium">KGC<br/>Orientation</span>
      </div>

      {/* Center: Larger KGC Logo */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col items-center">
          <div className="relative">
            <img 
              src="/kgc-logo.jpg" 
              alt="KGC Logo" 
              className="w-20 h-20 rounded-full object-cover border-3 border-blue-300 shadow-lg"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100/20 to-transparent"></div>
          </div>
          <div className="text-sm text-blue-600 mt-1 font-semibold">KGC</div>
        </div>
      </div>

      {/* Right: Menu */}
      <div className="flex items-center">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          title="Menu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        <span className="text-xs text-gray-500 ml-2 font-medium">Menu</span>
      </div>
        
      {/* Slide-out Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-16 right-0 bg-white rounded-lg shadow-xl z-50 w-64 border">
            <div className="p-4 border-b bg-gray-50 rounded-t-lg">
              <h3 className="font-medium text-gray-800">Navigation Menu</h3>
              <p className="text-xs text-gray-500 mt-1">KGC Health Platform</p>
            </div>
            <div className="p-2">
              {/* Orientation Video Link */}
              <button 
                onClick={() => {
                  handleOrientationVideo();
                  setShowMenu(false);
                }}
                className="flex items-center space-x-3 w-full p-3 text-left hover:bg-blue-50 rounded-md transition-colors border-b border-gray-100 mb-2"
              >
                <Play className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">KGC Orientation Video</span>
              </button>
              
              {/* Navigation Items */}
              {getMenuItems().map((item, index) => (
                <Link key={index} href={item.href}>
                  <button 
                    className="flex items-center space-x-3 w-full p-3 text-left hover:bg-gray-100 rounded-md transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <item.icon className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </button>
                </Link>
              ))}
              
              {/* Logout Button - Moved Down */}
              {showLogout && (
                <div className="mt-4 pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      handleLogout();
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-3 w-full p-3 text-left hover:bg-red-50 rounded-md transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NavigationRibbon;