import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-[#463930] bg-[#2E2520] text-[#FAF8F4]">
      {/* Editorial Value Proposition Bar */}
      <div className="border-b border-[#463930] py-10 bg-[#362C25]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-left">
          <div className="space-y-1">
            <h5 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#FAF8F4]">Solid Brass & 304 Alloy</h5>
            <p className="text-xs text-[#C4BCB3]">Heavy-duty architectural grade materials</p>
          </div>
          <div className="space-y-1">
            <h5 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#FAF8F4]">Pan-India Logistics</h5>
            <p className="text-xs text-[#C4BCB3]">Crated dispatch and tracking</p>
          </div>
          <div className="space-y-1">
            <h5 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#FAF8F4]">B2B Tax Invoicing</h5>
            <p className="text-xs text-[#C4BCB3]">18% GST input credit documentation</p>
          </div>
          <div className="space-y-1">
            <h5 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#FAF8F4]">Specification Support</h5>
            <p className="text-xs text-[#C4BCB3]">Engineering sizing and trade guidance</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Col 1: Brand & Atelier */}
        <div className="space-y-3 lg:col-span-1">
          <Link to="/" className="font-serif text-2xl font-light tracking-[-0.02em] text-[#FAF8F4] inline-block hover:opacity-90 transition-opacity">
            GLASSOFY
          </Link>
          <p className="text-xs leading-relaxed text-[#C4BCB3]">
            Precision-engineered architectural hardware, glass connectors, sliding systems, and heavy shower hinges tailored for architects, interior designers, and luxury spaces.
          </p>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#A89F94]">
            Architectural Grade Standards
          </p>
        </div>

        {/* Col 2: Product Lines */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#CDB185] mb-4">
            Collections
          </h4>
          <ul className="space-y-2.5 text-xs uppercase tracking-[0.08em] text-[#C4BCB3]">
            <li>
              <Link to="/products?category=f-brackets-clamps" className="hover:text-white transition-colors">
                F-Brackets & Clamps
              </Link>
            </li>
            <li>
              <Link to="/products?category=shower-hinges" className="hover:text-white transition-colors">
                Shower Hinges
              </Link>
            </li>
            <li>
              <Link to="/products?category=bullet-studs-floor-pivots" className="hover:text-white transition-colors">
                Bullet Studs & Pivots
              </Link>
            </li>
            <li>
              <Link to="/products?category=d-brackets" className="hover:text-white transition-colors">
                D-Brackets
              </Link>
            </li>
            <li>
              <Link to="/products?category=spider-fittings-canopy" className="hover:text-white transition-colors">
                Spider Fittings
              </Link>
            </li>
            <li>
              <Link to="/products" className="text-[#FAF8F4] hover:text-[#CDB185] font-semibold transition-colors flex items-center gap-1">
                All Hardware &rarr;
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Company & Policies */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#CDB185] mb-4">
            Atelier
          </h4>
          <ul className="space-y-2.5 text-xs uppercase tracking-[0.08em] text-[#C4BCB3]">
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                About Glassofy
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">
                Contact & Showroom
              </Link>
            </li>
            <li>
              <Link to="/shipping" className="hover:text-white transition-colors">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link to="/returns" className="hover:text-white transition-colors">
                Returns Policy
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Finishes */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#CDB185] mb-4">
            Finishes
          </h4>
          <ul className="space-y-2 text-xs uppercase tracking-[0.08em] text-[#C4BCB3]">
            <li>Chrome Plate (CP)</li>
            <li>Satin Gold / Brushed Brass</li>
            <li>Matt Black PVD</li>
            <li>Rose Gold Luxury</li>
            <li>Satin Stainless (SS 304)</li>
          </ul>
        </div>

        {/* Col 5: Contact Desk */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#CDB185] mb-4">
            Trade Desk
          </h4>
          <div className="space-y-2.5 text-xs">
            <p className="text-[#C4BCB3]">
              Plot 48, Okhla Ind. Area Phase II, New Delhi - 110020, India
            </p>
            <p>
              <a
                href="tel:+919876543210"
                className="text-[#FAF8F4] hover:text-[#CDB185] transition-colors font-mono uppercase tracking-wider text-xs block"
                title="Call Glassofy Trade Desk"
              >
                +91 98765 43210
              </a>
            </p>
            <p>
              <a
                href="mailto:trade@glassofy.com"
                className="text-[#FAF8F4] hover:text-[#CDB185] transition-colors uppercase tracking-[0.08em] text-xs block"
                title="Email Glassofy Trade Desk"
              >
                trade@glassofy.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Copyright Year Bar */}
      <div className="border-t border-[#463930] py-6 text-center text-[11px] uppercase tracking-[0.08em] text-[#A69B8F]">
        <p>&copy; {new Date().getFullYear()} Glassofy Architectural Hardware. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
