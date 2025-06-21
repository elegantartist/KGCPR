import React from 'react';
import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/HomePage";
import DailySelfScoresPage from "@/pages/DailySelfScoresPage";
import MotivationPage from "@/pages/MotivationPage";
import ProgressMilestonesPage from "@/pages/ProgressMilestonesPage";
import ChatbotPage from "@/pages/ChatbotPage";
import LoginPage from "@/pages/LoginPage";
import DoctorDashboard from "@/pages/DoctorDashboard";
import DoctorSetupPage from "@/pages/DoctorSetupPage";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PPRGenerationPage from "@/pages/PPRGenerationPage";
import EmailTestPage from "@/pages/EmailTestPage";
import AuthDemoPage from "@/pages/AuthDemoPage";

import AdminAnalytics from "@/pages/AdminAnalytics";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedRedirect from "@/components/RoleBasedRedirect";
import { AuthProvider } from "@/context/auth-context";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
  },
});

// Proactive Notification Provider
function ProactiveNotificationProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const ws = new WebSocket(`ws://localhost:${window.location.port}/ws`);
    
    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        if (notification.type === 'proactive_suggestion') {
          toast({
            title: notification.title,
            description: notification.message,
            duration: 8000,
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProactiveNotificationProvider>
            <Router>
              <RoleBasedRedirect />
              <Switch>
                {/* Public Routes */}
                <Route path="/login" component={LoginPage} />
                <Route path="/doctor-setup/:token" component={DoctorSetupPage} />

                <Route path="/payment-success" component={PaymentSuccessPage} />
                <Route path="/email-test" component={EmailTestPage} />
                <Route path="/auth-demo" component={AuthDemoPage} />

                {/* Protected Routes */}
                <Route path="/">
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/daily-scores">
                  <ProtectedRoute>
                    <DailySelfScoresPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/motivation">
                  <ProtectedRoute>
                    <MotivationPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/progress">
                  <ProtectedRoute>
                    <ProgressMilestonesPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/chat">
                  <ProtectedRoute>
                    <ChatbotPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/doctor">
                  <ProtectedRoute>
                    <DoctorDashboard />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/admin">
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/admin/analytics">
                  <ProtectedRoute>
                    <AdminAnalytics />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/ppr-generation">
                  <ProtectedRoute>
                    <PPRGenerationPage />
                  </ProtectedRoute>
                </Route>

                {/* 404 Route */}
                <Route>
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-8">Page not found</p>
                      <a href="/" className="text-blue-600 hover:text-blue-800">
                        Return to home
                      </a>
                    </div>
                  </div>
                </Route>
              </Switch>
              
              <Toaster />
            </Router>
          </ProactiveNotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;