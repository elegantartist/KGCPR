import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mail, Smartphone, Shield, CheckCircle, ArrowRight } from 'lucide-react';


interface LoginStep {
  email: string;
  verificationCode: string;
  userType: 'patient' | 'doctor' | 'admin' | null;
  loginToken: string;
}

const LoginPage = () => {
  const [step, setStep] = useState<'email' | 'verification'>('email');
  const [loginData, setLoginData] = useState<LoginStep>({
    email: '',
    verificationCode: '',
    userType: null,
    loginToken: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logoAnimating, setLogoAnimating] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for setup parameters from URL
  const [setupContext, setSetupContext] = useState<{
    isSetup: boolean;
    setupType: string | null;
    setupToken: string | null;
  }>({
    isSetup: false,
    setupType: null,
    setupToken: null
  });

  // Stop logo animation after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimating(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check URL parameters for setup context
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const setup = urlParams.get('setup');
    const token = urlParams.get('token');
    
    if (setup && token) {
      setSetupContext({
        isSetup: true,
        setupType: setup,
        setupToken: token
      });
      
      toast({
        title: "Complete Your Setup",
        description: `Please log in to continue your ${setup} account setup.`,
        duration: 5000
      });
    }
  }, [toast]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your registered email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/request-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: loginData.email })
      });

      const data = await response.json();

      if (data.success) {
        setLoginData(prev => ({
          ...prev,
          userType: data.userType,
          loginToken: data.loginToken
        }));
        setStep('verification');
        
        toast({
          title: "Verification Code Sent",
          description: `A 6-digit code has been sent to your phone via SMS`,
          duration: 5000
        });
      } else {
        toast({
          title: "Email Not Found",
          description: data.message || "This email is not registered in our system",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.verificationCode || loginData.verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          loginToken: loginData.loginToken,
          verificationCode: loginData.verificationCode
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Login Successful",
          description: `Welcome to Keep Going Care!`,
          duration: 3000
        });

        // Handle setup flow redirection
        if (setupContext.isSetup && setupContext.setupToken) {
          // Redirect back to setup page with token
          if (setupContext.setupType === 'doctor') {
            setLocation(`/doctor-setup/${setupContext.setupToken}`);
          } else {
            setLocation('/');
          }
        } else {
          // Check for stored redirect path from ProtectedRoute
          const redirectPath = sessionStorage.getItem('redirectAfterLogin');
          if (redirectPath) {
            sessionStorage.removeItem('redirectAfterLogin');
            setLocation(redirectPath);
          } else {
            // Normal login redirection based on user type
            switch (loginData.userType) {
              case 'patient':
                setLocation('/');
                break;
              case 'doctor':
                setLocation('/doctor');
                break;
              case 'admin':
                setLocation('/admin');
                break;
              default:
                setLocation('/');
            }
          }
        }
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "The verification code is incorrect or expired",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Unable to verify the code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/request-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: loginData.email })
      });

      const data = await response.json();

      if (data.success) {
        setLoginData(prev => ({
          ...prev,
          loginToken: data.loginToken
        }));
        
        toast({
          title: "Code Resent",
          description: "A new verification code has been sent to your phone",
          duration: 3000
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Resend",
        description: "Unable to resend verification code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <style>{`
        @keyframes kgcJiggle {
          0%, 100% { 
            transform: rotate(0deg) scale(1);
          }
          10% { 
            transform: rotate(-3deg) scale(1.1);
          }
          20% { 
            transform: rotate(3deg) scale(1.05);
          }
          30% { 
            transform: rotate(-2deg) scale(1.1);
          }
          40% { 
            transform: rotate(2deg) scale(1.05);
          }
          50% { 
            transform: rotate(-1deg) scale(1.08);
          }
          60% { 
            transform: rotate(1deg) scale(1.03);
          }
          70% { 
            transform: rotate(-0.5deg) scale(1.05);
          }
          80% { 
            transform: rotate(0.5deg) scale(1.02);
          }
          90% { 
            transform: rotate(0deg) scale(1);
          }
        }
        
        .kgc-logo-animating {
          animation: kgcJiggle 0.6s ease-in-out infinite;
        }
        
        .kgc-logo-stopped {
          animation: none !important;
          transform: rotate(0deg) scale(1) !important;
        }
      `}</style>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/kgc-logo.jpg" 
                alt="Keep Going Care Logo" 
                className={`w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-xl ${logoAnimating ? 'kgc-logo-animating' : 'kgc-logo-stopped'}`}
                style={{
                  objectPosition: 'center center',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  // Fallback to gradient logo if image fails to load
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = `w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-4 border-blue-200 shadow-xl flex items-center justify-center ${logoAnimating ? 'kgc-logo-animating' : 'kgc-logo-stopped'}`;
                    fallback.innerHTML = '<div class="text-white font-bold text-2xl">KGC</div>';
                    
                    if (target.parentNode) {
                      target.parentNode.appendChild(fallback);
                    }
                  }
                }}
              />
            </div>
            <h1 className="text-3xl font-bold text-[#2E8BC0] mb-2">
              Welcome to Keep Going Care
            </h1>
            <p className="text-gray-600">
              Your secure health companion platform
            </p>
          </div>

          {/* Security Features Display */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
              <Shield className="w-6 h-6 mx-auto text-blue-600 mb-1" />
              <div className="text-xs text-gray-600">Passwordless</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-100 shadow-sm">
              <Smartphone className="w-6 h-6 mx-auto text-green-600 mb-1" />
              <div className="text-xs text-gray-600">SMS Verified</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
              <CheckCircle className="w-6 h-6 mx-auto text-purple-600 mb-1" />
              <div className="text-xs text-gray-600">Secure Access</div>
            </div>
          </div>

          {/* Login Form */}
          <Card className="border-blue-200 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl text-gray-800 flex items-center justify-center gap-2">
                {step === 'email' && (
                  <>
                    <Mail className="w-5 h-5 text-blue-600" />
                    Enter Your Email
                  </>
                )}
                {step === 'verification' && (
                  <>
                    <Smartphone className="w-5 h-5 text-green-600" />
                    Verify SMS Code
                  </>
                )}
              </CardTitle>
              {step === 'verification' && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 mx-auto">
                  Code sent to your registered phone
                </Badge>
              )}
            </CardHeader>
            
            <CardContent>
              {step === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter your registered email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="text-center text-lg py-3"
                      disabled={isLoading}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Use the email address registered by your doctor or admin
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-[#2E8BC0] hover:bg-[#1E6B90] text-white py-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Sending Code..."
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {step === 'verification' && (
                <form onSubmit={handleVerificationSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={loginData.verificationCode}
                      onChange={(e) => setLoginData(prev => ({ 
                        ...prev, 
                        verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6)
                      }))}
                      className="text-center text-2xl font-mono tracking-widest py-4"
                      disabled={isLoading}
                      maxLength={6}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Check your phone for the 6-digit verification code
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                    disabled={isLoading || loginData.verificationCode.length !== 6}
                  >
                    {isLoading ? (
                      "Verifying..."
                    ) : (
                      <>
                        Login Securely
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendCode}
                      disabled={isLoading}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Resend Code
                    </Button>
                    <div className="text-xs text-gray-500">
                      Didn't receive the code? Check your phone or try resending
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800 text-center">
              <Shield className="w-4 h-4 inline mr-2" />
              Your session will automatically timeout after 5 minutes of inactivity for security
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;