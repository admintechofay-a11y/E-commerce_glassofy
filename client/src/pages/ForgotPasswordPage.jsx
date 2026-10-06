import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Button, Input, useToast } from '../components/ui';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import SEO from '../components/common/SEO';

export const ForgotPasswordPage = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const res = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
      addToast({
        type: 'success',
        title: 'Reset Link Generated',
        message: 'Password reset instructions have been dispatched.',
      });
    } catch (err) {
      setError(err.message || 'Failed to process request. Please try again.');
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to process request',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 sm:px-6 bg-[#FAF8F4] text-[#2E2622]">
      <SEO
        title="Reset Password | Account Security"
        description="Request a secure password reset link for your Glassofy architectural hardware trade account."
      />
      <div className="w-full max-w-md bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-10 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622] mx-auto mb-4">
            <KeyRound className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#2E2622] tracking-tight">Reset Password</h2>
          <p className="text-xs uppercase tracking-[0.06em] text-[#7A726A] mt-2">
            Enter the email associated with your trade account
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-[2px] bg-[#F2F7F2] border border-[#CFE0CF] text-[#4F6B4A] text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-[#4F6B4A]" strokeWidth={1.5} />
              <p className="font-serif text-sm text-[#2E2622]">Password Reset Request Received</p>
              <p className="text-[#7A726A] leading-relaxed">
                If an account exists for <span className="font-medium text-[#2E2622]">{email}</span>, a
                password reset token has been issued.
              </p>
            </div>

            {resetToken && (
              <div className="p-4 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] text-left">
                <span className="text-[10px] uppercase font-medium tracking-[0.08em] text-[#7A726A] block mb-1">
                  Developer / Demo Token:
                </span>
                <code className="text-xs font-mono text-[#2E2622] break-all bg-[#F0EDE8] px-2 py-1 rounded-[2px] block">
                  {resetToken}
                </code>
                <div className="mt-3">
                  <Link to={`/reset-password?token=${resetToken}`}>
                    <Button size="sm" className="w-full justify-center">
                      Proceed to Reset Form
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" size="md" className="w-full justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-[2px] bg-[#FAF0EE] border border-[#E8C2BC] text-[#A4493D] text-xs">
                {error}
              </div>
            )}

            <Input
              label="Account Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="architect@domain.com"
              leftIcon={Mail}
              required
              helperText="We will send a secure token to reset your password"
            />

            <Button
              type="submit"
              size="lg"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Request Reset Token
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-[#7A726A] hover:text-[#2E2622] inline-flex items-center gap-1.5 transition-colors underline underline-offset-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
