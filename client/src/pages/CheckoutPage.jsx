import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Banknote,
  Building,
  Truck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { initiateCheckout, verifyPayment } from '../api/orderApi';
import SEO from '../components/common/SEO';
import { useToast } from '../components/ui';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const { items, pricing, clearCart } = useCartStore();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.mobile || '',
    line1: user?.address?.line1 || '',
    line2: user?.address?.line2 || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    pincode: user?.address?.pincode || '',
    businessName: user?.businessName || '',
    gstNumber: user?.gstNumber || '',
    paymentMethod: 'RAZORPAY',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mockModal, setMockModal] = useState(null); // { orderId, rzpOrderId }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (items.length === 0 && !mockModal) {
      navigate('/cart');
    }
  }, [items, navigate, mockModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = {
        shippingAddress: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          line1: formData.line1.trim(),
          line2: formData.line2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        },
        businessName: formData.businessName.trim(),
        gstNumber: formData.gstNumber.trim().toUpperCase(),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim(),
      };

      const res = await initiateCheckout(payload);

      if (!res.success) {
        throw new Error(res.message || 'Checkout failed');
      }

      const orderData = res.data?.order;

      // Handle Cash on Delivery
      if (formData.paymentMethod === 'COD') {
        clearCart(true);
        addToast(`Order #${orderData.orderNumber} confirmed successfully!`, 'success');
        navigate(`/order-success/${orderData._id}`);
        return;
      }

      // Handle Razorpay (Test / Mock Mode)
      const rzpConfig = res.data?.razorpay;

      if (rzpConfig?.isMock || !window.Razorpay) {
        // Show test payment simulation modal
        setMockModal({
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          rzpOrderId: rzpConfig.orderId,
          amount: pricing.grandTotal,
        });
        setIsSubmitting(false);
        return;
      }

      // Real or Live Razorpay Checkout
      const options = {
        key: rzpConfig.keyId,
        amount: rzpConfig.amount,
        currency: rzpConfig.currency || 'INR',
        name: 'Glassofy Hardware',
        description: `Order ${orderData.orderNumber}`,
        order_id: rzpConfig.orderId,
        handler: async (response) => {
          try {
            setIsSubmitting(true);
            const verifyRes = await verifyPayment({
              orderId: orderData._id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              clearCart(true);
              addToast(`Payment verified! Order #${orderData.orderNumber} confirmed.`, 'success');
              navigate(`/order-success/${orderData._id}`);
            } else {
              throw new Error(verifyRes.message || 'Payment verification failed');
            }
          } catch (err) {
            setErrorMessage(err.message || 'Payment verification failed');
            addToast(err.message || 'Payment verification failed', 'error');
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: formData.fullName,
          email: user?.email,
          contact: formData.phone,
        },
        theme: {
          color: '#3A2F2B',
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
      setIsSubmitting(false);
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong during checkout');
      addToast(err.message || 'Checkout failed', 'error');
      setIsSubmitting(false);
    }
  };

  const handleSimulatePayment = async (status) => {
    if (!mockModal) return;
    setIsSubmitting(true);

    try {
      if (status === 'SUCCESS') {
        const verifyRes = await verifyPayment({
          orderId: mockModal.orderId,
          razorpayOrderId: mockModal.rzpOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'valid_test_signature',
        });

        if (verifyRes.success) {
          clearCart(true);
          addToast(`Payment received! Order #${mockModal.orderNumber} confirmed.`, 'success');
          navigate(`/order-success/${mockModal.orderId}`);
        } else {
          throw new Error(verifyRes.message || 'Verification failed');
        }
      } else {
        // Simulate failure
        await verifyPayment({
          orderId: mockModal.orderId,
          razorpayOrderId: mockModal.rzpOrderId,
          razorpayPaymentId: `pay_mock_failed_${Date.now()}`,
          razorpaySignature: 'invalid_signature',
        }).catch(() => {});

        setErrorMessage('Payment simulation was declined. Stock remains safely reserved.');
        addToast('Payment declined or cancelled', 'error');
        setMockModal(null);
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment failed');
      addToast(err.message || 'Payment failed', 'error');
      setMockModal(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-[#2E2622]">
      <SEO
        title="Checkout & Trade Invoicing | Glassofy"
        description="Secure B2B and retail checkout with pan-India delivery, GST input tax credit calculation, and verified payment gateway processing."
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-[#DDD8CF]">
          <nav className="text-xs uppercase tracking-[0.08em] text-[#7A726A] mb-3 flex items-center gap-2">
            <Link to="/cart" className="hover:text-[#2E2622] transition-colors">
              Cart
            </Link>
            <span className="text-[#DDD8CF]">/</span>
            <span className="text-[#2E2622]">Checkout</span>
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight flex items-center gap-3">
              <span>Secure Trade Checkout</span>
            </h1>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.06em] text-[#7A726A]">
              <Lock className="w-3.5 h-3.5 text-[#2E2622]" />
              <span>Encrypted Session</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-[#FAF0EE] border border-[#E8C2BC] rounded-[2px] flex items-center gap-3 text-[#A4493D] text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#A4493D]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
        >
          {/* Left Form: Shipping, B2B, Payment */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Shipping Address */}
            <div className="bg-white p-6 sm:p-8 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-5">
              <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2 border-b border-[#DDD8CF] pb-3 tracking-tight">
                <Truck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
                <span>Shipping & Delivery Destination</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Phone (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Address Line 1 (Street / Building) *
                  </label>
                  <input
                    type="text"
                    name="line1"
                    required
                    value={formData.line1}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Address Line 2 (Landmark / Area)
                  </label>
                  <input
                    type="text"
                    name="line2"
                    value={formData.line2}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Pincode (6 Digits) *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* 2. B2B Wholesale & Tax Info */}
            <div className="bg-white p-6 sm:p-8 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-4">
              <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2 border-b border-[#DDD8CF] pb-3 tracking-tight">
                <Building className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
                <span>B2B Commercial Tax Invoice (Optional)</span>
              </h2>
              <p className="text-xs text-[#7A726A] leading-relaxed">
                Provide your Business Name and GSTIN to claim GST Input Tax Credit (ITC). We will
                generate an official GST tax invoice for your accounting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Apex Glass & Hardware Pvt Ltd"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                    GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    maxLength={15}
                    value={formData.gstNumber}
                    onChange={handleChange}
                    placeholder="e.g. 27AAACG1234F1Z5"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm uppercase font-mono text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B] min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white p-6 sm:p-8 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-4">
              <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2 border-b border-[#DDD8CF] pb-3 tracking-tight">
                <CreditCard className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
                <span>Payment Settlement</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Razorpay */}
                <label
                  className={`p-4 border rounded-[2px] flex items-start gap-3 cursor-pointer transition-colors ${
                    formData.paymentMethod === 'RAZORPAY'
                      ? 'border-[#3A2F2B] bg-[#F0EDE8]'
                      : 'border-[#DDD8CF] bg-[#FAF8F4] hover:border-[#7A726A]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="RAZORPAY"
                    checked={formData.paymentMethod === 'RAZORPAY'}
                    onChange={handleChange}
                    className="mt-1 accent-[#3A2F2B]"
                  />
                  <div>
                    <div className="font-medium text-[#2E2622] text-sm flex items-center gap-2">
                      <span>Online Gateway</span>
                      <span className="text-[10px] bg-[#DDD8CF] text-[#2E2622] px-1.5 py-0.2 rounded-[2px] font-mono uppercase">
                        Sandbox
                      </span>
                    </div>
                    <p className="text-xs text-[#7A726A] mt-1 leading-relaxed">
                      UPI, Net Banking, Debit/Credit Cards & Corporate Accounts.
                    </p>
                  </div>
                </label>

                {/* Cash on Delivery */}
                <label
                  className={`p-4 border rounded-[2px] flex items-start gap-3 cursor-pointer transition-colors ${
                    formData.paymentMethod === 'COD'
                      ? 'border-[#3A2F2B] bg-[#F0EDE8]'
                      : 'border-[#DDD8CF] bg-[#FAF8F4] hover:border-[#7A726A]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={formData.paymentMethod === 'COD'}
                    onChange={handleChange}
                    className="mt-1 accent-[#3A2F2B]"
                  />
                  <div>
                    <div className="font-medium text-[#2E2622] text-sm flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-[#4F6B4A]" strokeWidth={1.5} />
                      <span>Cash on Delivery</span>
                    </div>
                    <p className="text-xs text-[#7A726A] mt-1 leading-relaxed">
                      Remit cash or UPI upon physical receipt at site.
                    </p>
                  </div>
                </label>
              </div>

              {/* Delivery Notes */}
              <div className="pt-2">
                <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                  Delivery Instructions / Site Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Call site engineer prior to arrival, service elevator access..."
                  className="w-full px-3.5 py-2 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-sm text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Order Review */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-5">
              <h3 className="text-base font-serif font-light text-[#2E2622] pb-3 border-b border-[#DDD8CF] flex items-center justify-between tracking-tight">
                <span>Items in Order</span>
                <span className="text-xs uppercase tracking-[0.06em] text-[#7A726A] bg-[#F0EDE8] border border-[#DDD8CF] px-2 py-0.5 rounded-[2px]">
                  {items.length} item(s)
                </span>
              </h3>

              {/* Mini Item List */}
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-[#DDD8CF]">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="pt-3 first:pt-0 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-normal text-[#2E2622] line-clamp-1">
                        {item.product?.title || item.product?.name}
                      </div>
                      <div className="text-[#7A726A] text-[11px] mt-0.5">
                        {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}
                        {item.size ? ` (${item.size})` : ''}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-[#2E2622] whitespace-nowrap">
                      ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown (Ledger) */}
              <div className="pt-4 border-t border-[#DDD8CF] space-y-2.5 text-xs">
                <div className="flex justify-between text-[#7A726A]">
                  <span>Subtotal</span>
                  <span className="font-mono text-sm text-[#2E2622]">
                    ₹{pricing.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {pricing.discounts?.map((d, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-[#4F6B4A]"
                  >
                    <span className="truncate pr-2">{d.label}</span>
                    <span className="font-mono">-₹{d.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                <div className="flex justify-between text-[#7A726A]">
                  <span>GST (18% Architectural Fittings)</span>
                  <span className="font-mono text-[#2E2622]">
                    ₹{pricing.gst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-[#7A726A]">
                  <span>Shipping & Handling</span>
                  <span>
                    {pricing.shipping === 0 ? (
                      <span className="text-[#4F6B4A] font-medium uppercase tracking-[0.06em] text-[11px] bg-[#F2F7F2] border border-[#CFE0CF] px-2 py-0.5 rounded-[2px]">
                        FREE
                      </span>
                    ) : (
                      <span className="font-mono text-[#2E2622]">
                        ₹{pricing.shipping?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </span>
                </div>

                <div className="pt-4 border-t border-[#DDD8CF] flex justify-between items-baseline">
                  <span className="text-base font-serif font-normal text-[#2E2622]">Total Payable</span>
                  <span className="text-2xl font-serif font-light text-[#2E2622] tracking-tight">
                    ₹{pricing.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3.5 px-6 bg-[#3A2F2B] hover:bg-[#2E2622] disabled:opacity-50 text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FAF8F4]" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <span>
                    {formData.paymentMethod === 'COD'
                      ? 'Confirm Cash on Delivery Order'
                      : `Pay ₹${pricing.grandTotal?.toLocaleString('en-IN')} via Razorpay`}
                  </span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A726A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E2622]" strokeWidth={1.5} />
                <span>256-bit SSL Encrypted & PCI-DSS Compliant</span>
              </div>
            </div>
          </div>
        </form>

        {/* Interactive Razorpay Test Simulator Modal */}
        {mockModal && (
          <div className="fixed inset-0 z-50 bg-[#2E2622]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[2px] max-w-md w-full p-6 shadow-xl border border-[#DDD8CF] space-y-5 animate-in fade-in zoom-in-95 duration-200 text-[#2E2622]">
              <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CF]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] flex items-center justify-center font-bold text-xs">
                    R
                  </div>
                  <div>
                    <h3 className="font-serif font-light text-[#2E2622] text-sm">Razorpay Sandbox Gateway</h3>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-[#7A726A]">Test Transaction</p>
                  </div>
                </div>
                <span className="font-mono text-xs bg-[#F0EDE8] px-2 py-0.5 rounded-[2px] border border-[#DDD8CF] text-[#2E2622]">
                  {mockModal.orderNumber}
                </span>
              </div>

              <div className="bg-[#FAF8F4] p-4 rounded-[2px] text-center border border-[#DDD8CF]">
                <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Amount Payable</span>
                <span className="text-2xl font-serif font-light text-[#2E2622]">
                  ₹{mockModal.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <p className="text-xs text-[#7A726A] text-center leading-relaxed">
                This simulated Razorpay gateway allows immediate checkout testing. Choose an outcome:
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleSimulatePayment('SUCCESS')}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-[#4F6B4A] hover:bg-[#3D5439] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simulate Successful Payment (Commit Stock)
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulatePayment('FAILURE')}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-[#FAF8F4] hover:bg-[#FAF0EE] hover:text-[#A4493D] text-[#7A726A] border border-[#DDD8CF] text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] flex items-center justify-center gap-2 transition-colors"
                >
                  <AlertCircle className="w-4 h-4 text-[#A4493D]" />
                  Simulate Failed Payment (Leave Stock Untouched)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
