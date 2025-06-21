import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiRequest";
import { useToast } from "@/hooks/use-toast";

interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const DoctorSetupPage = () => {
  const [, setLocation] = useLocation();
  const [setupToken, setSetupToken] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(1);

  const { toast } = useToast();

  const steps: SetupStep[] = [
    {
      id: 1,
      title: "Verify Your Identity",
      description: "We'll send a verification code to your registered phone number",
      completed: currentStep > 1
    },
    {
      id: 2,
      title: "Enter Verification Code",
      description: "Enter the 6-digit code sent to your phone",
      completed: currentStep > 2
    },
    {
      id: 3,
      title: "Complete Setup",
      description: "Finalize your account and access the platform",
      completed: false
    }
  ];

  // Extract token from URL and check authentication
  useEffect(() => {
    const path = window.location.pathname;
    const tokenMatch = path.match(/\/doctor-setup\/(.+)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      setSetupToken(token);
      
      // Store token in localStorage for after login
      localStorage.setItem('pendingSetupToken', token);
      
      // Check if user is authenticated
      fetch('/api/auth/me', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
          if (!data.success) {
            // Not authenticated, redirect to login with setup context
            toast({
              title: "Authentication Required",
              description: "Please log in first to complete your doctor setup.",
            });
            setLocation('/login?setup=doctor&token=' + token);
          }
          // If authenticated, continue with setup process
        })
        .catch(() => {
          // Authentication check failed, redirect to login
          setLocation('/login?setup=doctor&token=' + token);
        });
    } else {
      toast({
        title: "Invalid Setup Link",
        description: "This setup link is invalid or expired.",
        variant: "destructive"
      });
    }
  }, [toast, setLocation]);

  const sendSmsMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest<{ success: boolean; message: string }>('POST', '/api/doctor/setup/send-sms', { token });
      return response;
    },
    onSuccess: () => {
      setCurrentStep(2);
      toast({
        title: "Verification Code Sent",
        description: "Please check your phone for the 6-digit verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send verification code",
        variant: "destructive"
      });
    }
  });

  const verifySetupMutation = useMutation({
    mutationFn: async ({ token, code }: { token: string; code: string }) => {
      const response = await apiRequest<{ 
        success: boolean; 
        message: string; 
        doctor: any 
      }>('POST', '/api/doctor/setup/verify', { token, code });
      return response;
    },
    onSuccess: (data) => {
      setCurrentStep(3);
      toast({
        title: "Setup Complete!",
        description: `Welcome to KGC Platform, ${data.doctor.name}!`,
      });
      
      // Redirect to doctor dashboard after a brief delay
      setTimeout(() => {
        setLocation('/doctor-dashboard');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive"
      });
    }
  });

  const handleSendSms = () => {
    if (!setupToken) {
      toast({
        title: "Setup Error",
        description: "Invalid setup token. Please use the link from your email.",
        variant: "destructive"
      });
      return;
    }
    sendSmsMutation.mutate(setupToken);
  };

  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }
    verifySetupMutation.mutate({ token: setupToken, code: verificationCode });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/KGCLogo.jpg" 
            alt="KGC Logo" 
            className="w-16 h-16 mx-auto rounded-full object-cover mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Doctor Account Setup</h1>
          <p className="text-gray-600">Complete your KGC platform registration</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : currentStep === step.id
                    ? 'border-green-500 bg-white text-green-500'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-20 mx-2 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-gray-800">{steps[currentStep - 1]?.title}</h3>
            <p className="text-sm text-gray-600">{steps[currentStep - 1]?.description}</p>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold text-gray-800">
              <Shield className="w-6 h-6 mr-2 text-green-600" />
              Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <MessageSquare className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="text-gray-700">
                    To secure your account, we'll send a verification code to your registered phone number.
                  </p>
                </div>
                
                <Button
                  onClick={handleSendSms}
                  disabled={sendSmsMutation.isPending || !setupToken}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                >
                  {sendSmsMutation.isPending ? (
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Code...
                    </div>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-blue-800 font-medium">
                    Verification code sent! Check your phone for a 6-digit code.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700 mb-2 block">
                    Enter 6-Digit Verification Code
                  </Label>
                  <input
                    id="code"
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 tracking-widest"
                    disabled={verifySetupMutation.isPending}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={handleSendSms}
                    variant="outline"
                    disabled={sendSmsMutation.isPending}
                    className="flex-1"
                  >
                    Resend Code
                  </Button>
                  
                  <Button
                    onClick={handleVerifyCode}
                    disabled={verifySetupMutation.isPending || verificationCode.length !== 6}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {verifySetupMutation.isPending ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      "Complete Setup"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 p-6 rounded-lg">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold text-green-800 mb-2">Setup Complete!</h3>
                  <p className="text-green-700">
                    Your account has been successfully activated. You'll be redirected to your dashboard shortly.
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to dashboard...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Need help? Contact support at support@keepgoing.care</p>
        </div>
      </div>
    </div>
  );
};

export default DoctorSetupPage;