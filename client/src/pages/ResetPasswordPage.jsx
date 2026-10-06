import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Button, Input, useToast } from '../components/ui';
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import SEO from '../components/common/SEO';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const validate = () => {
    const newErrors = {};
    if (!token.trim()) newErrors.token = 'Reset token is required';
    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsLoading(true);
      await api.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });

      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your password has been successfully reset. Please log in.',
      });
      navigate('/login');
    } catch (err) {
      const msg = err.message || 'Failed to reset password. The token may be expired or invalid.';
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: msg,
      });
      setErrors({ form: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 sm:px-6 bg-[#FAF8F4] text-[#2E2622]">
      <SEO
        title="Set New Password | Account Security"
        description="Update and configure a new secure password for your Glassofy account."
      />
      <div className="w-full max-w-md bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-10 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622] mx-auto mb-4">
            <KeyRound className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#2E2622] tracking-tight">Set New Password</h2>
          <p className="text-xs uppercase tracking-[0.06em] text-[#7A726A] mt-2">
            Configure a secure password with at least 6 characters
          </p>
        </div>

        {errors.form && (
          <div className="mb-6 p-3 rounded-[2px] bg-[#FAF0EE] border border-[#E8C2BC] text-[#A4493D] text-xs">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Reset Token"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
            leftIcon={KeyRound}
            required
            error={errors.token}
          />

          <Input
            label="New Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            leftIcon={Lock}
            required
            error={errors.password}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#7A726A] hover:text-[#2E2622] focus:outline-none"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            leftIcon={Lock}
            required
            error={errors.confirmPassword}
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Update Password
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-[#7A726A] border-t border-[#DDD8CF] pt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A] font-medium">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
