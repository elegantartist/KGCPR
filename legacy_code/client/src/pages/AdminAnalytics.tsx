import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NavigationRibbon from "@/components/NavigationRibbon";
import { BarChart, Users, Activity, TrendingUp, Clock, Award } from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalScoresSubmitted: number;
  totalBadgesEarned: number;
  activeSessionsToday: number;
  averageScoreToday: number;
}

interface DoctorStats {
  id: number;
  name: string;
  email: string;
  patientCount: number;
  setupComplete: boolean;
}

import { apiClient } from '@/lib/apiClient';

const AdminAnalytics = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');

  // Fetch system analytics with enhanced error handling
  const { data: systemStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/admin/analytics/system'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/analytics/system');
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry auth errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Fetch doctor statistics with enhanced error handling  
  const { data: doctorStats, isLoading: doctorStatsLoading } = useQuery({
    queryKey: ['/api/admin/doctors'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/doctors');
      return response;
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Handle authentication errors gracefully
  if (statsError && (statsError as any)?.status === 403) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need admin privileges to view analytics.</p>
          <p className="text-sm text-gray-500">Please log in with an admin account.</p>
        </div>
      </div>
    );
  }

  const stats = systemStats?.stats || systemStats?.data || {
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalScoresSubmitted: 0,
    totalBadgesEarned: 0,
    activeSessionsToday: 0,
    averageScoreToday: 0
  };

  const doctors = doctorStats?.doctors || doctorStats?.data || [];
  const activeDoctors = doctors.filter((d: any) => d.setupComplete).length;
  const pendingDoctors = doctors.filter((d: any) => !d.setupComplete).length;

  const analyticsCards = [
    {
      title: "Total System Users",
      value: stats.totalUsers.toString(),
      icon: Users,
      color: "bg-blue-500",
      description: "Registered users across all roles"
    },
    {
      title: "Healthcare Providers",
      value: `${activeDoctors}/${stats.totalDoctors}`,
      icon: Activity,
      color: "bg-green-500",
      description: "Active / Total doctors"
    },
    {
      title: "Patient Enrollments",
      value: stats.totalPatients.toString(),
      icon: TrendingUp,
      color: "bg-purple-500",
      description: "Patients under care"
    },
    {
      title: "Health Scores Today",
      value: stats.totalScoresSubmitted.toString(),
      icon: BarChart,
      color: "bg-orange-500",
      description: "Daily submissions recorded"
    },
    {
      title: "Achievement Badges",
      value: stats.totalBadgesEarned.toString(),
      icon: Award,
      color: "bg-yellow-500",
      description: "Total badges earned"
    },
    {
      title: "Active Sessions",
      value: stats.activeSessionsToday.toString(),
      icon: Clock,
      color: "bg-red-500",
      description: "Current day activity"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationRibbon showLogout={true} userType="admin" />
      
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
          <div className="flex gap-2">
            <Button 
              variant={selectedTimeframe === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('today')}
            >
              Today
            </Button>
            <Button 
              variant={selectedTimeframe === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('week')}
            >
              This Week
            </Button>
            <Button 
              variant={selectedTimeframe === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('month')}
            >
              This Month
            </Button>
          </div>
        </div>

        {/* Analytics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {analyticsCards.map((card, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? '...' : card.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {card.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${card.color} text-white`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Doctor Performance Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Healthcare Provider Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Provider</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Email</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Patients</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorStatsLoading && (
                    <tr>
                      <td className="p-4 align-middle text-center text-gray-500" colSpan={4}>
                        Loading provider data...
                      </td>
                    </tr>
                  )}
                  {!doctorStatsLoading && doctors.length === 0 && (
                    <tr>
                      <td className="p-4 align-middle text-center text-gray-500" colSpan={4}>
                        No healthcare providers found
                      </td>
                    </tr>
                  )}
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 align-middle font-medium">{doctor.name}</td>
                      <td className="p-4 align-middle text-gray-600">{doctor.email}</td>
                      <td className="p-4 align-middle">
                        <span className="text-lg font-semibold text-blue-600">
                          {doctor.patientCount || 0}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doctor.setupComplete 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doctor.setupComplete ? 'Active' : 'Pending Setup'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Health Summary */}
        <Card>
          <CardHeader>
            <CardTitle>System Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {activeDoctors}
                </div>
                <div className="text-sm text-gray-600">Active Providers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {pendingDoctors}
                </div>
                <div className="text-sm text-gray-600">Pending Setup</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {stats.totalPatients}
                </div>
                <div className="text-sm text-gray-600">Total Patients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {stats.averageScoreToday.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg Health Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;