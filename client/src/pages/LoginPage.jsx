import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input, useToast } from '../components/ui';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import SEO from '../components/common/SEO';

export const LoginPage = () => {
  const { login, isLoading, error: authError, clearError } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/profile';

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearError();
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const res = await login(formData);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Welcome Back',
        message: 'You have logged in successfully.',
      });
      navigate(from, { replace: true });
    } else {
      addToast({
        type: 'error',
        title: 'Authentication Failed',
        message: res.error || 'Invalid email or password',
      });
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 sm:px-6 bg-[#FAF8F4] text-[#2E2622]">
      <SEO
        title="Sign In | Trade Portal"
        description="Access your Glassofy architectural hardware account, trade pricing, past GST invoices, and saved project specifications."
      />
      <div className="w-full max-w-md bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-10 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622] mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#2E2622] tracking-tight">Sign In</h2>
          <p className="text-xs uppercase tracking-[0.06em] text-[#7A726A] mt-2">
            Access trade discounts & commercial specifications
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-4 rounded-[2px] bg-[#FAF0EE] border border-[#E8C2BC] text-[#A4493D] text-xs">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="architect@domain.com"
            leftIcon={Mail}
            required
            error={errors.email}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A]">
                Password <span className="text-[#3A2F2B]">*</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#7A726A] hover:text-[#2E2622] underline underline-offset-2 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Your secure password"
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
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-[#7A726A] border-t border-[#DDD8CF] pt-6">
          Don&apos;t have an account yet?{' '}
          <Link to="/register" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A] font-medium">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
