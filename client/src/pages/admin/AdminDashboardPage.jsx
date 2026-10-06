import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Badge, Button, Skeleton } from '../../components/ui';
import SEO from '../../components/common/SEO';

export const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err?.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse text-[#2E2622]">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 bg-[#F0EDE8]" />
          <Skeleton className="h-9 w-24 bg-[#F0EDE8]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[2px] bg-[#F0EDE8]" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-[2px] bg-[#F0EDE8]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-[2px] bg-[#F0EDE8]" />
          <Skeleton className="h-64 rounded-[2px] bg-[#F0EDE8]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white border border-[#DDD8CF] rounded-[2px]">
        <AlertTriangle className="w-10 h-10 text-[#A4493D] mx-auto mb-3" strokeWidth={1.5} />
        <h3 className="font-serif text-lg font-light text-[#2E2622] mb-1">Error Loading Dashboard</h3>
        <p className="text-xs text-[#7A726A] mb-4">{error}</p>
        <Button onClick={fetchDashboardData} variant="primary" className="text-xs">
          Try Again
        </Button>
      </div>
    );
  }

  const { metrics, salesTimeline = [], topProducts = [], recentOrders = [], lowStockProducts = [] } =
    data || {};

  // Find max revenue for SVG bar chart scaling
  const maxDayRevenue = Math.max(...salesTimeline.map((d) => d.revenue || 0), 1000);

  return (
    <div className="space-y-8 text-[#2E2622]">
      <SEO
        title="Admin Dashboard | Control Center"
        description="Live commercial KPI overview, 30-day gross revenue analytics, order volume trends, and low-inventory hardware alerts."
      />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#DDD8CF]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-light text-[#2E2622] tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Real-time business performance, inventory alerts, and 30-day revenue metrics.
          </p>
        </div>
        <Button
          onClick={fetchDashboardData}
          variant="outline"
          className="text-xs uppercase tracking-[0.08em] flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#2E2622]" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs flex flex-col justify-between hover:border-[#2E2622] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#7A726A] uppercase tracking-[0.08em] font-medium">
              30-Day Revenue
            </span>
            <div className="w-7 h-7 rounded-full bg-[#F2F7F2] text-[#4F6B4A] flex items-center justify-center border border-[#CFE0CF]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-serif font-light text-[#2E2622] tracking-tight">
              {formatCurrency(metrics?.totalRevenue)}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[#4F6B4A] mt-1 uppercase tracking-[0.04em] font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Settled</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs flex flex-col justify-between hover:border-[#2E2622] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#7A726A] uppercase tracking-[0.08em] font-medium">
              Total Orders
            </span>
            <div className="w-7 h-7 rounded-full bg-[#F0EDE8] text-[#2E2622] flex items-center justify-center border border-[#DDD8CF]">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-serif font-light text-[#2E2622]">{metrics?.totalOrders || 0}</span>
            <p className="text-[11px] text-[#7A726A] mt-1 uppercase tracking-[0.04em]">All statuses</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs flex flex-col justify-between hover:border-[#2E2622] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#7A726A] uppercase tracking-[0.08em] font-medium">
              Clients
            </span>
            <div className="w-7 h-7 rounded-full bg-[#F0EDE8] text-[#2E2622] flex items-center justify-center border border-[#DDD8CF]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-serif font-light text-[#2E2622]">{metrics?.totalUsers || 0}</span>
            <p className="text-[11px] text-[#7A726A] mt-1 uppercase tracking-[0.04em]">Trade partners</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs flex flex-col justify-between hover:border-[#2E2622] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#7A726A] uppercase tracking-[0.08em] font-medium">
              Live Catalogue
            </span>
            <div className="w-7 h-7 rounded-full bg-[#F0EDE8] text-[#2E2622] flex items-center justify-center border border-[#DDD8CF]">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-serif font-light text-[#2E2622]">
              {metrics?.totalProducts || 0}
            </span>
            <p className="text-[11px] text-[#7A726A] mt-1 uppercase tracking-[0.04em]">Published SKUs</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs flex flex-col justify-between hover:border-[#A4493D] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A4493D] uppercase tracking-[0.08em] font-medium">
              Low Stock Alert
            </span>
            <div className="w-7 h-7 rounded-full bg-[#FAF0EE] text-[#A4493D] flex items-center justify-center border border-[#E8C2BC]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-serif font-light text-[#A4493D]">
              {metrics?.lowStockCount || 0}
            </span>
            <p className="text-[11px] text-[#7A726A] mt-1 font-mono">&lt; 15 units remaining</p>
          </div>
        </div>
      </div>

      {/* 30-Day Revenue Timeline Chart */}
      <div className="p-6 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-serif font-light text-[#2E2622]">
              30-Day Revenue & Sales Velocity
            </h2>
            <p className="text-xs text-[#7A726A]">Daily gross booking value over the past 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-[#7A726A]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[1px] bg-[#3A2F2B] inline-block" /> Daily Revenue
            </span>
          </div>
        </div>

        {/* Visual Responsive Bar Timeline */}
        <div className="h-48 flex items-end gap-1 sm:gap-2 pt-6 border-b border-[#DDD8CF]">
          {salesTimeline.map((item, idx) => {
            const heightPct = Math.max(6, Math.min(100, Math.round((item.revenue / maxDayRevenue) * 100)));
            return (
              <div
                key={item.date || idx}
                className="flex-1 flex flex-col items-center group relative h-full justify-end"
              >
                {/* Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 z-20 pointer-events-none bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-center shadow-md whitespace-nowrap">
                  <p className="text-[10px] text-[#7A726A] font-mono">{item.date}</p>
                  <p className="text-xs font-medium text-[#2E2622]">{formatCurrency(item.revenue)}</p>
                  <p className="text-[10px] text-[#7A726A]">{item.orders} orders</p>
                </div>
                {/* Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-[1px] transition-colors ${
                    item.revenue > 0
                      ? 'bg-[#3A2F2B] hover:bg-[#2E2622]'
                      : 'bg-[#F0EDE8] hover:bg-[#DDD8CF]'
                  }`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-[#7A726A] mt-2 px-1">
          <span>{salesTimeline[0]?.date || '30 days ago'}</span>
          <span className="uppercase tracking-[0.06em]">Last 30 Days</span>
          <span>{salesTimeline[salesTimeline.length - 1]?.date || 'Today'}</span>
        </div>
      </div>

      {/* Two Column Grid: Top Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="p-6 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#DDD8CF]">
            <h2 className="text-base font-serif font-light text-[#2E2622]">Top Products by Revenue</h2>
            <Link
              to="/admin/products"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] hover:text-[#2E2622] flex items-center gap-1"
            >
              <span>View Catalogue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-[#7A726A] py-8 text-center">No sales data recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] hover:border-[#7A726A] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-[2px] bg-[#F0EDE8] text-[#2E2622] font-mono text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-normal text-[#2E2622] truncate">{p.title}</p>
                      <p className="text-[11px] text-[#7A726A] font-mono">{p.count} units sold</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#2E2622]">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="p-6 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#DDD8CF]">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-light text-[#2E2622]">Low Stock Alerts</h2>
              <span className="px-2 py-0.5 rounded-[2px] text-[10px] uppercase tracking-[0.06em] font-medium bg-[#FAF0EE] text-[#A4493D] border border-[#E8C2BC]">
                {lowStockProducts.length} Needs Restock
              </span>
            </div>
            <Link
              to="/admin/products"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] hover:text-[#2E2622] flex items-center gap-1"
            >
              <span>Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#4F6B4A]">
              All inventory levels are healthy!
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((prod) => {
                const totalStock =
                  prod.variants?.reduce((s, v) => s + (v.stock || 0), 0) ?? 0;
                return (
                  <div
                    key={prod._id}
                    className="flex items-center justify-between p-3 rounded-[2px] bg-[#FAF8F4] border border-[#E8C2BC] hover:border-[#A4493D] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-normal text-[#2E2622] truncate">{prod.name}</p>
                      <p className="text-[10px] text-[#7A726A] font-mono">
                        Code: {prod.code} • Finish: {prod.finish || 'CP'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-[2px] text-[11px] font-mono font-medium bg-[#FAF0EE] text-[#A4493D] border border-[#E8C2BC]">
                        {totalStock} in stock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="p-6 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#DDD8CF]">
          <div>
            <h2 className="text-base font-serif font-light text-[#2E2622]">Recent Customer Orders</h2>
            <p className="text-xs text-[#7A726A]">Latest transactions requiring fulfillment</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] hover:text-[#2E2622] flex items-center gap-1"
          >
            <span>All Orders</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-[#7A726A] py-8 text-center">No orders received yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
              <thead>
                <tr className="border-b border-[#DDD8CF] bg-[#F0EDE8] text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">
                  <th className="py-2.5 px-3 font-medium">Order Number</th>
                  <th className="py-2.5 px-3 font-medium">Customer</th>
                  <th className="py-2.5 px-3 font-medium">Date</th>
                  <th className="py-2.5 px-3 font-medium">Payment</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-[#FAF8F4] transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-[#2E2622]">
                      <Link to={`/admin/orders?search=${order.orderNumber}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-[#2E2622] font-normal truncate max-w-[150px]">
                        {order.user?.fullName || 'Guest Customer'}
                      </p>
                      <p className="text-[10px] text-[#7A726A] font-mono truncate max-w-[150px]">
                        {order.user?.email || ''}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#7A726A]">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[2px] text-[10px] uppercase tracking-[0.06em] font-medium border ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-[#F2F7F2] text-[#4F6B4A] border-[#CFE0CF]'
                            : 'bg-[#FAF8F4] text-[#B08D57] border-[#DDD8CF]'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[2px] text-[10px] uppercase tracking-[0.06em] font-medium border ${
                          order.orderStatus === 'CONFIRMED'
                            ? 'bg-[#F0EDE8] text-[#2E2622] border-[#DDD8CF]'
                            : order.orderStatus === 'DELIVERED'
                              ? 'bg-[#F2F7F2] text-[#4F6B4A] border-[#CFE0CF]'
                              : order.orderStatus === 'CANCELLED'
                                ? 'bg-[#FAF0EE] text-[#A4493D] border-[#E8C2BC]'
                                : 'bg-[#FAF8F4] text-[#B08D57] border-[#DDD8CF]'
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-[#2E2622]">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
