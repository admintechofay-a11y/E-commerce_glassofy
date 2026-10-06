import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Tag,
  ShieldCheck,
  Truck,
  CheckCircle2,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import SEO from '../components/common/SEO';
import { useToast } from '../components/ui';
import { getOptimizedImageUrl } from '../utils/imageUtils';

export const CartPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const {
    items,
    pricing,
    coupon,
    loadCart,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    isLoading,
    error,
    clearError,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponMessage, setCouponMessage] = useState(null);

  useEffect(() => {
    loadCart(isAuthenticated);
  }, [isAuthenticated, loadCart]);

  const handleQuantityChange = async (itemId, newQty) => {
    if (newQty < 1) return;
    await updateQuantity(itemId, newQty, isAuthenticated);
  };

  const handleRemove = async (itemId, productId, variantId, itemName) => {
    await removeItem(itemId, productId, variantId, isAuthenticated);
    addToast(`${itemName || 'Item'} removed from cart`, 'info');
  };

  const handleClearCart = async () => {
    await clearCart(isAuthenticated);
    addToast('Shopping cart cleared', 'info');
  };

  const handleApplyCoupon = async (e) => {
    e?.preventDefault();
    if (!couponInput.trim()) return;

    setCouponSubmitting(true);
    setCouponMessage(null);

    const result = await applyCoupon(couponInput.trim().toUpperCase(), isAuthenticated);
    setCouponSubmitting(false);

    if (result.success) {
      setCouponMessage({ type: 'success', text: result.message || 'Coupon applied!' });
      setCouponInput('');
      addToast('Promotional coupon applied to your order', 'success');
    } else {
      setCouponMessage({ type: 'error', text: result.error || 'Invalid or expired coupon' });
      addToast(result.error || 'Invalid or expired coupon', 'error');
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponSubmitting(true);
    await removeCoupon(isAuthenticated);
    setCouponSubmitting(false);
    setCouponMessage(null);
    addToast('Coupon removed from order', 'info');
  };

  // Free shipping threshold calculator (Default: ₹5,000)
  const freeThreshold = 5000;
  const currentTaxable = pricing.taxableAmount || pricing.subtotal || 0;
  const amountNeededForFreeShipping = Math.max(0, freeThreshold - currentTaxable);
  const progressPercent = Math.min(100, Math.round((currentTaxable / freeThreshold) * 100));

  if (!isLoading && items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#FAF8F4] flex items-center justify-center px-4 py-16 text-[#2E2622]">
        <SEO
          title="Shopping Cart | Glassofy"
          description="Your architectural hardware shopping cart. Review premium glass fittings, patch fittings, and order summary."
        />
        <div className="max-w-md w-full text-center bg-white border border-[#DDD8CF] p-8 sm:p-10 rounded-[2px] shadow-sm">
          <div className="w-16 h-16 bg-[#F0EDE8] border border-[#DDD8CF] text-[#2E2622] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-serif font-light text-[#2E2622] mb-2 tracking-tight">Your Cart is Empty</h2>
          <p className="text-[#7A726A] mb-8 text-sm leading-relaxed">
            You have not added any architectural glass fittings to your order yet. Explore our precision-machined catalogue.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[48px] py-3 px-6 rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium hover:bg-[#2E2622] transition-colors"
          >
            <span>Explore Hardware Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-[#2E2622]">
      <SEO
        title="Shopping Cart | Glassofy"
        description="Review your architectural glass hardware selection, calculate GST and freight, and apply trade discount coupons."
      />
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb & Header */}
        <div className="mb-8 pb-6 border-b border-[#DDD8CF]">
          <nav className="text-xs uppercase tracking-[0.08em] text-[#7A726A] mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-[#2E2622] transition-colors">
              Home
            </Link>
            <span className="text-[#DDD8CF]">/</span>
            <span className="text-[#2E2622]">Cart</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">Shopping Bag</h1>
            <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] bg-[#F0EDE8] border border-[#DDD8CF] px-3 py-1 rounded-[2px] self-start sm:self-auto">
              {items.reduce((acc, i) => acc + i.quantity, 0)} item(s) selected
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-[#FAF0EE] border border-[#E8C2BC] rounded-[2px] flex items-center justify-between text-[#A4493D] text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#A4493D]" />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="text-[#A4493D] hover:text-[#7A2A20] p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free Shipping Progress Indicator */}
            <div className="bg-white p-4 sm:p-5 rounded-[2px] border border-[#DDD8CF] shadow-xs">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="flex items-center gap-2 text-[#2E2622]">
                  <Truck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
                  {amountNeededForFreeShipping === 0 ? (
                    <span className="text-[#4F6B4A] font-medium uppercase tracking-[0.04em]">
                      Unlocked FREE Express Delivery
                    </span>
                  ) : (
                    <span>
                      Add <strong className="font-semibold text-[#2E2622]">₹{amountNeededForFreeShipping.toLocaleString('en-IN')}</strong> more for Complimentary Delivery
                    </span>
                  )}
                </span>
                <span className="text-[#7A726A] font-mono text-xs">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#F0EDE8] rounded-[1px] h-1.5 overflow-hidden">
                <div
                  className="bg-[#3A2F2B] h-1.5 rounded-[1px] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-[2px] border border-[#DDD8CF] shadow-xs divide-y divide-[#DDD8CF] overflow-hidden">
              {items.map((item) => {
                const product = item.product || {};
                const rawImage = product.images?.[0] || product.image;
                const imageSrc = rawImage ? getOptimizedImageUrl(rawImage) : null;
                const itemTitle = product.title || product.name || 'Architectural Fitting';

                return (
                  <div
                    key={item._id}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-start sm:items-center min-w-0 flex-1">
                      <div className="w-20 h-20 bg-[#F0EDE8] rounded-[2px] overflow-hidden flex-shrink-0 border border-[#DDD8CF] flex items-center justify-center p-2">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={itemTitle}
                            loading="lazy"
                            width={80}
                            height={80}
                            className="w-full h-full object-contain mix-blend-multiply"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className={`items-center justify-center ${imageSrc ? 'hidden' : 'flex'}`}>
                          <Layers className="w-6 h-6 text-[#7A726A]" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/products/${product.slug || ''}`}
                          className="font-serif text-base sm:text-lg font-normal text-[#2E2622] hover:text-[#7A726A] transition-colors line-clamp-1 block leading-snug"
                        >
                          {itemTitle}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#7A726A]">
                          {item.sku && (
                            <span className="font-mono bg-[#FAF8F4] px-1.5 py-0.5 rounded-[2px] border border-[#DDD8CF] text-[#2E2622] text-[11px]">
                              {item.sku}
                            </span>
                          )}
                          {item.finish && (
                            <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">
                              Finish: {item.finish}
                            </span>
                          )}
                          {item.size && (
                            <span className="text-[11px] text-[#7A726A]">
                              Size: {item.size}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-medium text-[#2E2622] sm:hidden">
                          ₹{item.price?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Price Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-[#DDD8CF]">
                      <div className="hidden sm:block text-right">
                        <div className="text-sm font-medium text-[#2E2622]">
                          ₹{item.price?.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.06em] text-[#7A726A]">each</div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-[#DDD8CF] rounded-[2px] bg-[#FAF8F4] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8] disabled:opacity-30 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-mono font-medium text-[#2E2622] min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                          disabled={item.quantity >= (item.availableStock || 100)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8] disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[5rem]">
                        <div className="font-serif text-base font-medium text-[#2E2622]">
                          ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item._id, product._id, item.variantId, itemTitle)}
                        className="text-[#7A726A] hover:text-[#A4493D] p-2 transition-colors rounded-[2px] hover:bg-[#FAF0EE] min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to="/products"
                className="text-xs uppercase tracking-[0.08em] text-[#7A726A] hover:text-[#2E2622] transition-colors min-h-[44px] flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Continue Shopping</span>
              </Link>
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs uppercase tracking-[0.08em] text-[#A4493D] hover:text-[#7A2A20] transition-colors min-h-[44px] flex items-center"
              >
                Clear Cart
              </button>
            </div>
          </div>

          {/* Right Column: Order Summary & Coupon (Clean Ledger Style) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Coupon Card */}
            <div className="bg-white p-5 rounded-[2px] border border-[#DDD8CF] shadow-xs">
              <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-[#2E2622] flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-[#7A726A]" />
                Apply Trade Coupon
              </h3>

              {coupon ? (
                <div className="flex items-center justify-between bg-[#F2F7F2] border border-[#CFE0CF] p-3 rounded-[2px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4F6B4A]" />
                    <div>
                      <span className="font-mono font-medium text-xs text-[#4F6B4A] uppercase">
                        {coupon.code}
                      </span>
                      <p className="text-[11px] text-[#4F6B4A]">Trade coupon applied</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={couponSubmitting}
                    className="text-xs text-[#A4493D] hover:text-[#7A2A20] font-medium px-2 py-1 rounded-[2px] hover:bg-[#FAF0EE] min-h-[44px] flex items-center"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME10"
                      className="flex-1 px-3 py-2 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-base sm:text-xs font-mono uppercase text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B]"
                    />
                    <button
                      type="submit"
                      disabled={couponSubmitting || !couponInput.trim()}
                      className="px-4 py-2 bg-[#3A2F2B] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] hover:bg-[#2E2622] disabled:opacity-40 transition-colors min-h-[44px]"
                    >
                      {couponSubmitting ? '...' : 'Apply'}
                    </button>
                  </div>

                  {couponMessage && (
                    <p
                      className={`text-xs ${
                        couponMessage.type === 'success' ? 'text-[#4F6B4A]' : 'text-[#A4493D]'
                      }`}
                    >
                      {couponMessage.text}
                    </p>
                  )}

                  {/* Coupon Suggestions */}
                  <div className="pt-2 border-t border-[#DDD8CF]">
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[#7A726A] block mb-1.5 font-medium">
                      Available Offers:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['WELCOME10', 'FLAT500', 'ARCHITECT20'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setCouponInput(code)}
                          className="text-xs bg-[#F0EDE8] hover:bg-[#DDD8CF] font-mono text-[#2E2622] border border-[#DDD8CF] px-2 py-0.5 rounded-[2px] transition-colors"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Financial Summary Breakdown (Ledger Style) */}
            <div className="bg-white p-6 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-4">
              <h3 className="text-base font-serif font-light text-[#2E2622] pb-3 border-b border-[#DDD8CF] tracking-tight">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-[#7A726A]">
                  <span>Subtotal</span>
                  <span className="font-mono text-sm text-[#2E2622]">
                    ₹{pricing.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Applied Discounts breakdown */}
                {pricing.discounts?.map((d, idx) => (
                  <div key={idx} className="flex justify-between text-[#4F6B4A]">
                    <span className="truncate pr-2">{d.label}</span>
                    <span className="font-mono">-₹{d.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {pricing.totalDiscount > 0 && (
                  <div className="flex justify-between text-[#7A726A] pt-1.5 border-t border-dashed border-[#DDD8CF]">
                    <span>Taxable Amount</span>
                    <span className="font-mono text-[#2E2622]">
                      ₹{pricing.taxableAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#7A726A]">
                  <span>GST (18% Architectural Fittings)</span>
                  <span className="font-mono text-[#2E2622]">
                    ₹{pricing.gst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-[#7A726A]">
                  <span>Shipping & Freight</span>
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
              </div>

              {/* Grand Total */}
              <div className="pt-4 border-t border-[#DDD8CF] flex justify-between items-baseline">
                <span className="text-base font-serif font-normal text-[#2E2622]">Grand Total</span>
                <span className="text-2xl font-serif font-light text-[#2E2622] tracking-tight">
                  ₹{pricing.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login?redirect=/checkout');
                  } else {
                    navigate('/checkout');
                  }
                }}
                className="w-full mt-4 min-h-[48px] py-3.5 px-6 bg-[#3A2F2B] hover:bg-[#2E2622] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-[#DDD8CF] grid grid-cols-2 gap-3 text-[11px] text-[#7A726A]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E2622] flex-shrink-0" strokeWidth={1.5} />
                  <span>GST Tax Invoice</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#2E2622] flex-shrink-0" strokeWidth={1.5} />
                  <span>Transit Insurance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
