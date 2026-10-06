import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { fetchCategories, fetchSearchSuggestions } from '../../api/catalogApi';
import { useToast } from '../ui';
import {
  Menu,
  X,
  Search,
  LogOut,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchInputRef = useRef(null);
  const drawerRef = useRef(null);
  const totalCartItems = getTotalItems();
  const { addToast } = useToast();

  // Close menu and search on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSuggestions([]);
  }, [location.pathname]);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setSuggestions([]);
      }
    };

    if (menuOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, searchOpen]);

  // Load categories
  const loadHeaderCategories = useCallback(() => {
    fetchCategories()
      .then((data) => {
        if (data && Array.isArray(data)) setCategories(data);
      })
      .catch((_err) => {
        // Fallback gracefully
      });
  }, []);

  useEffect(() => {
    loadHeaderCategories();
  }, [loadHeaderCategories]);

  // Debounced search suggestions
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await fetchSearchSuggestions(searchTerm);
        setSuggestions(results);
      } catch (_err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchOpen(false);
      setMenuOpen(false);
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSelectSuggestion = (slug) => {
    setSearchOpen(false);
    setMenuOpen(false);
    setSearchTerm('');
    navigate(`/products/${slug}`);
  };

  const handleLogout = async () => {
    await logout();
    addToast('You have been logged out securely.', 'info');
    navigate('/login');
  };

  return (
    <>
      {/* Top Announcement Bar in Lighter Dark Theme Tone */}
      <div className="w-full bg-[#342A24] text-[#E8E1D7] border-b border-[#4A3C34] py-2 px-4 text-center text-[10px] sm:text-[11px] tracking-[0.08em] uppercase font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:inline text-[#CDB185] font-normal tracking-wider">
            Solid Brass & SS 304 Atelier
          </span>
          <span className="mx-auto sm:mx-0">
            Complimentary Crated Pan-India Logistics on B2B Specifications &bull; 18% GST Invoices
          </span>
          <Link
            to="/register"
            className="hidden sm:inline text-[#CDB185] hover:text-white underline underline-offset-2 transition-colors"
          >
            Trade Register &rarr;
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-40 w-full border-b border-[#DDD8CF] bg-[#FAF8F4]/95 backdrop-blur-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Hamburger Menu trigger (desktop & mobile) */}
            <div className="flex-1 flex items-center justify-start">
              <button
                onClick={() => setMenuOpen(true)}
                className="group flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:text-[#7A726A] transition-colors py-2 cursor-pointer focus:outline-none"
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
              >
                <Menu className="w-4 h-4 text-[#2E2622] group-hover:text-[#7A726A] transition-colors" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>

            {/* Center: Brand Wordmark */}
            <div className="flex-shrink-0 text-center">
              <Link
                to="/"
                className="font-serif text-2xl sm:text-3xl font-light tracking-[-0.02em] text-[#2E2622] hover:opacity-85 transition-opacity inline-block"
              >
                GLASSOFY
              </Link>
            </div>

            {/* Right: Search, Account, Cart (n) */}
            <div className="flex-1 flex items-center justify-end gap-4 sm:gap-6">
              {/* Search text link */}
              <button
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:text-[#7A726A] transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
                aria-label="Open search"
              >
                <Search className="w-3.5 h-3.5 text-[#2E2622]" />
                <span className="hidden md:inline">Search</span>
              </button>

              {/* Account text link */}
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="hidden sm:inline-block text-[11px] uppercase tracking-[0.08em] font-medium px-2 py-0.5 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] text-[#2E2622] hover:bg-[#DDD8CF] transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:text-[#7A726A] transition-colors truncate max-w-[100px] hidden sm:inline"
                  >
                    {user?.fullName?.split(' ')[0] || 'Account'}
                  </Link>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:text-[#7A726A] transition-colors"
                >
                  Account
                </Link>
              )}

              {/* Cart (n) as text with live count */}
              <Link
                to="/cart"
                className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:text-[#7A726A] transition-colors"
                aria-label={`Shopping Cart with ${totalCartItems} items`}
              >
                Cart ({totalCartItems})
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Full-Height Menu Panel (Luxury Editorial Lookbook Drawer) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#2E2622]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in menu panel from left */}
          <div
            ref={drawerRef}
            className="relative w-full max-w-xl sm:max-w-2xl h-full bg-[#FAF8F4] border-r border-[#DDD8CF] shadow-2xl flex flex-col z-50 overflow-y-auto animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {/* Drawer Header */}
            <div className="p-6 sm:p-8 border-b border-[#DDD8CF] bg-[#F7F2EC] flex items-center justify-between">
              <div>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="font-serif text-2xl sm:text-3xl font-light tracking-[-0.02em] text-[#2E2622] block"
                >
                  GLASSOFY
                </Link>
                <span className="text-[10px] uppercase tracking-[0.1em] text-[#7A6B5D] font-medium block mt-0.5">
                  Architectural Hardware Atelier • Solid Brass & SS 304
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[2px] border border-[#DDD8CF] bg-[#FAF8F4] text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:bg-[#EAE3D9] transition-colors"
                aria-label="Close menu"
              >
                <span>Close</span>
                <span className="text-[9px] font-mono text-[#7A726A] bg-[#F0EDE8] px-1 py-0.5 rounded-[2px] border border-[#DDD8CF] hidden sm:inline">
                  ESC
                </span>
                <X className="w-3.5 h-3.5 text-[#2E2622]" />
              </button>
            </div>

            {/* Drawer Search Input */}
            <div className="p-5 sm:p-6 border-b border-[#DDD8CF] bg-[#F3EDE5]/60">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search catalogue, hardware code, finish, pivot..."
                  className="w-full bg-[#FAF8F4] text-[#2E2622] placeholder-[#8F857B] text-xs pl-9 pr-9 py-3 rounded-[2px] border border-[#DDD8CF] focus:outline-none focus:border-[#3A2F2B] transition-colors"
                />
                <Search className="w-4 h-4 text-[#7A6B5D] absolute left-3 top-3.5 pointer-events-none" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3 top-3 text-[#7A726A] hover:text-[#2E2622]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* In-drawer Search Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-3 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] overflow-hidden divide-y divide-[#DDD8CF]">
                  {suggestions.slice(0, 5).map((item) => (
                    <button
                      key={item._id || item.slug}
                      onClick={() => handleSelectSuggestion(item.slug)}
                      className="w-full p-2.5 flex items-center gap-3 text-left hover:bg-[#F0EDE8] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] p-1 shrink-0 flex items-center justify-center">
                        {item.images?.[0] ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        ) : (
                          <Layers className="w-3.5 h-3.5 text-[#7A726A]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#2E2622] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#7A6B5D] font-mono">
                          {item.code ? `${item.code} • ` : ''}₹{item.basePrice}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7A726A]" />
                    </button>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full py-2.5 text-center text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:bg-[#F0EDE8] transition-colors bg-[#FAF8F4]"
                  >
                    View all matching results &rarr;
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Body: Clean Multi-Section Lookbook Layout */}
            <div className="flex-1 p-6 sm:p-8 space-y-8">
              {/* Category Mega Menu */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#DDD8CF]">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A6B5D]">
                    Architectural Collections
                  </span>
                  <Link
                    to="/products"
                    onClick={() => setMenuOpen(false)}
                    className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] underline underline-offset-4 hover:text-[#5A4333]"
                  >
                    All Products ({categories.reduce((acc, c) => acc + (c.productCount || 0), 0) || 'Catalogue'}) &rarr;
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories.map((cat) => (
                    <Link
                      key={cat._id || cat.slug}
                      to={`/products?category=${cat.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="group p-3 rounded-[2px] bg-[#F0EDE8]/70 hover:bg-[#ECE6DE] border border-[#DDD8CF] transition-all flex items-center justify-between text-xs text-[#2E2622]"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-serif text-sm font-normal text-[#2E2622] group-hover:text-[#5A4333] transition-colors block truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-[#7A6B5D] uppercase tracking-wider block mt-0.5">
                          {cat.productCount !== undefined ? `${cat.productCount} Models` : 'Fittings'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#DDD8CF] group-hover:text-[#2E2622] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Main Storefront & Editorial Links */}
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A6B5D] pb-2 mb-3 border-b border-[#DDD8CF]">
                  Curated & Atelier
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs uppercase tracking-[0.08em]">
                  <Link
                    to="/products?featured=true"
                    onClick={() => setMenuOpen(false)}
                    className="p-2.5 rounded-[2px] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors flex items-center justify-between border border-transparent hover:border-[#DDD8CF]"
                  >
                    <span>Featured Collections</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7A726A]" />
                  </Link>
                  <Link
                    to="/about"
                    onClick={() => setMenuOpen(false)}
                    className="p-2.5 rounded-[2px] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors flex items-center justify-between border border-transparent hover:border-[#DDD8CF]"
                  >
                    <span>About the Atelier</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7A726A]" />
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setMenuOpen(false)}
                    className="p-2.5 rounded-[2px] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors flex items-center justify-between border border-transparent hover:border-[#DDD8CF]"
                  >
                    <span>Showroom & Enquiries</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7A726A]" />
                  </Link>
                  <Link
                    to="/shipping"
                    onClick={() => setMenuOpen(false)}
                    className="p-2.5 rounded-[2px] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors flex items-center justify-between border border-transparent hover:border-[#DDD8CF]"
                  >
                    <span>Shipping & Freight</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7A726A]" />
                  </Link>
                </div>
              </div>

              {/* Account / Trade Section */}
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A6B5D] pb-2 mb-3 border-b border-[#DDD8CF]">
                  B2B Trade & Client Area
                </span>
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-[#F0EDE8] rounded-[2px] border border-[#DDD8CF] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-[#2E2622]">
                          {user?.fullName || user?.name}
                        </p>
                        <p className="text-[10px] text-[#7A726A] font-mono mt-0.5">{user?.email}</p>
                      </div>
                      {user?.role === 'ADMIN' ? (
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] text-[#2E2622]">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-[#E8DDD0] border border-[#D5C7B7] rounded-[2px] text-[#5A4333]">
                          Trade Client
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="p-2.5 text-center text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] hover:bg-[#2E2622] transition-colors col-span-2"
                        >
                          Open Administrator Center
                        </Link>
                      )}
                      <Link
                        to="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="p-2.5 text-center text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] border border-[#DDD8CF] bg-[#FAF8F4] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors"
                      >
                        My Orders
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="p-2.5 text-center text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] border border-[#DDD8CF] bg-[#FAF8F4] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors"
                      >
                        Account Profile
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="p-2.5 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] border border-[#DDD8CF] bg-[#FAF8F4] text-[#A4493D] hover:bg-[#F9ECEB] transition-colors col-span-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Account</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 bg-[#342A24] border border-[#483B32] rounded-[2px] space-y-3 text-[#FAF8F4] shadow-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-serif text-[#FAF8F4] font-medium">Architect & Contractor Accounts</p>
                        <span className="text-[9px] uppercase tracking-wider text-[#CDB185] bg-[#44372F] px-1.5 py-0.5 rounded-[2px]">B2B Priority</span>
                      </div>
                      <p className="text-[11px] text-[#DDD5CA] mt-1 leading-relaxed">
                        Access volume discounts, bulk tier pricing, and automated 18% GST invoices.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="p-2.5 text-center text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] border border-[#DDD5CA]/30 bg-transparent text-[#FAF8F4] hover:bg-white/10 transition-colors"
                      >
                        Client Sign In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setMenuOpen(false)}
                        className="p-2.5 text-center text-xs uppercase tracking-[0.08em] font-medium rounded-[2px] bg-[#CDB185] text-[#2E2622] hover:bg-[#DFC7A2] font-semibold transition-colors"
                      >
                        Trade Register
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-[#DDD8CF] bg-[#F7F2EC] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#7A6B5D]">
              <div className="flex items-center gap-4">
                <span>&copy; {new Date().getFullYear()} Glassofy</span>
                <span>•</span>
                <span>18% GST Tax Invoices</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="tel:+919876543210" className="hover:text-[#2E2622] font-mono font-medium">
                  +91 98765 43210
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Quick Search Modal (when clicking search in header) */}
      {searchOpen && !menuOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-[#2E2622]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CF] mb-4">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A726A]">
                Search Architectural Catalogue
              </span>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-[#7A726A] hover:text-[#2E2622] p-1"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type hardware code, finish, or product name..."
                className="w-full bg-[#FAF8F4] text-[#2E2622] text-sm pl-9 pr-9 py-3 rounded-[2px] border border-[#DDD8CF] focus:outline-none focus:border-[#2E2622]"
              />
              <Search className="w-4 h-4 text-[#7A726A] absolute left-3 top-3.5" />
              {isSearching && (
                <span className="text-[10px] text-[#7A726A] absolute right-3 top-4">Searching...</span>
              )}
            </form>

            {suggestions.length > 0 && (
              <div className="mt-4 border border-[#DDD8CF] rounded-[2px] divide-y divide-[#DDD8CF] max-h-80 overflow-y-auto">
                {suggestions.map((item) => (
                  <button
                    key={item._id || item.slug}
                    onClick={() => handleSelectSuggestion(item.slug)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-[#F0EDE8] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] p-1 shrink-0 flex items-center justify-center">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <Layers className="w-4 h-4 text-[#7A726A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2E2622] truncate">{item.name}</p>
                      <p className="text-[11px] text-[#7A726A]">
                        {item.code ? `${item.code} • ` : ''}
                        {item.finish ? `${item.finish} • ` : ''}₹{item.basePrice}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A726A]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
