import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input, useToast } from '../components/ui';
import { User, Mail, Phone, Lock, Building, FileText, MapPin, Eye, EyeOff } from 'lucide-react';
import SEO from '../components/common/SEO';

export const RegisterPage = () => {
  const { register, isLoading, error: authError, clearError } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    gstNumber: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.mobile.replace(/\s+/g, ''))) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (
      formData.gstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        formData.gstNumber.toUpperCase()
      )
    ) {
      newErrors.gstNumber =
        'Please enter a valid 15-character GSTIN format (e.g., 22AAAAA0000A1Z5)';
    }

    if (formData.address.pincode && !/^[0-9]{6}$/.test(formData.address.pincode)) {
      newErrors['address.pincode'] = 'Pincode must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearError();

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear specific field error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      fullName: formData.name,
      email: formData.email,
      mobile: formData.mobile,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      businessName: formData.businessName || undefined,
      gstNumber: formData.gstNumber ? formData.gstNumber.toUpperCase() : undefined,
      address: formData.address,
    };

    const res = await register(payload);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Account Created',
        message: 'Welcome to Glassofy! Your account has been registered successfully.',
      });
      navigate('/profile');
    } else {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: res.error || 'Failed to register account',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-12 px-4 sm:px-6 text-[#2E2622]">
      <SEO
        title="Trade Registration | Open Account"
        description="Register for a Glassofy trade account to unlock B2B pricing tiers, GST tax credit invoicing, and dedicated contractor dispatch across India."
      />
      <div className="max-w-2xl mx-auto bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-10 shadow-xs">
        <div className="text-center max-w-md mx-auto mb-8">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#7A726A]">
            Architectural Hardware Portal
          </span>
          <h1 className="text-3xl font-serif font-light text-[#2E2622] mt-2 tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-[#7A726A] mt-2 leading-relaxed">
            Register for retail ordering or add commercial GST details to unlock trade discounting and Input Tax Credit.
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-4 rounded-[2px] bg-[#FAF0EE] border border-[#E8C2BC] text-[#A4493D] text-xs">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] border-b border-[#DDD8CF] pb-2">
              1. Personal Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                leftIcon={User}
                required
                error={errors.name}
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="rahul.sharma@fabricators.in"
                leftIcon={Mail}
                required
                error={errors.email}
              />
            </div>

            <Input
              label="Mobile Number"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="9811002233"
              leftIcon={Phone}
              required
              helperText="Used for order confirmation & dispatch notifications"
              error={errors.mobile}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
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
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                leftIcon={Lock}
                required
                error={errors.confirmPassword}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#7A726A] hover:text-[#2E2622] focus:outline-none"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </div>
          </div>

          {/* Trade / Business Details (Optional) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-[#DDD8CF] pb-2">
              <h4 className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A]">
                2. Business & Tax Details (Optional)
              </h4>
              <span className="text-[10px] text-[#7A726A] uppercase tracking-[0.06em]">
                For Commercial / B2B
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business / Firm Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g. Apex Glass & Interiors"
                leftIcon={Building}
              />
              <Input
                label="GSTIN Number"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                placeholder="e.g. 07AAAAA0000A1Z5"
                leftIcon={FileText}
                error={errors.gstNumber}
                helperText="15-digit GST identification for input tax credit"
              />
            </div>
          </div>

          {/* Address Details */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] border-b border-[#DDD8CF] pb-2">
              3. Delivery & Dispatch Destination
            </h4>

            <Input
              label="Address Line 1"
              name="address.line1"
              value={formData.address.line1}
              onChange={handleChange}
              placeholder="Plot No., Building Name, Street"
              leftIcon={MapPin}
            />

            <Input
              label="Address Line 2 (Optional)"
              name="address.line2"
              value={formData.address.line2}
              onChange={handleChange}
              placeholder="Apartment, suite, unit, floor"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="e.g. New Delhi"
              />
              <Input
                label="State"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="e.g. Delhi"
              />
              <Input
                label="Pincode"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                placeholder="e.g. 110020"
                error={errors['address.pincode']}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              size="lg"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Complete Registration
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-[#7A726A] border-t border-[#DDD8CF] pt-6">
          Already registered with Glassofy?{' '}
          <Link to="/login" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A] font-medium">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
