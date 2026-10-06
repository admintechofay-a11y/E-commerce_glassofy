import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { ToastProvider } from './components/ui';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import PageLoader from './components/common/PageLoader';

// Code-Split Storefront Pages (Lazy Loaded)
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListingPage = lazy(() => import('./pages/ProductListingPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Legal & Information Pages
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ShippingPolicyPage = lazy(() => import('./pages/ShippingPolicyPage'));
const ReturnsPolicyPage = lazy(() => import('./pages/ReturnsPolicyPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

// Code-Split Admin Module Pages (Lazy Loaded)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminDiscountsPage = lazy(() => import('./pages/admin/AdminDiscountsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage'));
const AdminWhatsAppInboxPage = lazy(() => import('./pages/admin/AdminWhatsAppInboxPage'));
const AdminWhatsAppWhitelistPage = lazy(() => import('./pages/admin/AdminWhatsAppWhitelistPage'));

export function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      useCartStore.getState().mergeGuestCartOnLogin();
    } else {
      useCartStore.getState().loadCart(false);
    }
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ToastProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ======================================================== */}
                {/* 1. ADMIN MODULE ROUTES (Guarded by requireRole="ADMIN") */}
                {/* ======================================================== */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminLayout>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route index element={<AdminDashboardPage />} />
                            <Route path="products" element={<AdminProductsPage />} />
                            <Route path="categories" element={<AdminCategoriesPage />} />
                            <Route path="orders" element={<AdminOrdersPage />} />
                            <Route path="users" element={<AdminUsersPage />} />
                            <Route path="discounts" element={<AdminDiscountsPage />} />
                            <Route path="settings" element={<AdminSettingsPage />} />
                            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                            <Route path="whatsapp-inbox" element={<AdminWhatsAppInboxPage />} />
                            <Route path="whatsapp-whitelist" element={<AdminWhatsAppWhitelistPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                          </Routes>
                        </Suspense>
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />

                {/* ======================================================== */}
                {/* 2. CUSTOMER STOREFRONT ROUTES */}
                {/* ======================================================== */}
                <Route
                  path="/*"
                  element={
                    <MainLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/products" element={<ProductListingPage />} />
                          <Route path="/products/:slug" element={<ProductDetailPage />} />
                          <Route path="/cart" element={<CartPage />} />
                          <Route
                            path="/checkout"
                            element={
                              <ProtectedRoute>
                                <CheckoutPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/order-success/:orderId"
                            element={
                              <ProtectedRoute>
                                <OrderSuccessPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orders"
                            element={
                              <ProtectedRoute>
                                <MyOrdersPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orders/:id"
                            element={
                              <ProtectedRoute>
                                <OrderDetailPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                          <Route path="/reset-password" element={<ResetPasswordPage />} />
                          <Route
                            path="/profile"
                            element={
                              <ProtectedRoute>
                                <ProfilePage />
                              </ProtectedRoute>
                            }
                          />
                          {/* Legal & Policy Pages */}
                          <Route path="/about" element={<AboutPage />} />
                          <Route path="/contact" element={<ContactPage />} />
                          <Route path="/shipping" element={<ShippingPolicyPage />} />
                          <Route path="/returns" element={<ReturnsPolicyPage />} />
                          <Route path="/privacy" element={<PrivacyPolicyPage />} />
                          <Route path="/terms" element={<TermsPage />} />
                          {/* Branded 404 Not Found Page */}
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </MainLayout>
                  }
                />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
