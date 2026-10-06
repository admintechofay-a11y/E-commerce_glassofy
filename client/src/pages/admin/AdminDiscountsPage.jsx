import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Percent,
  Sliders,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Loader2,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  EmptyState,
  ConfirmDialog,
  useToast,
} from '../../components/ui';
import SEO from '../../components/common/SEO';

export const AdminDiscountsPage = () => {
  const { addToast } = useToast();
  const [rules, setRules] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [stackingMode, setStackingMode] = useState('best-of');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stacking mode update
  const [isUpdatingStacking, setIsUpdatingStacking] = useState(false);

  // Volume Tier Modal
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierName, setTierName] = useState('');
  const [minCartTotal, setMinCartTotal] = useState(5000);
  const [discountPercentage, setDiscountPercentage] = useState(5);
  const [isTierSaving, setIsTierSaving] = useState(false);

  // Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState('PERCENTAGE');
  const [couponValue, setCouponValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(1000);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(500);
  const [usageLimit, setUsageLimit] = useState(100);
  const [perUserLimit, setPerUserLimit] = useState(1);
  const [expiryDays, setExpiryDays] = useState(30);
  const [isCouponSaving, setIsCouponSaving] = useState(false);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchDiscounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDiscounts();
      if (res?.data) {
        setRules(res.data.rules || []);
        setCoupons(res.data.coupons || []);
        setStackingMode(res.data.stackingMode || 'best-of');
      }
    } catch (err) {
      console.error('Failed to load discounts:', err);
      setError(err?.message || 'Unable to load discount configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  // Update Stacking Mode
  const handleStackingModeChange = async (newMode) => {
    setIsUpdatingStacking(true);
    try {
      await adminApi.updateStackingMode(newMode);
      setStackingMode(newMode);
      addToast(
        `Discount engine stacking mode switched to "${newMode === 'stack' ? 'Combine & Stack All' : 'Best-Of Single Discount'}"`,
        'success'
      );
    } catch (err) {
      addToast(err?.message || 'Failed to update stacking mode', 'error');
    } finally {
      setIsUpdatingStacking(false);
    }
  };

  // Save Cart Tier
  const handleSaveTier = async (e) => {
    e.preventDefault();
    setIsTierSaving(true);
    try {
      const payload = {
        name: tierName,
        ruleType: 'CART_TOTAL',
        conditions: {
          minCartTotal: Number(minCartTotal),
          minAmount: Number(minCartTotal),
        },
        discountPercentage: Number(discountPercentage),
        priority: 10,
        isActive: true,
      };

      if (editingTier?._id) {
        payload._id = editingTier._id;
      }

      await adminApi.saveDiscountRule(payload);
      addToast(`Volume tier "${tierName}" saved successfully`, 'success');
      setIsTierModalOpen(false);
      fetchDiscounts();
    } catch (err) {
      console.error('Failed to save volume tier:', err);
      addToast(err?.message || 'Failed to save tier', 'error');
    } finally {
      setIsTierSaving(false);
    }
  };

  // Delete Cart Tier
  const handleDeleteTier = (rule) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Tier "${rule.name}"?`,
      message: 'This volume discount tier will immediately be removed from the checkout calculation engine.',
      onConfirm: async () => {
        try {
          await adminApi.deleteDiscountRule(rule._id);
          addToast(`Rule "${rule.name}" deleted`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          fetchDiscounts();
        } catch (err) {
          addToast(err?.message || 'Failed to delete rule', 'error');
        }
      },
    });
  };

  // Save Coupon
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setIsCouponSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + Number(expiryDays));

      const payload = {
        code: couponCode.toUpperCase().trim(),
        type: couponType,
        value: Number(couponValue),
        minOrderAmount: Number(minOrderAmount),
        maxDiscountAmount: couponType === 'PERCENTAGE' ? Number(maxDiscountAmount) : 0,
        usageLimit: Number(usageLimit),
        perUserLimit: Number(perUserLimit),
        validUntil,
        isActive: true,
      };

      await adminApi.saveCoupon(payload);
      addToast(`Coupon "${payload.code}" created successfully`, 'success');
      setIsCouponModalOpen(false);
      fetchDiscounts();
    } catch (err) {
      console.error('Failed to save coupon:', err);
      addToast(err?.message || 'Failed to save coupon', 'error');
    } finally {
      setIsCouponSaving(false);
    }
  };

  // Expire Coupon
  const handleExpireCoupon = async (coupon) => {
    try {
      await adminApi.saveCoupon({
        ...coupon,
        isActive: false,
        validUntil: new Date(Date.now() - 1000),
      });
      addToast(`Coupon ${coupon.code} marked as expired`, 'success');
      fetchDiscounts();
    } catch (err) {
      addToast(err?.message || 'Failed to expire coupon', 'error');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = (coupon) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Coupon "${coupon.code}"?`,
      message: 'This coupon will be deleted and can no longer be redeemed at checkout.',
      onConfirm: async () => {
        try {
          await adminApi.deleteCoupon(coupon._id);
          addToast(`Coupon "${coupon.code}" deleted`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          fetchDiscounts();
        } catch (err) {
          addToast(err?.message || 'Failed to delete coupon', 'error');
        }
      },
    });
  };

  return (
    <div className="space-y-8">
      <SEO
        title="Discounts & Coupons Engine | Admin"
        description="Configure volume pricing breaks, minimum cart total thresholds, promotional coupon codes, and stacking rules."
      />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
          Discounts & Pricing Engine
        </h1>
        <p className="text-xs text-[#7A726A] mt-1">
          Configure cart-total tiers, promotional coupon codes, and engine stacking modes.
        </p>
      </div>

      {/* Stacking Mode Toggle Card */}
      <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#3A2F2B]" />
            <h2 className="text-base font-serif font-normal text-[#2E2622]">
              Discount Stacking Behavior
            </h2>
          </div>
          <p className="text-xs text-[#7A726A] mt-1 max-w-xl leading-relaxed">
            Choose how coupons, bulk product tiers, and total-cart volume discounts interact when a
            customer qualifies for multiple offers simultaneously.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F0EDE8] p-1.5 rounded-[2px] border border-[#DDD8CF]">
          <button
            type="button"
            disabled={isUpdatingStacking}
            onClick={() => handleStackingModeChange('best-of')}
            className={`px-4 py-2 rounded-[2px] text-xs font-medium transition-all ${
              stackingMode === 'best-of'
                ? 'bg-[#3A2F2B] text-[#FAF8F4] shadow-sm'
                : 'text-[#7A726A] hover:text-[#2E2622]'
            }`}
          >
            Best-Of Single Offer
          </button>
          <button
            type="button"
            disabled={isUpdatingStacking}
            onClick={() => handleStackingModeChange('stack')}
            className={`px-4 py-2 rounded-[2px] text-xs font-medium transition-all ${
              stackingMode === 'stack'
                ? 'bg-[#3A2F2B] text-[#FAF8F4] shadow-sm'
                : 'text-[#7A726A] hover:text-[#2E2622]'
            }`}
          >
            Stack & Combine All
          </button>
        </div>
      </div>

      {/* Section 1: Cart-Total Volume Tiers */}
      <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-normal text-[#2E2622] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#3A2F2B]" />
              <span>Cart-Total Volume Tiers</span>
            </h2>
            <p className="text-xs text-[#7A726A] mt-0.5">
              Automatically applies progressive savings when customer order total exceeds threshold.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingTier(null);
              setTierName('Orders Above ₹10,000 (10% Off)');
              setMinCartTotal(10000);
              setDiscountPercentage(10);
              setIsTierModalOpen(true);
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#3A2F2B]" />
            <span>Add Volume Tier</span>
          </Button>
        </div>

        {rules.length === 0 ? (
          <p className="text-xs text-[#7A726A] italic py-4">No volume tiers active.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622]">
              <thead>
                <tr className="border-b border-[#DDD8CF] text-[10px] uppercase font-mono tracking-[0.08em] text-[#7A726A] bg-[#F0EDE8]/60">
                  <th className="p-3">Tier Name</th>
                  <th className="p-3">Min Order Amount</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {rules.map((rule) => {
                  const minAmt =
                    rule.conditions?.minCartTotal ?? rule.conditions?.minAmount ?? 0;
                  return (
                    <tr key={rule._id} className="hover:bg-[#F0EDE8]/40 transition-colors">
                      <td className="p-3 font-medium text-[#2E2622]">{rule.name}</td>
                      <td className="p-3 font-mono text-[#2E2622] font-medium">
                        ₹{Number(minAmt).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-medium text-[#4F6B4A]">
                        {rule.discountPercentage}% OFF
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={rule.isActive !== false ? 'success' : 'default'}
                          className="text-[10px]"
                        >
                          {rule.isActive !== false ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTier(rule)}
                          className="p-1.5 text-[#7A726A] hover:text-[#A4493D] rounded-[2px] hover:bg-[#A4493D]/10"
                          title="Delete Tier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Promotional Coupons */}
      <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-normal text-[#2E2622] flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#3A2F2B]" />
              <span>Promotional Coupons & Voucher Codes</span>
            </h2>
            <p className="text-xs text-[#7A726A] mt-0.5">
              Create marketing coupon codes with usage caps, expiration dates, and min orders.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setCouponCode(`PROMO-${Date.now().toString().slice(-4)}`);
              setCouponType('PERCENTAGE');
              setCouponValue(15);
              setMinOrderAmount(2000);
              setMaxDiscountAmount(500);
              setUsageLimit(50);
              setPerUserLimit(1);
              setExpiryDays(30);
              setIsCouponModalOpen(true);
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Coupon</span>
          </Button>
        </div>

        {coupons.length === 0 ? (
          <p className="text-xs text-[#7A726A] italic py-4">No coupons created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622]">
              <thead>
                <tr className="border-b border-[#DDD8CF] text-[10px] uppercase font-mono tracking-[0.08em] text-[#7A726A] bg-[#F0EDE8]/60">
                  <th className="p-3">Coupon Code</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Min Order</th>
                  <th className="p-3">Max Cap</th>
                  <th className="p-3">Redeemed / Cap</th>
                  <th className="p-3">Valid Until</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {coupons.map((c) => {
                  const isExpired =
                    new Date(c.validUntil) < new Date() || c.isActive === false;
                  return (
                    <tr key={c._id} className="hover:bg-[#F0EDE8]/40 transition-colors">
                      <td className="p-3 font-mono font-medium text-[#3A2F2B] tracking-wider">
                        {c.code}
                      </td>
                      <td className="p-3 font-mono font-medium text-[#2E2622]">
                        {c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}
                      </td>
                      <td className="p-3 font-mono text-[#7A726A]">
                        ₹{c.minOrderAmount?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="p-3 font-mono text-[#7A726A]">
                        {c.type === 'PERCENTAGE' && c.maxDiscountAmount > 0
                          ? `₹${c.maxDiscountAmount}`
                          : 'No Cap'}
                      </td>
                      <td className="p-3 font-mono text-[#7A726A]">
                        {c.usedCount || 0} / {c.usageLimit || '∞'}
                      </td>
                      <td className="p-3 font-mono text-[#7A726A]">
                        {new Date(c.validUntil).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={!isExpired ? 'success' : 'default'}
                          className="text-[10px]"
                        >
                          {!isExpired ? 'Active' : 'Expired'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isExpired && (
                            <button
                              onClick={() => handleExpireCoupon(c)}
                              className="px-2 py-1 rounded-[2px] text-[10px] text-[#B08D57] hover:bg-[#B08D57]/10 font-mono"
                              title="Expire now"
                            >
                              Expire
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCoupon(c)}
                            className="p-1.5 text-[#7A726A] hover:text-[#A4493D] rounded-[2px] hover:bg-[#A4493D]/10"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Volume Tier Modal */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm"
            onClick={() => setIsTierModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-serif font-light text-[#2E2622] mb-1">Add Volume Tier</h3>
            <p className="text-xs text-[#7A726A] mb-6">
              Configure minimum cart subtotal and discount percentage.
            </p>

            <form onSubmit={handleSaveTier} className="space-y-4 text-xs">
              <Input
                label="Tier Name *"
                value={tierName}
                onChange={(e) => setTierName(e.target.value)}
                placeholder="e.g. Orders Above ₹15,000 (15% Off)"
                required
              />
              <Input
                label="Minimum Cart Subtotal (₹) *"
                type="number"
                value={minCartTotal}
                onChange={(e) => setMinCartTotal(e.target.value)}
                required
              />
              <Input
                label="Discount Percentage (%) *"
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                required
              />

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTierModalOpen(false)}
                  disabled={isTierSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isTierSaving}
                  className="flex items-center gap-2"
                >
                  {isTierSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Volume Tier</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm"
            onClick={() => setIsCouponModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-serif font-light text-[#2E2622] mb-1">Create Promo Coupon</h3>
            <p className="text-xs text-[#7A726A] mb-6">
              Voucher codes are entered by fabricators at cart and verified on the server.
            </p>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Coupon Code *"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE20"
                  required
                />
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value)}
                    className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3.5 py-2.5 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] font-mono"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FLAT">FLAT AMOUNT (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label={couponType === 'PERCENTAGE' ? 'Discount % *' : 'Flat ₹ Amount *'}
                  type="number"
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                  required
                />
                <Input
                  label="Min Order (₹)"
                  type="number"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                />
                <Input
                  label="Max Cap (₹)"
                  type="number"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  disabled={couponType === 'FLAT'}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Total Usage Limit"
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                />
                <Input
                  label="Per-User Limit"
                  type="number"
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(e.target.value)}
                />
                <Input
                  label="Expires In (Days)"
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCouponModalOpen(false)}
                  disabled={isCouponSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCouponSaving}
                  className="flex items-center gap-2"
                >
                  {isCouponSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Coupon</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete Offer"
        confirmVariant="danger"
      />
    </div>
  );
};

export default AdminDiscountsPage;
