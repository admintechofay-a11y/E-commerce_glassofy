import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Tag,
  Settings,
  ShieldAlert,
  MessageSquare,
  PhoneCall,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../ui';

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Products', path: '/admin/products', icon: Package },
  { name: 'Categories', path: '/admin/categories', icon: Layers },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { name: 'Users', path: '/admin/users', icon: Users },
  { name: 'Discounts', path: '/admin/discounts', icon: Tag },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
  { name: 'WhatsApp Inbox', path: '/admin/whatsapp-inbox', icon: MessageSquare },
  { name: 'WhatsApp Whitelist', path: '/admin/whatsapp-whitelist', icon: PhoneCall },
];

export const AdminLayout = ({ children }) => {
  const { addToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Close admin mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Handle ESC key and body scroll lock for admin mobile sidebar
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };

    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    addToast('You have logged out of the admin console.', 'info');
    navigate('/login');
  };

  const isActiveRoute = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#2E2622] flex">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#2E2622]/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#F0EDE8] border-r border-[#DDD8CF] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#DDD8CF] bg-white">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] flex items-center justify-center font-serif text-sm font-light">
              G
            </div>
            <div>
              <span className="font-serif tracking-tight text-[#2E2622] text-sm block leading-none">
                GLASSOFY
              </span>
              <span className="text-[10px] tracking-[0.08em] text-[#7A726A] uppercase font-medium">
                Admin Console
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-[#7A726A] hover:text-[#2E2622] p-1 rounded-[2px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3 mx-3 my-3 bg-white rounded-[2px] border border-[#DDD8CF] flex items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-[#FAF8F4] border border-[#DDD8CF] text-[#2E2622] flex items-center justify-center font-serif text-xs font-medium shrink-0">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#2E2622] truncate">{user?.fullName || 'Admin'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-[#4F6B4A]" />
              <span className="text-[10px] text-[#4F6B4A] uppercase tracking-[0.06em] font-medium">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActiveRoute(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-[2px] text-xs uppercase tracking-[0.08em] font-medium transition-colors ${
                  active
                    ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                    : 'text-[#7A726A] hover:text-[#2E2622] hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#FAF8F4]' : 'text-[#7A726A]'}`} strokeWidth={1.5} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#DDD8CF] space-y-1 bg-white">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A] hover:text-[#2E2622] hover:bg-[#FAF8F4] rounded-[2px] transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-[#2E2622]" />
              <span>Live Store</span>
            </span>
            <ExternalLink className="w-3 h-3 text-[#7A726A]" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.08em] font-medium text-[#A4493D] hover:bg-[#FAF0EE] rounded-[2px] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-[#FAF8F4]/90 backdrop-blur-xs border-b border-[#DDD8CF] px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-[2px] text-[#7A726A] hover:text-[#2E2622] hover:bg-white border border-[#DDD8CF]"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs uppercase tracking-[0.08em] text-[#7A726A] flex items-center gap-2">
              <span>ADMIN</span>
              <span className="text-[#DDD8CF]">/</span>
              <span className="text-[#2E2622] font-medium">
                {navItems.find((item) => isActiveRoute(item))?.name || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[#F2F7F2] border border-[#CFE0CF] text-[#4F6B4A] text-xs uppercase tracking-[0.06em]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B4A]" />
              <span>Console Active</span>
            </div>
            <Link
              to="/"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:text-[#7A726A] flex items-center gap-1.5 border border-[#DDD8CF] px-3 py-1.5 rounded-[2px] bg-white transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden sm:inline">Storefront</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
