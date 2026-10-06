import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShoppingBag,
  ShoppingCart,
  MapPin,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Copy,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Button, Badge, ConfirmDialog, useToast } from '../../components/ui';

export const AdminUserDetailModal = ({ isOpen, onClose, userId, onUserUpdated }) => {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetUrl, setResetUrl] = useState('');
  const [isGeneratingReset, setIsGeneratingReset] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
    confirmText: 'Confirm',
  });

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setResetUrl('');
      try {
        const res = await adminApi.getUserById(userId);
        if (res?.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load user details:', err);
        addToast(err?.message || 'Failed to load user details', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, userId, addToast]);

  if (!isOpen) return null;

  const { user, orders = [], cart = { items: [] } } = data || {};

  const handleToggleStatus = () => {
    const willBlock = user?.isActive !== false;
    setConfirmDialog({
      isOpen: true,
      title: willBlock ? `Block Account: ${user?.fullName}?` : `Unblock Account: ${user?.fullName}?`,
      message: willBlock
        ? 'Blocking this user will prevent them from signing in, placing orders, or accessing their cart.'
        : 'Unblocking this user will restore their account access and purchasing privileges.',
      variant: willBlock ? 'danger' : 'primary',
      confirmText: willBlock ? 'Block Account' : 'Unblock Account',
      onConfirm: async () => {
        try {
          await adminApi.toggleUserStatus(user._id, !willBlock);
          addToast(`Account ${willBlock ? 'blocked' : 'activated'} successfully`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          onUserUpdated?.();
          onClose();
        } catch (err) {
          addToast(err?.message || 'Failed to update account status', 'error');
        }
      },
    });
  };

  const handleChangeRole = (newRole) => {
    if (newRole === user?.role) return;
    setConfirmDialog({
      isOpen: true,
      title: `Change role to ${newRole}?`,
      message:
        newRole === 'ADMIN'
          ? 'Granting ADMIN privileges gives full access to store configurations, products, users, and audit logs.'
          : 'Downgrading to USER will revoke all administrative console access.',
      variant: newRole === 'ADMIN' ? 'warning' : 'danger',
      confirmText: `Grant ${newRole} Role`,
      onConfirm: async () => {
        try {
          await adminApi.changeUserRole(user._id, newRole);
          addToast(`Role updated to ${newRole}`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          onUserUpdated?.();
          onClose();
        } catch (err) {
          addToast(err?.message || 'Failed to update role', 'error');
        }
      },
    });
  };

  const handleGenerateResetLink = async () => {
    setIsGeneratingReset(true);
    try {
      const res = await adminApi.generateResetPasswordLink(user._id);
      if (res?.data?.resetUrl) {
        setResetUrl(res.data.resetUrl);
        navigator.clipboard.writeText(res.data.resetUrl);
        addToast('Password reset link generated and copied to clipboard!', 'success');
      }
    } catch (err) {
      console.error('Failed to generate reset link:', err);
      addToast(err?.message || 'Failed to generate reset link', 'error');
    } finally {
      setIsGeneratingReset(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl z-10 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DDD8CF] flex items-center justify-between bg-[#F0EDE8]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F0EDE8] text-[#2E2622] flex items-center justify-center font-bold text-base border border-[#DDD8CF]">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-light text-[#2E2622]">
                  {user?.fullName || 'User Profile'}
                </h2>
                <Badge
                  variant={user?.role === 'ADMIN' ? 'warning' : 'default'}
                  className="text-[10px]"
                >
                  {user?.role}
                </Badge>
                <Badge
                  variant={user?.isActive !== false ? 'success' : 'danger'}
                  className="text-[10px]"
                >
                  {user?.isActive !== false ? 'Active' : 'Blocked'}
                </Badge>
              </div>
              <p className="text-xs text-[#7A726A] mt-0.5 font-mono">
                {user?.email} • {user?.mobile || 'No mobile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A726A] hover:text-[#2E2622] rounded-[2px] hover:bg-[#DDD8CF]/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#7A726A] flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#3A2F2B]" />
            <span>Loading user record, cart items, and order history...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Business Info & Account Management */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] space-y-2">
                <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
                  Business & Tax
                </h4>
                <p className="text-[#7A726A]">
                  Business:{' '}
                  <span className="font-medium text-[#2E2622]">
                    {user?.businessName || 'Individual Fabricator'}
                  </span>
                </p>
                <p className="text-[#7A726A]">
                  GSTIN:{' '}
                  <span className="font-mono text-[#2E2622]">{user?.gstNumber || 'Unregistered'}</span>
                </p>
                <p className="text-[#7A726A] text-[10px] font-mono pt-1">
                  Registered: {new Date(user?.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>

              <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] space-y-2">
                <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
                  Shipping Address
                </h4>
                {user?.address?.line1 ? (
                  <p className="text-[#2E2622] leading-relaxed">
                    {user.address.line1}
                    {user.address.line2 && `, ${user.address.line2}`}
                    <br />
                    {user.address.city}, {user.address.state} - {user.address.pincode}
                  </p>
                ) : (
                  <p className="text-[#7A726A] italic">No default address on file</p>
                )}
              </div>

              <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] space-y-2">
                <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
                  Role & Account Actions
                </h4>
                <div className="flex items-center gap-2">
                  <select
                    value={user?.role}
                    onChange={(e) => handleChangeRole(e.target.value)}
                    className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1 text-xs text-[#2E2622] font-mono focus:outline-none focus:border-[#3A2F2B]"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleStatus}
                    className={`text-xs py-1 ${
                      user?.isActive !== false
                        ? 'text-[#A4493D] hover:text-[#FAF8F4] hover:bg-[#A4493D] border-[#A4493D]/40'
                        : 'text-[#4F6B4A] hover:text-[#FAF8F4] hover:bg-[#4F6B4A] border-[#4F6B4A]/40'
                    }`}
                  >
                    {user?.isActive !== false ? 'Block User' : 'Unblock User'}
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateResetLink}
                    disabled={isGeneratingReset}
                    className="text-[11px] w-full flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingReset ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5 text-[#3A2F2B]" />
                    )}
                    <span>Copy Password Reset Link</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Reset URL Display if generated */}
            {resetUrl && (
              <div className="p-3 bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] flex items-center justify-between gap-3 animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#7A726A] font-medium">
                    One-Time Password Reset URL
                  </p>
                  <p className="text-xs text-[#2E2622] font-mono truncate">{resetUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetUrl);
                    addToast('Reset URL copied to clipboard!', 'success');
                  }}
                  className="p-1.5 bg-[#3A2F2B] text-[#FAF8F4] rounded-[2px] font-medium hover:bg-[#2E2622]"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Active Cart Items in MongoDB */}
            <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#3A2F2B]" />
                  <span>Current Active Cart ({cart.items?.length || 0} items)</span>
                </h4>
              </div>

              {cart.items?.length === 0 ? (
                <p className="text-[#7A726A] italic py-2">User's cart is currently empty.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {cart.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] flex items-center gap-2.5"
                    >
                      <img
                        src={item.product?.images?.[0] || '/images/glass_connector.png'}
                        alt="Product"
                        className="w-10 h-10 object-contain rounded-[2px] bg-[#FAF8F4] p-1 mix-blend-multiply"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#2E2622] truncate">
                          {item.product?.name || 'Item'}
                        </p>
                        <p className="text-[10px] text-[#7A726A] font-mono">
                          Qty: {item.quantity} • ₹{item.price || item.product?.basePrice}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order History */}
            <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-4 space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#3A2F2B]" />
                <span>Order History ({orders.length})</span>
              </h4>

              {orders.length === 0 ? (
                <p className="text-[#7A726A] italic py-2">User has not placed any orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#2E2622]">
                    <thead>
                      <tr className="border-b border-[#DDD8CF] text-[10px] uppercase font-mono tracking-[0.08em] text-[#7A726A]">
                        <th className="pb-2">Order #</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Payment</th>
                        <th className="pb-2">Fulfillment</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD8CF]">
                      {orders.map((o) => (
                        <tr key={o._id} className="hover:bg-[#F0EDE8]/40">
                          <td className="py-2.5 font-mono font-medium text-[#3A2F2B]">{o.orderNumber}</td>
                          <td className="py-2.5 font-mono text-[#7A726A]">
                            {new Date(o.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`text-[10px] font-mono ${
                                o.paymentStatus === 'PAID' ? 'text-[#4F6B4A]' : 'text-[#B08D57]'
                              }`}
                            >
                              {o.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="font-mono text-[10px] text-[#7A726A]">
                              {o.orderStatus}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono font-medium text-[#2E2622]">
                            ₹{o.total?.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
      />
    </div>
  );
};

export default AdminUserDetailModal;
