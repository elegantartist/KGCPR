import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';

const PaymentSuccessPage = () => {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Extract session ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('session_id');
    setSessionId(id);
  }, []);

  const handleContinueToLogin = () => {
    // Clear any pending user data and redirect to login
    localStorage.removeItem('pendingUserId');
    setLocation('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Payment Successful!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Your subscription has been activated
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Welcome to KGC Health Assistant</h3>
            <p className="text-sm text-green-800">
              Your monthly subscription is now active. You can proceed to login and start tracking your health journey.
            </p>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>✓ Subscription activated successfully</p>
            <p>✓ Account ready for first login</p>
            <p>✓ All features now available</p>
          </div>

          <Button 
            onClick={handleContinueToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg"
          >
            Continue to Login
          </Button>

          {sessionId && (
            <div className="text-xs text-gray-400 pt-2 border-t">
              <p>Session ID: {sessionId.substring(0, 20)}...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;