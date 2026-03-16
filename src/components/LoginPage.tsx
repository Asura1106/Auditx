import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { isAllowedEmail, getAllowedUser } from '../utils/access';
import collegeLogo from '../assets/college-logo.jpeg';
import collegeCampus from '../assets/college-campus.png';
import satelliteImage from '../assets/satellite.png';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  forcedError?: string;
}

export function LoginPage({ onLoginSuccess, forcedError }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forcedError) {
      setError(forcedError);
    }
  }, [forcedError]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isAllowedEmail(email)) {
        setError('This email is not authorized for access.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.session?.access_token) {
        const allowed = getAllowedUser(email);
        onLoginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: allowed?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
          accessToken: data.session.access_token,
          role: allowed?.role || 'staff',
          department: allowed?.department || 'CSE',
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <style>{`
        @keyframes loginFloat {
          0% { transform: translate3d(0, 0, 0) rotate(-8deg); }
          50% { transform: translate3d(0, -14px, 0) rotate(-5deg); }
          100% { transform: translate3d(0, 0, 0) rotate(-8deg); }
        }
      `}</style>
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {/* Logo/Title */}
          <div className="mb-8">
            <img
              src={collegeLogo}
              alt="College logo"
              className="h-12 mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Academic Audit System
            </h1>
            <p className="text-gray-600">
              Welcome back! Please login to your account.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Image/Illustration */}
      <div className="hidden lg:flex relative flex-1 bg-white items-stretch justify-stretch p-0 overflow-hidden">
        <img
          src={collegeCampus}
          alt="College campus"
          className="w-full h-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-sky-200/10" />
        <div
          className="pointer-events-none absolute right-[8%] top-[10%] h-44 w-44 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(96,165,250,0.30) 0%, rgba(168,85,247,0.18) 42%, rgba(255,255,255,0) 72%)',
            filter: 'blur(16px)',
          }}
        />
        <img
          src={satelliteImage}
          alt="Floating satellite"
          className="pointer-events-none absolute right-[7%] top-[8%] w-40 drop-shadow-2xl select-none"
          style={{
            animation: 'loginFloat 4.6s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
