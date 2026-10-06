import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Loader2, ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import SEO from '../common/SEO';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brass animate-spin" />
        <p className="text-xs uppercase tracking-widest text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <SEO
          title="403 Access Restricted | Glassofy"
          description="Access to this administrative section requires verified credentials."
        />
        <div className="max-w-md w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-8 text-center shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-[2px] bg-[#A4493D]/10 border border-[#A4493D]/30 flex items-center justify-center mx-auto text-[#A4493D]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#A4493D] font-medium font-mono">
              Error 403: Forbidden
            </span>
            <h2 className="font-serif text-2xl font-light text-[#2E2622]">Access Restricted</h2>
            <p className="text-xs text-[#7A726A] leading-relaxed">
              This area is restricted to Glassofy system administrators. Your account ({user?.email}) is authorized as <strong className="text-[#2E2622] uppercase">{user?.role}</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/profile"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] text-[#2E2622] hover:bg-[#DDD8CF] text-xs uppercase tracking-[0.08em] font-medium transition-all min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My Account</span>
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] hover:bg-[#2E2622] text-xs uppercase tracking-[0.08em] font-medium transition-all min-h-[44px]"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
