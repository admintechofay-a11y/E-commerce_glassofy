import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Download,
  AlertCircle,
  Truck,
  CheckCircle2,
  XCircle,
  Building,
  MapPin,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { fetchOrderById, cancelOrder, getInvoiceUrl } from '../api/orderApi';
import SEO from '../components/common/SEO';

const TIMELINE_STEPS = [
  { id: 'CONFIRMED', label: 'Order Confirmed', desc: 'Order verified & payment processed' },
  { id: 'PACKED', label: 'Packed & Inspected', desc: 'Quality checked & packed in warehouse' },
  { id: 'SHIPPED', label: 'In Transit', desc: 'Dispatched with logistics carrier' },
  { id: 'DELIVERED', label: 'Delivered', desc: 'Successfully delivered to site' },
];

export const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed site requirements');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await fetchOrderById(id);
      if (res.success && res.data?.order) {
        setOrder(res.data.order);
      } else {
        throw new Error(res.message || 'Order not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    setIsCancelling(true);
    try {
      const res = await cancelOrder(id, cancelReason);
      if (res.success) {
        setShowCancelModal(false);
        await loadOrder();
      } else {
        throw new Error(res.message || 'Failed to cancel order');
      }
    } catch (err) {
      alert(err.message || 'Could not cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF8F4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A2F2B]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF8F4] p-4 text-[#2E2622]">
        <div className="bg-white p-8 rounded-[2px] border border-[#DDD8CF] text-center max-w-md w-full shadow-xs">
          <AlertCircle className="w-10 h-10 text-[#A4493D] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-serif font-light text-[#2E2622] mb-2">Order Not Found</h2>
          <p className="text-xs text-[#7A726A] mb-6 leading-relaxed">
            {error || 'Unable to retrieve order details.'}
          </p>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A2F2B] text-[#FAF8F4] rounded-[2px] text-xs uppercase tracking-[0.08em] font-medium hover:bg-[#2E2622] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Determine current step index in normal tracking timeline
  const isCancelled = order.orderStatus === 'CANCELLED';
  const currentStepIdx = TIMELINE_STEPS.findIndex((s) => s.id === order.orderStatus);
  const canCancel = ['PENDING', 'CONFIRMED', 'PACKED'].includes(order.orderStatus);

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-[#2E2622]">
      <SEO
        title={order ? `Order #${order.orderNumber} Specification` : 'Order Details | Glassofy'}
        description="View architectural hardware line items, shipment tracking details, payment verification, and download official GST tax invoice."
      />
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Top Actions */}
        <div className="pb-6 border-b border-[#DDD8CF]">
          <nav className="text-xs uppercase tracking-[0.08em] text-[#7A726A] mb-3 flex items-center gap-2">
            <Link to="/orders" className="hover:text-[#2E2622] transition-colors">
              My Orders
            </Link>
            <span className="text-[#DDD8CF]">/</span>
            <span className="font-mono text-[#2E2622]">{order.orderNumber}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight flex items-center gap-3">
                Order {order.orderNumber}
              </h1>
              <p className="text-xs text-[#7A726A] mt-1.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={getInvoiceUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-[#2E2622] font-medium text-xs uppercase tracking-[0.08em] hover:bg-[#F0EDE8] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#7A726A]" />
                Tax Invoice PDF
              </a>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FAF0EE] text-[#A4493D] border border-[#E8C2BC] rounded-[2px] font-medium text-xs uppercase tracking-[0.08em] hover:bg-[#F5DBD7] transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="bg-[#FAF0EE] border border-[#E8C2BC] rounded-[2px] p-5 flex items-start gap-4 text-[#A4493D]">
            <XCircle className="w-5 h-5 text-[#A4493D] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif font-medium text-sm text-[#A4493D]">This Order Has Been Cancelled</h3>
              <p className="text-xs text-[#A4493D]/80 mt-1 leading-relaxed">
                Reason: {order.cancelReason || 'Cancelled by customer'}
                {order.cancelledAt &&
                  ` on ${new Date(order.cancelledAt).toLocaleDateString('en-IN')}`}
                . Any reserved stock has been restored.
              </p>
            </div>
          </div>
        )}

        {/* Tracking Timeline */}
        {!isCancelled && (
          <div className="bg-white p-6 sm:p-8 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-6">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2 tracking-tight">
              <Truck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              <span>Consignment Tracking Timeline</span>
            </h2>

            <div className="relative">
              {/* Progress Line */}
              <div className="hidden sm:block absolute top-4 left-8 right-8 h-0.5 bg-[#F0EDE8] -z-0">
                <div
                  className="bg-[#3A2F2B] h-0.5 transition-all duration-500"
                  style={{
                    width: `${Math.max(0, (currentStepIdx / (TIMELINE_STEPS.length - 1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative z-10">
                {TIMELINE_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div
                      key={step.id}
                      className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-2"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-colors ${
                          isCompleted
                            ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                            : 'bg-[#F0EDE8] text-[#7A726A] border border-[#DDD8CF]'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <span
                          className={`block text-xs uppercase tracking-[0.06em] font-medium ${
                            isCurrent
                              ? 'text-[#2E2622]'
                              : isCompleted
                                ? 'text-[#2E2622]'
                                : 'text-[#7A726A]'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[11px] text-[#7A726A] hidden sm:block mt-0.5">
                          {step.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status History Logs */}
            {order.statusHistory?.length > 0 && (
              <div className="pt-4 border-t border-[#DDD8CF]">
                <h4 className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-2">
                  Status Activity Log
                </h4>
                <div className="space-y-1.5">
                  {order.statusHistory.map((h, i) => (
                    <div
                      key={i}
                      className="text-xs text-[#7A726A] flex items-center justify-between"
                    >
                      <span className="text-[#2E2622]">• {h.note || h.status}</span>
                      <span className="text-[#7A726A] text-[11px] font-mono">
                        {new Date(h.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Items Table */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-[2px] border border-[#DDD8CF] shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#DDD8CF] font-serif font-light text-[#2E2622] text-sm tracking-tight">
                Ordered Architectural Hardware ({order.items.length} items)
              </div>

              <div className="divide-y divide-[#DDD8CF]">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-normal text-[#2E2622] text-sm">{item.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#7A726A]">
                        {item.code && (
                          <span className="font-mono bg-[#FAF8F4] text-[#2E2622] px-1.5 py-0.5 rounded-[2px] border border-[#DDD8CF] text-[11px]">
                            {item.code}
                          </span>
                        )}
                        {item.finish && (
                          <span className="text-[11px] uppercase tracking-[0.06em] text-[#7A726A]">
                            Finish: {item.finish}
                          </span>
                        )}
                        {item.size && (
                          <span className="text-[11px] text-[#7A726A]">
                            Size: {item.size}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs text-[#2E2622]">
                        ₹{item.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[#7A726A] text-[11px] mt-0.5">
                        {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & B2B Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-2">
                <h3 className="text-[11px] font-medium text-[#7A726A] uppercase tracking-[0.08em] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2E2622]" />
                  Delivery Address
                </h3>
                <div className="text-xs text-[#2E2622] space-y-0.5 leading-relaxed">
                  <div className="font-medium text-[#2E2622]">{order.shippingAddress.fullName}</div>
                  <div>{order.shippingAddress.line1}</div>
                  {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                    {order.shippingAddress.pincode}
                  </div>
                  <div className="text-[#7A726A] pt-1">Phone: {order.shippingAddress.phone}</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-2">
                <h3 className="text-[11px] font-medium text-[#7A726A] uppercase tracking-[0.08em] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#2E2622]" />
                  Tax & Billing Info
                </h3>
                <div className="text-xs text-[#2E2622] space-y-1">
                  <div>
                    <span className="text-[#7A726A]">Business: </span>
                    <span className="font-medium text-[#2E2622]">
                      {order.businessName || 'Standard Retail Order'}
                    </span>
                  </div>
                  {order.gstNumber && (
                    <div>
                      <span className="text-[#7A726A]">GSTIN: </span>
                      <span className="font-mono text-[#2E2622]">
                        {order.gstNumber}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#7A726A]">Payment: </span>
                    <span className="font-medium uppercase tracking-[0.04em]">
                      {order.paymentMethod} ({order.paymentStatus})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Breakdown (Ledger) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[2px] border border-[#DDD8CF] shadow-xs space-y-4">
              <h3 className="text-base font-serif font-light text-[#2E2622] pb-3 border-b border-[#DDD8CF] tracking-tight">
                Payment Breakdown
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-[#7A726A]">
                  <span>Subtotal</span>
                  <span className="font-mono text-sm text-[#2E2622]">
                    ₹{order.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {order.pricingBreakdown?.discounts?.map((d, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-[#4F6B4A] font-medium"
                  >
                    <span className="truncate pr-2">{d.label}</span>
                    <span className="font-mono">-₹{d.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {order.discount > 0 && !order.pricingBreakdown?.discounts?.length && (
                  <div className="flex justify-between text-[#4F6B4A] font-medium">
                    <span>Discount Applied</span>
                    <span className="font-mono">
                      -₹{order.discount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#7A726A]">
                  <span>GST (18% Architectural Fittings)</span>
                  <span className="font-mono text-[#2E2622]">
                    ₹{(order.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-[#7A726A]">
                  <span>Shipping Fee</span>
                  <span>
                    {order.shippingFee === 0 ? (
                      <span className="text-[#4F6B4A] font-medium uppercase tracking-[0.06em] text-[11px] bg-[#F2F7F2] border border-[#CFE0CF] px-2 py-0.5 rounded-[2px]">
                        FREE
                      </span>
                    ) : (
                      <span className="font-mono text-[#2E2622]">
                        ₹{order.shippingFee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#DDD8CF] flex justify-between items-baseline">
                  <span className="text-base font-serif font-normal text-[#2E2622]">Grand Total</span>
                  <span className="text-2xl font-serif font-light text-[#2E2622] tracking-tight">
                    ₹{order.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Order Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-[#2E2622]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[2px] max-w-md w-full p-6 shadow-xl border border-[#DDD8CF] space-y-4 text-[#2E2622]">
              <div className="flex items-center gap-3 text-[#A4493D]">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-serif font-normal text-lg text-[#2E2622]">Cancel Order?</h3>
              </div>
              <p className="text-xs text-[#7A726A] leading-relaxed">
                Are you sure you want to cancel order <strong>{order.orderNumber}</strong>? Any
                reserved hardware stock will be immediately restored.
              </p>

              <div>
                <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                  Cancellation Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                >
                  <option value="Changed site requirements">Changed site requirements</option>
                  <option value="Ordered incorrect size or finish">
                    Ordered incorrect size or finish
                  </option>
                  <option value="Project delay / postponed">Project delay / postponed</option>
                  <option value="Found alternative item">Found alternative item</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-[2px] text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8]"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-[2px] text-xs uppercase tracking-[0.08em] font-medium text-[#FAF8F4] bg-[#A4493D] hover:bg-[#7A2A20] transition-colors"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
