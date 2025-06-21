import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiRequest";
import { Loader2, Shield, Smartphone, Mail } from "lucide-react";

interface ReAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: string;
  title?: string;
  description?: string;
}

const ReAuthDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  action,
  title = "Re-authentication Required",
  description = "For your security, please verify your identity to continue."
}: ReAuthDialogProps) => {
  const [step, setStep] = useState<'challenge' | 'verify'>('challenge');
  const [challengeType, setChallengeType] = useState<'sms' | 'email' | 'both'>('sms');
  const [challengeToken, setChallengeToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendChallenge = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/challenge', {
        action,
        challengeType
      });

      if (response.success) {
        setChallengeToken(response.challengeToken);
        setStep('verify');
        toast({
          title: "Verification Code Sent",
          description: response.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Challenge Failed",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/verify-challenge', {
        challengeToken,
        code: verificationCode
      });

      if (response.success) {
        toast({
          title: "Verification Successful",
          description: "Re-authentication completed successfully",
        });
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('challenge');
    setChallengeType('sms');
    setChallengeToken('');
    setVerificationCode('');
    setIsLoading(false);
    onClose();
  };

  const getChallengeIcon = () => {
    switch (challengeType) {
      case 'sms': return <Smartphone className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      case 'both': return <Shield className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {step === 'challenge' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Action:</strong> {action}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="challengeType">Verification Method</Label>
              <Select value={challengeType} onValueChange={(value: 'sms' | 'email' | 'both') => setChallengeType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select verification method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      SMS to your phone
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email to your inbox
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Both SMS and Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSendChallenge} 
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    {getChallengeIcon()}
                    <span className="ml-2">Send Code</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                Verification code sent via {challengeType}. Please check your {challengeType === 'sms' ? 'phone' : challengeType === 'email' ? 'email' : 'phone and email'}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationCode">6-Digit Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('challenge')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerifyCode} 
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReAuthDialog;