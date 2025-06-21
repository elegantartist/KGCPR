import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavigationRibbon from "@/components/NavigationRibbon";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiRequest";
import { Send, Mail, Phone, User, CheckCircle, Clock } from "lucide-react";

const EmailTestPage = () => {
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const handleSendEmail = async (type: string, endpoint: string, description: string) => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      const response = await apiRequest('POST', endpoint, type === 'auth-doctor' || type === 'auth-patient' ? 
        { recipient: type === 'auth-doctor' ? 'doctor' : 'patient' } : {});
      
      toast({
        title: "Email Sent Successfully",
        description: `${description} sent successfully`,
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const testEmails = [
    {
      id: 'doctor-welcome',
      title: 'Doctor Welcome Email',
      recipient: 'Dr. Marijke Collins',
      email: 'marijke.collins@keepgoingcare.com',
      phone: '+61433509441',
      description: 'Onboarding email with orientation video (https://youtu.be/AitZI0VTYj8) and setup link',
      endpoint: '/api/test/send-doctor-welcome',
      color: 'bg-blue-500'
    },
    {
      id: 'patient-welcome',
      title: 'Patient Welcome Email',
      recipient: 'Tom Jones',
      email: 'tom.jones@keepgoingcare.com',
      phone: '+61433509441',
      description: 'Patient onboarding with introduction video (https://youtu.be/ET8aoaQjJn0) and activation link',
      endpoint: '/api/test/send-patient-welcome',
      color: 'bg-green-500'
    },
    {
      id: 'auth-doctor',
      title: 'Doctor Auth Notifications',
      recipient: 'Dr. Marijke Collins',
      email: 'marijke.collins@keepgoingcare.com',
      phone: '+61433509441',
      description: 'Logout notifications and re-authentication challenges via SMS and email',
      endpoint: '/api/test/auth-notifications',
      color: 'bg-purple-500'
    },
    {
      id: 'auth-patient',
      title: 'Patient Auth Notifications',
      recipient: 'Mr. Reuben Collins',
      email: 'reuben.collins@keepgoingcare.com',
      phone: '+61422135631',
      description: 'Logout notifications and re-authentication challenges via SMS and email',
      endpoint: '/api/test/auth-notifications',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <NavigationRibbon showLogout={false} userType="admin" />
      
      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-6xl mx-auto border-blue-200/20 bg-[#fdfdfd]">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-[#2E8BC0] mb-4">
              Email & SMS Testing Dashboard
            </CardTitle>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Test onboarding emails and authentication notifications for Dr Marijke Collins and Mr Reuben Collins
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Template Verification */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Template Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Updated
                    </Badge>
                    <span className="text-sm">Doctor welcome template matches specification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Updated
                    </Badge>
                    <span className="text-sm">Patient welcome template matches specification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Videos
                    </Badge>
                    <span className="text-sm">Doctor: youtu.be/AitZI0VTYj8</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Videos
                    </Badge>
                    <span className="text-sm">Patient: youtu.be/ET8aoaQjJn0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Email Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {testEmails.map((email) => (
                <Card key={email.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`${email.color} p-3 rounded-lg text-white`}>
                        <Send className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          {email.title}
                        </h4>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{email.recipient}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{email.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{email.phone}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          {email.description}
                        </p>
                        <Button 
                          onClick={() => handleSendEmail(email.id, email.endpoint, email.title)}
                          disabled={isLoading[email.id]}
                          className="w-full"
                          variant={email.id.includes('auth') ? "outline" : "default"}
                        >
                          {isLoading[email.id] ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send {email.id.includes('auth') ? 'Notifications' : 'Email'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Instructions */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Testing Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div><strong>1. Onboarding Emails:</strong> Test the exact templates with KGC logo and specified video links</div>
                  <div><strong>2. Authentication Tests:</strong> Send logout notifications and re-auth challenges to both recipients</div>
                  <div><strong>3. Verification:</strong> Check both email inboxes and SMS messages for all notifications</div>
                  <div><strong>4. Dashboard Access:</strong> Test login flows and re-authentication challenges</div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailTestPage;