import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Send, Bot, User, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiRequest";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import NavigationRibbon from "@/components/NavigationRibbon";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const ChatbotPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your KGC Health Assistant. I'm here to support you with your health journey and help you stick to your doctor's care plan. How can I help you today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const emergencyKeywords = [
    'emergency', 'urgent', 'help', 'crisis', 'suicide', 'harm', 'danger', 
    'hospital', 'ambulance', 'dying', 'overdose', 'chest pain', 'can\'t breathe'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (query: string) => 
      apiRequest('POST', '/api/chat/query', { query }),
    onSuccess: (data: any) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm here to help with your health questions.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Unable to get response. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Emergency protocol: If offline and emergency keywords detected
    if (!isOnline && emergencyKeywords.some(keyword => 
      inputMessage.toLowerCase().includes(keyword.toLowerCase())
    )) {
      setShowEmergencyModal(true);
      setInputMessage('');
      return;
    }

    // Normal chat flow
    if (isOnline) {
      chatMutation.mutate(inputMessage);
    } else {
      // Offline fallback response
      const offlineMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm currently offline and cannot provide AI assistance. For urgent health concerns, please contact your doctor or emergency services. When I'm back online, I'll be happy to help with your health questions.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, offlineMessage]);
    }
    
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100">
      <NavigationRibbon showLogout={false} userType="patient" />
      <div className="p-4">
        <div className="max-w-2xl mx-auto h-[calc(100vh-80px)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <img 
                src="/KGCLogo.jpg" 
                alt="KGC Lifestyle Prescription Logo" 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-800">KGC Health Assistant</h1>
                <div className="text-sm text-gray-500">Your caring health companion</div>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
                <span className="ml-2">Back</span>
              </Button>
            </Link>
          </div>

          {/* Chat Messages */}
          <Card className="flex-1 flex flex-col bg-white shadow-lg">
            <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? 'bg-purple-600' : 'bg-gray-200'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className={`px-4 py-2 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <span className={`text-xs ${
                          message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4 bg-gray-50">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your health question..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={chatMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Emergency Protocol Modal */}
      <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Emergency Protocol</h2>
            <p className="text-gray-600 mb-6">
              It looks like you mentioned an emergency keyword. For urgent medical situations, 
              please contact emergency services immediately or reach out to your doctor directly.
            </p>
            <div className="space-y-3">
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                <strong>Emergency:</strong> Call 911<br/>
                <strong>Doctor:</strong> Contact your assigned physician<br/>
                <strong>Crisis Line:</strong> 988 (Suicide & Crisis Lifeline)
              </div>
              <Button 
                onClick={() => setShowEmergencyModal(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                I Understand
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatbotPage;