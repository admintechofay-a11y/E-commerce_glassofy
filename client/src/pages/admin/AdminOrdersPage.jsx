import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Printer,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import {
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Pagination,
  useToast,
} from '../../components/ui';
import AdminOrderDetailModal from './AdminOrderDetailModal';
import SEO from '../../components/common/SEO';

export const AdminOrdersPage = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: orderStatus !== 'ALL' ? orderStatus : undefined,
        paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
      };

      const res = await adminApi.getOrders(params);
      if (res?.data) {
        setOrders(res.data.orders || []);
        setPagination((prev) => ({
          ...prev,
          total: res.data.pagination?.total || 0,
          pages: res.data.pagination?.pages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err?.message || 'Unable to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, orderStatus, paymentStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handlePrintInvoice = (e, orderId) => {
    e.stopPropagation();
    const invoiceUrl = `${import.meta.env.VITE_API_URL || '/api'}/orders/${orderId}/invoice`;
    window.open(invoiceUrl, '_blank');
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Order Fulfillment & Logistics | Admin"
        description="Process orders, update status workflow, generate packing slips, assign BlueDart tracking, and manage returns."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            Order Fulfillment
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Track transactions, advance fulfillment states, inspect invoices, and manage refunds.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchOrders}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#3A2F2B]" />
          <span>Refresh Orders</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#F0EDE8]/60 border border-[#DDD8CF] rounded-[2px] flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#7A726A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] pl-9 pr-4 py-2 text-xs text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B]"
          />
        </div>

        {/* Order Status */}
        <select
          value={orderStatus}
          onChange={(e) => {
            setOrderStatus(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PACKED">PACKED</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {/* Payment Status */}
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="ALL">All Payments</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending / COD</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[2px] bg-[#F0EDE8]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-[#A4493D] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-normal text-[#2E2622] mb-1">Error Loading Orders</h3>
            <p className="text-xs text-[#7A726A] mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="primary" className="text-xs">
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Orders Found"
            description="No orders match your filter criteria or search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
              <thead>
                <tr className="border-b border-[#DDD8CF] text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-mono bg-[#F0EDE8]/60">
                  <th className="p-3.5">Order Number</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Fulfillment Status</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => handleOpenDetail(order)}
                    className="hover:bg-[#F0EDE8]/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-mono font-medium text-[#3A2F2B]">
                      <span>{order.orderNumber}</span>
                    </td>
                    <td className="p-3.5 max-w-[180px]">
                      <p className="font-medium text-[#2E2622] truncate">
                        {order.user?.fullName || order.shippingAddress?.fullName || 'Guest Customer'}
                      </p>
                      <p className="text-[10px] text-[#7A726A] font-mono truncate">
                        {order.user?.email || order.shippingAddress?.phone || ''}
                      </p>
                    </td>
                    <td className="p-3.5 font-mono text-[#7A726A]">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}
                          className="text-[10px] w-fit"
                        >
                          {order.paymentStatus}
                        </Badge>
                        <span className="text-[10px] font-mono text-[#7A726A]">
                          {order.paymentMethod}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-medium border ${
                          order.orderStatus === 'CONFIRMED'
                            ? 'bg-[#4F6B4A]/10 text-[#4F6B4A] border-[#4F6B4A]/20'
                            : order.orderStatus === 'DELIVERED'
                              ? 'bg-[#F0EDE8] text-[#7A726A] border-[#DDD8CF]'
                              : order.orderStatus === 'CANCELLED'
                                ? 'bg-[#A4493D]/10 text-[#A4493D] border-[#A4493D]/20'
                                : 'bg-[#B08D57]/10 text-[#B08D57] border-[#B08D57]/20'
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-medium text-[#2E2622]">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="p-3.5 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenDetail(order)}
                          className="p-1.5 text-[#7A726A] hover:text-[#2E2622] hover:bg-[#DDD8CF]/40 rounded-[2px] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handlePrintInvoice(e, order._id)}
                          className="p-1.5 text-[#7A726A] hover:text-[#3A2F2B] hover:bg-[#DDD8CF]/40 rounded-[2px] transition-colors"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination */}
        {orders.length > 0 && (
          <div className="p-4 border-t border-[#DDD8CF] flex items-center justify-between">
            <span className="text-xs text-[#7A726A] font-mono">
              Showing {orders.length} of {pagination.total} orders
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            />
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AdminOrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        order={selectedOrder}
        onOrderUpdated={() => {
          setIsDetailOpen(false);
          fetchOrders();
        }}
      />
    </div>
  );
};

export default AdminOrdersPage;
