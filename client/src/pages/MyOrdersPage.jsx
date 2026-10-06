import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Calendar,
  ChevronRight,
  Download,
  ShoppingBag,
  Loader2,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from 'lucide-react';
import { fetchMyOrders, getInvoiceUrl } from '../api/orderApi';
import SEO from '../components/common/SEO';

const getStatusBadge = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        bg: 'bg-[#F0EDE8] text-[#2E2622] border-[#DDD8CF]',
        icon: Clock,
      };
    case 'PACKED':
      return {
        label: 'Packed & Inspected',
        bg: 'bg-[#FAF8F4] text-[#B08D57] border-[#DDD8CF]',
        icon: Package,
      };
    case 'SHIPPED':
      return {
        label: 'Shipped in Transit',
        bg: 'bg-[#F0EDE8] text-[#3A2F2B] border-[#DDD8CF]',
        icon: Truck,
      };
    case 'DELIVERED':
      return {
        label: 'Delivered',
        bg: 'bg-[#F2F7F2] text-[#4F6B4A] border-[#CFE0CF]',
        icon: CheckCircle,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        bg: 'bg-[#FAF0EE] text-[#A4493D] border-[#E8C2BC]',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        bg: 'bg-[#FAF8F4] text-[#7A726A] border-[#DDD8CF]',
        icon: Clock,
      };
  }
};

export const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const res = await fetchMyOrders(page, 10);
        if (res.success && res.data) {
          setOrders(res.data.orders || []);
          setTotalPages(res.data.pagination?.pages || 1);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [page]);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE')
      return ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED'].includes(order.orderStatus);
    if (filter === 'DELIVERED') return order.orderStatus === 'DELIVERED';
    if (filter === 'CANCELLED') return order.orderStatus === 'CANCELLED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-[#2E2622]">
      <SEO
        title="Order History & Invoices | Glassofy"
        description="Track consignment shipments, download official GST tax invoices, and inspect order status for your Glassofy purchases."
      />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-[#DDD8CF]">
          <nav className="text-xs uppercase tracking-[0.08em] text-[#7A726A] mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-[#2E2622] transition-colors">
              Home
            </Link>
            <span className="text-[#DDD8CF]">/</span>
            <span className="text-[#2E2622]">My Orders</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">Order Archive</h1>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] hover:text-[#2E2622] transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Browse Catalogue</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 pb-4 overflow-x-auto border-b border-[#DDD8CF] mb-6">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'ACTIVE', label: 'In Progress' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-[2px] text-xs uppercase tracking-[0.08em] font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                  : 'bg-[#FAF8F4] text-[#7A726A] hover:text-[#2E2622] border border-[#DDD8CF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#3A2F2B]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[2px] border border-[#DDD8CF] shadow-xs max-w-md mx-auto my-8">
            <Package className="w-12 h-12 text-[#7A726A] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-serif font-light text-[#2E2622] mb-1">No Orders Found</h3>
            <p className="text-xs text-[#7A726A] mb-6 leading-relaxed">
              You haven't placed any architectural hardware orders matching this filter.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A2F2B] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] hover:bg-[#2E2622] transition-colors"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const badge = getStatusBadge(order.orderStatus);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-[2px] border border-[#DDD8CF] shadow-xs p-5 sm:p-6 hover:border-[#7A726A] transition-colors space-y-4"
                >
                  {/* Order Top Meta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DDD8CF] gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-medium text-xs text-[#2E2622]">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[#7A726A] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] font-medium px-2.5 py-0.5 rounded-[2px] border ${badge.bg}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2 max-w-[70%]">
                          <span className="font-normal text-[#2E2622] truncate">
                            {item.title}
                          </span>
                          {item.finish && (
                            <span className="bg-[#F0EDE8] text-[#7A726A] px-1.5 py-0.5 rounded-[2px] text-[10px] uppercase tracking-[0.04em]">
                              {item.finish}
                            </span>
                          )}
                          <span className="text-[#7A726A]">× {item.quantity}</span>
                        </div>
                        <span className="font-mono text-xs text-[#2E2622]">
                          ₹{item.subtotal?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[11px] uppercase tracking-[0.04em] text-[#7A726A] pt-1">
                        + {order.items.length - 3} more item(s)...
                      </p>
                    )}
                  </div>

                  {/* Order Footer Actions */}
                  <div className="pt-4 border-t border-[#DDD8CF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[#7A726A] block">Total Amount</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-serif font-light text-[#2E2622]">
                          ₹{order.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-[#7A726A]">
                          ({order.paymentMethod} • {order.paymentStatus})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getInvoiceUrl(order._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622] bg-[#FAF8F4] hover:bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] transition-colors"
                        title="Download Tax Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-[#7A726A]" />
                        Invoice
                      </a>
                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 text-xs uppercase tracking-[0.08em] font-medium text-[#FAF8F4] bg-[#3A2F2B] hover:bg-[#2E2622] rounded-[2px] transition-colors"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-[2px] border border-[#DDD8CF] text-xs uppercase tracking-[0.08em] font-medium bg-white text-[#2E2622] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-[#7A726A]">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-[2px] border border-[#DDD8CF] text-xs uppercase tracking-[0.08em] font-medium bg-white text-[#2E2622] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
