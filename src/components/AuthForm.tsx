import React, { useState } from 'react';
import { signIn, signUp, UserRole } from '../lib/auth';
import { KeyRound, UserPlus } from 'lucide-react';

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('candidate');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = mode === 'signin'
        ? await signIn(formData.email, formData.password)
        : await signUp(formData.email, formData.password, role);

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('try again later')) {
          throw new Error('Too many signup attempts. Please wait a moment and try again.');
        }
        throw error;
      }
      
      if (user) onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-surface-100">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-primary-200 via-primary-100 to-surface-50 opacity-60" />
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230ea5e9' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '30px 30px'
      }} />

      <div className="relative max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-elevation-3 overflow-hidden">
          <div className="px-8 py-6 bg-primary-600">
            <div className="text-center">
              {mode === 'signin' ? (
                <KeyRound className="mx-auto h-12 w-12 text-white" />
              ) : (
                <UserPlus className="mx-auto h-12 w-12 text-white" />
              )}
              <h2 className="mt-4 text-3xl font-bold text-white">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="mt-2 text-sm text-primary-100">
                {mode === 'signin' 
                  ? 'Sign in to access your account' 
                  : 'Sign up to get started with your journey'}
              </p>
            </div>
          </div>

          <div className="px-8 py-6">
            {error && (
              <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 shadow-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-surface-700 mb-1">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="input"
                  placeholder="Enter your password"
                />
              </div>

              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-surface-700 mb-1">
                      Confirm password
                    </label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="input"
                      placeholder="Confirm your password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">I am a:</label>
                    <div className="mt-2 space-x-6">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value="candidate"
                          checked={role === 'candidate'}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="form-radio h-5 w-5 text-primary-600 focus:ring-primary-500 border-surface-300"
                        />
                        <span className="ml-2 text-surface-700">Candidate</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value="interviewer"
                          checked={role === 'interviewer'}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="form-radio h-5 w-5 text-primary-600 focus:ring-primary-500 border-surface-300"
                        />
                        <span className="ml-2 text-surface-700">Interviewer</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex justify-center py-3"
              >
                {isLoading ? 'Processing...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:underline transition-colors duration-200"
                >
                  {mode === 'signin'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}