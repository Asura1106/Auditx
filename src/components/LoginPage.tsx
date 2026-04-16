import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { isAllowedEmail, getAllowedUser } from '../utils/access';
import collegeLogo from '../assets/college-logo.jpeg';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  forcedError?: string;
}

export function LoginPage({ onLoginSuccess, forcedError }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="relative min-h-screen flex">
      <style>{`
        @keyframes slideInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInRight {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes revealField {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .left-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a3e8a 100%);
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .moon {
          width: 120px;
          height: 120px;
          background: #ffd700;
          border-radius: 50%;
          position: absolute;
          top: 60px;
          right: 80px;
          box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
          animation: float 6s ease-in-out infinite;
        }

        .cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50px;
        }

        .cloud-1 {
          width: 120px;
          height: 50px;
          top: 30%;
          left: 5%;
          animation: float 8s ease-in-out infinite;
        }

        .cloud-2 {
          width: 100px;
          height: 40px;
          bottom: 25%;
          right: 10%;
          animation: float 8s ease-in-out infinite 2s;
        }

        .cloud-3 {
          width: 140px;
          height: 55px;
          bottom: 10%;
          left: 15%;
          animation: float 8s ease-in-out infinite 4s;
        }

        .hill-1 {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 300px;
          height: 200px;
          background: rgba(94, 60, 135, 0.6);
          border-radius: 50% 50% 0 0;
        }

        .hill-2 {
          position: absolute;
          bottom: 30px;
          right: -50px;
          width: 350px;
          height: 220px;
          background: rgba(102, 126, 234, 0.4);
          border-radius: 50% 50% 0 0;
        }

        .left-text {
          position: relative;
          z-10;
          text-align: center;
          color: white;
          margin-bottom: 80px;
        }

        .left-text h3 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .left-text p {
          font-size: 14px;
          opacity: 0.9;
        }

        .right-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #f8f9ff;
        }

        .form-container {
          width: 100%;
          max-width: 380px;
        }

        .greeting {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
          animation: slideInRight 500ms ease-out;
        }

        .greeting-desc {
          font-size: 14px;
          color: #666;
          margin-bottom: 30px;
          animation: slideInRight 500ms ease-out 100ms both;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
          display: block;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s;
          background: white;
        }

        .form-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .login-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 20px;
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .left-section {
            display: none;
          }
          
          .right-section {
            flex: 1;
          }
        }
      `}</style>

      {/* Left Section - Night Sky */}
      <div className="left-section">
        <div className="moon" />
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="hill-1" />
        <div className="hill-2" />
        
        <div className="left-text" style={{ animation: 'fadeInScale 600ms ease-out' }}>
          <h3>Good Morning</h3>
          <p>Login your account to get full user Experience</p>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="right-section">
        <div className="form-container" style={{ animation: 'slideInUp 600ms ease-out' }}>
          <h2 className="greeting">Hello!</h2>
          <p className="greeting-desc">Login your account</p>

          {/* Error Message */}
          {error && (
            <div 
              className="mb-4 p-3 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700 text-sm"
              style={{ animation: 'slideInUp 300ms ease-out' }}
            >
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} autoComplete="on">
            {/* Email/Username Field */}
            <div className="form-group" style={{ animation: 'slideInUp 500ms ease-out 100ms both' }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            {email.trim().length > 0 && (
              <div className="form-group" style={{ animation: 'revealField 240ms ease-out both' }}>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {email.trim().length > 0 && password.trim().length > 0 && (
              <button
                type="submit"
                disabled={loading}
                className="login-btn"
                style={{ animation: 'revealField 240ms ease-out both' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
