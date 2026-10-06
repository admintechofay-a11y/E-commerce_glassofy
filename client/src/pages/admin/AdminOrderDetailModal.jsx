import React, { useState } from 'react';
import {
  X,
  Printer,
  Clock,
  CheckCircle,
  Truck,
  Package,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Button, Badge, ConfirmDialog, useToast } from '../../components/ui';

export const AdminOrderDetailModal = ({ isOpen, onClose, order, onOrderUpdated }) => {
  const { addToast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(order?.orderStatus || 'CONFIRMED');
  const [statusNote, setStatusNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || '');

  // Refund / Cancel State
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  if (!isOpen || !order) return null;

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      await adminApi.updateOrderStatus(order._id, newStatus, statusNote, trackingNumber);
      addToast(`Order status updated to ${newStatus}`, 'success');
      setStatusNote('');
      onOrderUpdated?.();
    } catch (err) {
      console.error('Failed to update order status:', err);
      addToast(err?.message || 'Failed to update order status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmCancelRefund = async () => {
    setIsRefunding(true);
    try {
      await adminApi.refundOrCancelOrder(
        order._id,
        order.paymentStatus === 'PAID' ? 'CANCEL_AND_REFUND' : 'CANCEL',
        cancelReason || 'Cancelled by Store Administrator'
      );
      addToast('Order cancelled and inventory stock restored successfully', 'success');
      setIsCancelConfirmOpen(false);
      onOrderUpdated?.();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      addToast(err?.message || 'Failed to cancel order', 'error');
    } finally {
      setIsRefunding(false);
    }
  };

  const handlePrintInvoice = () => {
    const invoiceUrl = `${import.meta.env.VITE_API_URL || '/api'}/orders/${order._id}/invoice`;
    window.open(invoiceUrl, '_blank');
  };

  const pricing = order.pricingBreakdown || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl z-10 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DDD8CF] flex items-center justify-between bg-[#F0EDE8]/50">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-light text-[#2E2622]">
                  Order {order.orderNumber}
                </h2>
                <Badge
                  variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {order.paymentStatus}
                </Badge>
                <span className="px-2 py-0.5 rounded-[2px] font-mono text-[10px] bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF]">
                  {order.orderStatus}
                </span>
              </div>
              <p className="text-xs text-[#7A726A] mt-0.5 font-mono">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              className="text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-[#3A2F2B]" />
              <span>Print Invoice</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#7A726A] hover:text-[#2E2622] rounded-[2px] hover:bg-[#DDD8CF]/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px]">
              <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold mb-2">
                Customer Profile
              </h4>
              <p className="font-medium text-[#2E2622] text-sm">
                {order.user?.fullName || order.shippingAddress?.fullName || 'Guest Customer'}
              </p>
              <p className="text-[#7A726A] mt-1">{order.user?.email || 'No email'}</p>
              <p className="text-[#7A726A] font-mono mt-0.5">
                {order.user?.mobile || order.shippingAddress?.phone || 'No phone'}
              </p>
              {order.businessName && (
                <div className="mt-2 pt-2 border-t border-[#DDD8CF]">
                  <p className="text-[#2E2622] font-medium">{order.businessName}</p>
                  <p className="text-[10px] text-[#7A726A] font-mono">GSTIN: {order.gstNumber}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px]">
              <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold mb-2">
                Shipping Address
              </h4>
              <p className="font-medium text-[#2E2622]">{order.shippingAddress?.fullName}</p>
              <p className="text-[#7A726A] mt-0.5 leading-relaxed">
                {order.shippingAddress?.line1}
                {order.shippingAddress?.line2 && `, ${order.shippingAddress.line2}`}
                <br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state} -{' '}
                {order.shippingAddress?.pincode}
              </p>
              <p className="text-[#7A726A] font-mono mt-1">Phone: {order.shippingAddress?.phone}</p>
            </div>

            <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px]">
              <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold mb-2">
                Payment Details
              </h4>
              <p className="text-[#7A726A]">
                Method:{' '}
                <span className="font-medium text-[#2E2622] font-mono">{order.paymentMethod}</span>
              </p>
              <p className="text-[#7A726A] mt-1">
                Status:{' '}
                <span
                  className={
                    order.paymentStatus === 'PAID'
                      ? 'text-[#4F6B4A] font-medium'
                      : 'text-[#B08D57] font-medium'
                  }
                >
                  {order.paymentStatus}
                </span>
              </p>
              {order.razorpayPaymentId && (
                <p className="text-[10px] text-[#7A726A] font-mono mt-1 truncate">
                  Payment ID: {order.razorpayPaymentId}
                </p>
              )}
            </div>
          </div>

          {/* Ordered Line Items Table */}
          <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] overflow-hidden">
            <div className="p-3 bg-[#F0EDE8]/60 border-b border-[#DDD8CF]">
              <h4 className="text-xs font-mono uppercase tracking-[0.08em] text-[#2E2622] font-semibold">
                Order Items ({order.items?.length || 0})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#2E2622]">
                <thead>
                  <tr className="border-b border-[#DDD8CF] text-[10px] uppercase font-mono tracking-[0.08em] text-[#7A726A] bg-[#F0EDE8]/30">
                    <th className="p-3">Item Details</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Finish / Size</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8CF]">
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F0EDE8]/40">
                      <td className="p-3">
                        <p className="font-medium text-[#2E2622]">{item.title}</p>
                        {item.code && (
                          <p className="text-[10px] text-[#7A726A] font-mono">{item.code}</p>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[#7A726A]">{item.sku || '-'}</td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] text-[#2E2622]">
                          {item.finish || 'CP'} • {item.size || 'Standard'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-medium text-[#2E2622]">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-right font-mono text-[#7A726A]">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-[#2E2622]">
                        {formatCurrency(item.subtotal || item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Summary */}
          <div className="flex flex-col sm:flex-row justify-end">
            <div className="sm:w-80 p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] space-y-2 font-mono text-xs">
              <div className="flex justify-between text-[#7A726A]">
                <span>Subtotal:</span>
                <span className="text-[#2E2622]">{formatCurrency(pricing.subtotal || order.subtotal)}</span>
              </div>
              {(pricing.totalDiscount > 0 || order.discount > 0) && (
                <div className="flex justify-between text-[#4F6B4A]">
                  <span>Discounts Applied:</span>
                  <span>- {formatCurrency(pricing.totalDiscount || order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#7A726A]">
                <span>Taxable Amount:</span>
                <span className="text-[#2E2622]">{formatCurrency(pricing.taxableAmount || order.total - (order.tax || 0))}</span>
              </div>
              <div className="flex justify-between text-[#7A726A]">
                <span>GST (18%):</span>
                <span className="text-[#2E2622]">{formatCurrency(pricing.gst || order.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-[#7A726A]">
                <span>Shipping:</span>
                <span className="text-[#2E2622]">
                  {pricing.shipping === 0 || order.shippingFee === 0
                    ? 'FREE'
                    : formatCurrency(pricing.shipping || order.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-serif font-medium text-[#2E2622] pt-2 border-t border-[#DDD8CF]">
                <span>Grand Total:</span>
                <span>{formatCurrency(pricing.grandTotal || order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status Progression Workflow Form */}
          <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
              Advance Order Workflow
            </h4>
            <form onSubmit={handleUpdateStatus} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-[#7A726A] mb-1">Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PACKED">PACKED</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-[#7A726A] mb-1">
                  Courier / Tracking #
                </label>
                <input
                  type="text"
                  placeholder="e.g. DTDC-881920"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                />
              </div>

              <div className="sm:col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-[#7A726A] mb-1">Internal Log Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Handed over to courier driver..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isUpdatingStatus}
                  className="text-xs flex items-center gap-1.5 whitespace-nowrap h-9"
                >
                  {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Status</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Status History Timeline */}
          {order.statusHistory?.length > 0 && (
            <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
                Status History & Activity Log
              </h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDD8CF]">
                {order.statusHistory.map((step, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#3A2F2B] ring-4 ring-[#FAF8F4]" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium text-[#2E2622] text-xs">{step.status}</span>
                      <span className="text-[10px] text-[#7A726A] font-mono">
                        {new Date(step.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {step.note && <p className="text-[#7A726A] text-xs mt-0.5">{step.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destructive Refund / Cancel Section */}
          {order.orderStatus !== 'CANCELLED' && (
            <div className="p-4 bg-[#A4493D]/5 border border-[#A4493D]/20 rounded-[2px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-medium text-[#A4493D] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cancel or Refund Order</span>
                </h4>
                <p className="text-[11px] text-[#7A726A] mt-0.5">
                  Cancelling an order automatically restores all reserved variant stock back to
                  inventory.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="text-xs text-[#A4493D] hover:text-[#FAF8F4] hover:bg-[#A4493D] border-[#A4493D]/40 whitespace-nowrap"
              >
                Cancel & Refund Order
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Refund / Cancel Dialog */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancelRefund}
        title={`Cancel Order ${order.orderNumber}?`}
        message="This action will cancel the order, mark payment as refunded, and restore reserved product stock back to active inventory."
        confirmText="Confirm Refund & Cancellation"
        confirmVariant="danger"
        isLoading={isRefunding}
      />
    </div>
  );
};

export default AdminOrderDetailModal;
