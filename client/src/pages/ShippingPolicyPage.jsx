import React from 'react';
import { Truck, ShieldCheck, Clock, MapPin, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Button } from '../components/ui';

export const ShippingPolicyPage = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-14 sm:py-20 text-[#2E2622]">
      <SEO
        title="Shipping & Dispatch Policy | Glassofy Architectural Hardware"
        description="Comprehensive dispatch, delivery timelines, safe wooden crating, and logistics information for Glassofy architectural hardware across India."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Logistics & Freight Standards
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">
            Shipping & Dispatch Policy
          </h1>
          <p className="text-xs text-[#7A726A]">Last updated: October 2026</p>
        </div>

        <div className="p-8 sm:p-10 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-8 text-xs sm:text-sm text-[#2E2622] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              1. Pan-India Dispatch Network
            </h2>
            <p className="text-[#7A726A]">
              Glassofy operates primary fulfillment depots in New Delhi and Mumbai. We partner with premier
              express freight carriers including BlueDart, DTDC Express, and safe pallet transporters for heavy architectural cargo.
              Orders placed before 2:00 PM IST on working business days are packed and dispatched on the same day.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              2. Transit & Delivery Timelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] text-center">
                <span className="text-[#2E2622] font-medium text-base block font-mono">1 – 2 Days</span>
                <span className="text-[11px] text-[#7A726A]">Delhi NCR, Mumbai, Pune</span>
              </div>
              <div className="p-4 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] text-center">
                <span className="text-[#2E2622] font-medium text-base block font-mono">2 – 4 Days</span>
                <span className="text-[11px] text-[#7A726A]">Metro Hubs (BLR, HYD, MAA, CCU)</span>
              </div>
              <div className="p-4 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] text-center">
                <span className="text-[#2E2622] font-medium text-base block font-mono">3 – 6 Days</span>
                <span className="text-[11px] text-[#7A726A]">Tier 2 & Tier 3 Regional Districts</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <Box className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              3. Heavy Hardware Packing & Anti-Scratch Protection
            </h2>
            <p className="text-[#7A726A]">
              All mirror chrome, brushed brass, and PVD finishes are wrapped in peelable protective film, placed
              within individual velvet-lined or foam-cushioned boxes, and crated into heavy reinforced corrugated boxes.
              Cast spider brackets and bulk orders are strapped and corner-protected to eliminate transit shocks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              4. Shipping Charges & Free Delivery Threshold
            </h2>
            <p className="text-[#7A726A]">
              Standard orders below ₹5,000 carry a nominal flat logistics fee of ₹250. Orders with a taxable amount
              exceeding ₹5,000 qualify for complimentary free standard shipping across all serviceable pin codes in India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              5. Real-Time Consignment Tracking
            </h2>
            <p className="text-[#7A726A]">
              Upon shipment, customers receive an automated email notification and WhatsApp update containing the
              air waybill (AWB) and live tracking link. You can also view real-time fulfillment status directly from your
              account under <Link to="/orders" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A]">My Orders</Link>.
            </p>
          </section>
        </div>

        <div className="text-center pt-4">
          <Link to="/contact">
            <Button variant="secondary" size="md">
              Need Expedited Air Freight? Contact Support
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicyPage;
