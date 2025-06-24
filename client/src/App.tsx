import { useState, useEffect } from 'react';

function AdminDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Keep Going Care Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">System Administrator: {user.email}</p>
            </div>
            <button 
              onClick={onLogout}
              className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-600">Loading dashboard...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-blue-800">{stats?.totalUsers || 0}</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Active Patients</h3>
                <p className="text-3xl font-bold text-green-800">{stats?.totalPatients || 0}</p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Active Doctors</h3>
                <p className="text-3xl font-bold text-purple-800">{stats?.totalDoctors || 0}</p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">System Status</h3>
                <p className="text-lg font-semibold text-green-600">✓ Operational</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">SMS Integration Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Twilio SMS Service Connected</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Verification Codes Enabled</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Admin Access Verified</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Manage Users
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                  View System Logs
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                  Generate Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  console.log('Patient dashboard for:', user.email);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{text: string, isUser: boolean, timestamp: string}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scores, setScores] = useState({ diet: 5, exercise: 5, medication: 5 });
  const [context, setContext] = useState<any>(null);
  const [showScoreInput, setShowScoreInput] = useState(false);

  useEffect(() => {
    fetchPatientContext();
  }, []);

  const fetchPatientContext = async () => {
    try {
      const response = await fetch('/api/patient/context');
      if (response.ok) {
        const data = await response.json();
        setContext(data.context);
      }
    } catch (error) {
      console.error('Failed to fetch context:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSubmitting) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    setIsSubmitting(true);

    // Add user message to chat
    const newUserMessage = {
      text: userMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      
      if (response.ok) {
        const aiMessage = {
          text: data.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage = {
        text: "I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitScores = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietScore: scores.diet,
          exerciseScore: scores.exercise,
          medicationScore: scores.medication
        })
      });

      if (response.ok) {
        setShowScoreInput(false);
        await fetchPatientContext(); // Refresh context after submitting scores
        
        // Add success message to chat
        const successMessage = {
          text: "Great! I've recorded your daily scores. Let me provide some personalized insights based on your progress.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, successMessage]);
      }
    } catch (error) {
      console.error('Failed to submit scores:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Header */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Keep Going Care</h1>
                <p className="text-gray-600">Your Personal Health Assistant</p>
              </div>
              <button 
                onClick={onLogout}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Health Scores Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Health Tracking</h2>
            
            {context && (
              <div className="mb-4 space-y-2">
                <div className="text-sm text-gray-600">
                  Recent Activity: {context.recentScores?.length || 0} scores in last 14 days
                </div>
                <div className="text-sm text-gray-600">
                  Achievements: {context.badges?.length || 0} badges earned
                </div>
                <div className="text-sm">
                  <span className="font-medium">Health Trends:</span>
                  <div className="ml-2 text-xs">
                    Diet: <span className={`${context.trends?.dietTrend === 'improving' ? 'text-green-600' : context.trends?.dietTrend === 'declining' ? 'text-red-600' : 'text-gray-600'}`}>
                      {context.trends?.dietTrend || 'stable'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!showScoreInput ? (
              <button
                onClick={() => setShowScoreInput(true)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Today's Scores
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diet Score: {scores.diet}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores.diet}
                    onChange={(e) => setScores(prev => ({ ...prev, diet: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercise Score: {scores.exercise}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores.exercise}
                    onChange={(e) => setScores(prev => ({ ...prev, exercise: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medication Score: {scores.medication}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores.medication}
                    onChange={(e) => setScores(prev => ({ ...prev, medication: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitScores}
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Scores'}
                  </button>
                  <button
                    onClick={() => setShowScoreInput(false)}
                    className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Health Assistant Chat */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Health Assistant</h2>
            
            <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p className="mb-2">👋 Hi! I'm your personalized health assistant.</p>
                  <p className="text-sm">Ask me about your health goals, progress, or any wellness questions!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isUser 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border text-gray-800'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your health progress, goals, or get personalized advice..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSubmitting || !chatMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? '...' : 'Send'}
              </button>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              💡 Try asking: "How am I doing with my health goals?" or "What should I focus on today?"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface User {
  id: number;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admin' | 'doctor' | 'patient'>('patient');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check existing session on load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log('No active session');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (response.ok) {
        setShowCodeInput(true);
        // In development, show the code
        if (data.code) {
          setCode(data.code);
        }
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setShowCodeInput(false);
        setEmail('');
        setCode('');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    if (user.role === 'admin') {
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    }
    
    if (user.role === 'patient') {
      return <PatientDashboard user={user} onLogout={handleLogout} />;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Keep Going Care</h1>
                <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Dashboard</h2>
              <p className="text-blue-800">Role: <span className="font-medium capitalize">{user.role}</span></p>
              <p className="text-blue-800 mt-1">User ID: {user.id}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Keep Going Care</h1>
            <p className="text-sm text-gray-500">Sign in to your account</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {(['Patient', 'Doctor', 'Admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setActiveTab(role.toLowerCase() as 'patient' | 'doctor' | 'admin')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === role.toLowerCase()
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!showCodeInput ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'admin' ? 'admin@keepgoingcare.com' : 'Enter your email'}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Code sent to {email}
                </p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCodeInput(false);
                  setCode('');
                  setError('');
                }}
                className="w-full mt-2 py-3 px-4 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Back to Email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;