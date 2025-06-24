import { useState, useEffect } from 'react';

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