import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavigationRibbon from "@/components/NavigationRibbon";
import ReAuthDialog from "@/components/ReAuthDialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiRequest";
import { Shield, Smartphone, Mail, LogOut, Lock, AlertTriangle, CheckCircle } from "lucide-react";

const AuthDemoPage = () => {
  const [showReAuthDialog, setShowReAuthDialog] = useState(false);
  const [reAuthAction, setReAuthAction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSecureAction = (action: string) => {
    setReAuthAction(action);
    setShowReAuthDialog(true);
  };

  const handleReAuthSuccess = () => {
    toast({
      title: "Action Authorized",
      description: `Successfully verified for: ${reAuthAction}`,
      duration: 3000,
    });
  };

  const handleEnhancedLogout = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/logout');
      
      toast({
        title: "Logout Successful",
        description: "Security notifications sent to your phone and email",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const authFeatures = [
    {
      title: "Enhanced Logout",
      description: "Logout with SMS and email notifications sent to your registered devices",
      icon: LogOut,
      color: "bg-red-500",
      action: () => handleEnhancedLogout(),
      disabled: isLoading
    },
    {
      title: "Change Password",
      description: "Requires SMS or email verification before allowing password changes",
      icon: Lock,
      color: "bg-blue-500",
      action: () => handleSecureAction("Change Password"),
      disabled: false
    },
    {
      title: "Update Profile",
      description: "Sensitive profile changes require re-authentication via SMS/email",
      icon: Shield,
      color: "bg-green-500",
      action: () => handleSecureAction("Update Sensitive Profile Information"),
      disabled: false
    },
    {
      title: "Access Medical Records",
      description: "View medical history requires additional verification",
      icon: AlertTriangle,
      color: "bg-orange-500",
      action: () => handleSecureAction("Access Medical Records"),
      disabled: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <NavigationRibbon showLogout={false} userType="patient" />
      
      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-4xl mx-auto border-blue-200/20 bg-[#fdfdfd]">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-[#2E8BC0] mb-4">
              Advanced Authentication System
            </CardTitle>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Demonstration of comprehensive SMS and email authentication flows for enhanced security
            </p>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Authentication Features Overview */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Implemented Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Smartphone className="w-3 h-3 mr-1" />
                      SMS
                    </Badge>
                    <span className="text-sm">Logout notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Badge>
                    <span className="text-sm">Security alerts & templates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Re-Auth
                    </Badge>
                    <span className="text-sm">Challenge/response system</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Alerts
                    </Badge>
                    <span className="text-sm">Failed login monitoring</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Security Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <div>• Enhanced logout with notifications</div>
                    <div>• Re-authentication for sensitive actions</div>
                    <div>• Login attempt monitoring</div>
                    <div>• Security alert system</div>
                    <div>• Doctor and patient support</div>
                    <div>• Email templates for all flows</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interactive Authentication Demos */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Interactive Authentication Demos
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {authFeatures.map((feature, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`${feature.color} p-3 rounded-lg text-white`}>
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-2">
                            {feature.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">
                            {feature.description}
                          </p>
                          <Button 
                            onClick={feature.action}
                            disabled={feature.disabled}
                            className="w-full"
                            variant={feature.title === "Enhanced Logout" ? "destructive" : "default"}
                          >
                            {feature.disabled && isLoading ? "Processing..." : `Try ${feature.title}`}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Technical Implementation Details */}
            <Card className="border-gray-200 bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Technical Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">SMS Service</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Twilio integration</li>
                      <li>• Verification codes</li>
                      <li>• Security alerts</li>
                      <li>• Login notifications</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Email Service</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• SendGrid integration</li>
                      <li>• HTML templates</li>
                      <li>• Challenge emails</li>
                      <li>• Security notifications</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">API Endpoints</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• /api/auth/logout</li>
                      <li>• /api/auth/challenge</li>
                      <li>• /api/auth/verify-challenge</li>
                      <li>• /api/auth/enhanced-login</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <ReAuthDialog
        isOpen={showReAuthDialog}
        onClose={() => setShowReAuthDialog(false)}
        onSuccess={handleReAuthSuccess}
        action={reAuthAction}
        title="Security Verification Required"
        description="This action requires additional authentication for your security."
      />
    </div>
  );
};

export default AuthDemoPage;