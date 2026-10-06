import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { Button, Input, Badge, useToast } from '../components/ui';
import { User, Mail, Phone, Building, FileText, MapPin, Lock, Check, Save } from 'lucide-react';
import SEO from '../components/common/SEO';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore();
  const { addToast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
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

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        mobile: user.mobile || '',
        businessName: user.businessName || '',
        gstNumber: user.gstNumber || '',
        address: {
          line1: user.address?.line1 || '',
          line2: user.address?.line2 || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          pincode: user.address?.pincode || '',
        },
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const res = await updateProfile({
        ...formData,
        fullName: formData.name,
      });
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your personal and business details have been saved.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: res.error || 'Failed to update profile.',
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      addToast({
        type: 'success',
        title: 'Security Updated',
        message: 'Your account password has been changed successfully.',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      const msg = err.message || 'Failed to update password. Please check your current password.';
      setPasswordError(msg);
      addToast({
        type: 'error',
        title: 'Password Error',
        message: msg,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-12 px-4 sm:px-6 text-[#2E2622]">
      <div className="max-w-5xl mx-auto space-y-8">
        <SEO
          title="Trade Profile & Settings | Glassofy"
          description="Manage your Glassofy account profile, billing address, GST credentials, trade tier status, and security settings."
        />
        {/* Profile Header */}
        <div className="bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622] font-serif text-xl font-normal">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-tight">{user?.name}</h1>
                <Badge variant={user?.role === 'ADMIN' ? 'accent' : 'outline'}>
                  {user?.role || 'USER'}
                </Badge>
              </div>
              <p className="text-xs text-[#7A726A] mt-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#2E2622]" /> {user?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs text-[#7A726A]">
            <span className="text-[10px] uppercase font-medium tracking-[0.08em] text-[#7A726A]">
              Account Status
            </span>
            <span className="text-[#4F6B4A] font-medium flex items-center gap-1 mt-0.5 text-xs">
              <Check className="w-3.5 h-3.5" /> Verified Commercial Client
            </span>
            {user?.businessName && (
              <span className="text-[#2E2622] mt-1 font-medium text-xs">{user.businessName}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Profile Form */}
          <div className="lg:col-span-2 bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-[#DDD8CF] pb-4">
              <h2 className="text-lg font-serif font-light text-[#2E2622] tracking-tight">Account Details</h2>
              <p className="text-xs text-[#7A726A] mt-0.5">
                Manage your personal info, B2B company registration and shipping destinations
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleProfileChange}
                  leftIcon={User}
                  required
                />
                <Input
                  label="Mobile Number"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleProfileChange}
                  leftIcon={Phone}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business / Firm Name"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleProfileChange}
                  leftIcon={Building}
                  placeholder="Optional firm name"
                />
                <Input
                  label="GSTIN Number"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleProfileChange}
                  leftIcon={FileText}
                  placeholder="15-digit GSTIN"
                />
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-medium text-[#7A726A] uppercase tracking-[0.08em] block">
                  Default Dispatch Address
                </span>
                <Input
                  label="Address Line 1"
                  name="address.line1"
                  value={formData.address.line1}
                  onChange={handleProfileChange}
                  placeholder="Street address or warehouse"
                  leftIcon={MapPin}
                />
                <Input
                  label="Address Line 2"
                  name="address.line2"
                  value={formData.address.line2}
                  onChange={handleProfileChange}
                  placeholder="Suite, unit, floor"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="City"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleProfileChange}
                  />
                  <Input
                    label="State"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleProfileChange}
                  />
                  <Input
                    label="Pincode"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" size="md" isLoading={isUpdating} className="gap-2">
                  <Save className="w-4 h-4" /> Save Profile Details
                </Button>
              </div>
            </form>
          </div>

          {/* Right 1 Col: Change Password */}
          <div className="bg-white border border-[#DDD8CF] rounded-[2px] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-[#DDD8CF] pb-4">
              <h2 className="text-lg font-serif font-light text-[#2E2622] tracking-tight">Security & Credentials</h2>
              <p className="text-xs text-[#7A726A] mt-0.5 leading-relaxed">
                Update your account password regularly to protect your trade credentials
              </p>
            </div>

            {passwordError && (
              <div className="p-3 rounded-[2px] bg-[#FAF0EE] border border-[#E8C2BC] text-[#A4493D] text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                leftIcon={Lock}
                required
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                leftIcon={Lock}
                required
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                leftIcon={Lock}
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  className="w-full justify-center"
                  isLoading={isChangingPassword}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
