import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Truck, Download, Copy, Check, ShoppingBag, Loader2 } from 'lucide-react';
import { fetchOrderById, getInvoiceUrl } from '../api/orderApi';
import SEO from '../components/common/SEO';

export const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await fetchOrderById(orderId);
        if (res.success && res.data?.order) {
          setOrder(res.data.order);
        }
      } catch (err) {
        console.error('Failed to load confirmed order:', err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF8F4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A2F2B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-12 px-4 sm:px-6 lg:px-8 text-[#2E2622]">
      <SEO
        title="Order Confirmed | Glassofy"
        description="Your architectural hardware order has been successfully placed. View your order confirmation number, consignment status, and invoice."
      />
      <div className="max-w-2xl mx-auto">
        {/* Main Success Card */}
        <div className="bg-white rounded-[2px] border border-[#DDD8CF] shadow-xs p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-[#F2F7F2] border border-[#CFE0CF] text-[#4F6B4A] rounded-full flex items-center justify-center mx-auto shadow-xs animate-in zoom-in-75 duration-300">
            <CheckCircle className="w-8 h-8" strokeWidth={1.5} />
          </div>

          <div>
            <span className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] bg-[#F0EDE8] border border-[#DDD8CF] px-3 py-1 rounded-[2px]">
              Order Confirmed
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] mt-4 tracking-tight">
              Thank You for Your Order
            </h1>
            <p className="text-[#7A726A] text-sm max-w-lg mx-auto mt-2 leading-relaxed">
              Your architectural hardware order has been successfully confirmed. An official invoice and tracking link have been dispatched to your email.
            </p>
          </div>

          {/* Order Details Badge */}
          {order && (
            <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-5 max-w-md mx-auto flex flex-col gap-3 text-left text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CF]">
                <span className="text-[#7A726A] uppercase tracking-[0.06em]">Order Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-[#2E2622] text-sm">{order.orderNumber}</span>
                  <button
                    onClick={copyOrderNumber}
                    className="text-[#7A726A] hover:text-[#2E2622] p-1 rounded-[2px]"
                    title="Copy Order Number"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-[#4F6B4A]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A726A]">Payment Settlement</span>
                <span
                  className={`font-medium px-2 py-0.5 rounded-[2px] text-[11px] uppercase tracking-[0.06em] ${
                    order.paymentStatus === 'PAID'
                      ? 'bg-[#F2F7F2] text-[#4F6B4A] border border-[#CFE0CF]'
                      : 'bg-[#FAF8F4] text-[#B08D57] border border-[#DDD8CF]'
                  }`}
                >
                  {order.paymentStatus} ({order.paymentMethod})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A726A]">Fulfillment Status</span>
                <span className="font-medium bg-[#F0EDE8] border border-[#DDD8CF] text-[#2E2622] px-2 py-0.5 rounded-[2px] text-[11px] uppercase tracking-[0.06em]">
                  {order.orderStatus}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-[#DDD8CF]">
                <span className="text-[#7A726A]">Total Amount</span>
                <span className="font-serif text-base text-[#2E2622]">
                  ₹{order.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            {orderId && (
              <a
                href={getInvoiceUrl(orderId)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-[#2E2622] text-xs uppercase tracking-[0.08em] font-medium hover:bg-[#F0EDE8] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#7A726A]" />
                Tax Invoice PDF
              </a>
            )}

            <Link
              to={orderId ? `/orders/${orderId}` : '/orders'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#3A2F2B] hover:bg-[#2E2622] rounded-[2px] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              Track Consignment
            </Link>
          </div>

          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] text-[#7A726A] hover:text-[#2E2622] transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Continue Shopping Hardware
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
