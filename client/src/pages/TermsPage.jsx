import React from 'react';
import { FileText, Scale, ShieldAlert, CheckCircle2 } from 'lucide-react';
import SEO from '../components/common/SEO';

export const TermsPage = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-14 sm:py-20 text-[#2E2622]">
      <SEO
        title="Terms of Service | Glassofy Architectural Hardware"
        description="Review commercial terms of service, GST compliance, ordering rules, and warranty terms for Glassofy architectural hardware platform."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Commercial Agreement
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-[#7A726A]">Effective Date: October 2026</p>
        </div>

        <div className="p-8 sm:p-10 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-8 text-xs sm:text-sm text-[#2E2622] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              1. Acceptance of Commercial Terms
            </h2>
            <p className="text-[#7A726A]">
              By accessing, browsing, registering on, or purchasing from Glassofy Architectural Hardware, you acknowledge
              and agree to be bound by these Terms of Service. These terms apply to all fabricators, interior contractors,
              architects, retail purchasers, and trade representatives utilizing the portal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              2. Product Specifications & Tolerances
            </h2>
            <p className="text-[#7A726A]">
              Glassofy hardware is manufactured to precise engineering tolerances for architectural glass applications.
              While finish photography depicts authentic production samples, slight color variations in batch PVD coating
              or brushed hairline textures can occur due to metallurgical grain structure. Fabricators must adhere to our
              prescribed glass hole cutouts, edge distance guidelines, and maximum weight ratings per hinge pair.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4F6B4A]" strokeWidth={1.5} />
              3. Pricing, GST Invoicing & Payment
            </h2>
            <p className="text-[#7A726A]">
              All displayed base prices are exclusive of 18% Goods and Services Tax (GST), which is itemized transparently
              in your final cart breakdown. If you supply a valid GSTIN during account registration or checkout, your
              official downloadable PDF invoice will reflect your input tax credit entitlement under Indian GST regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              4. Limitation of Liability & Installation
            </h2>
            <p className="text-[#7A726A]">
              Glassofy shall not be held liable for damages resulting from improper glass installation, failure to use
              supplied rubber/EPDM cushions, exceeding certified door load weights, or structural masonry deficiencies.
              Installation must be conducted by certified glass technicians following safety glass building codes.
            </p>
          </section>

          <section className="space-y-3 border-t border-[#DDD8CF] pt-6">
            <h2 className="text-base font-serif font-light text-[#2E2622]">5. Governing Law & Jurisdiction</h2>
            <p className="text-[#7A726A]">
              Any dispute arising from or related to the commercial use of this website or hardware supplied by Glassofy
              shall be governed by the laws of India and subject exclusively to the jurisdiction of the competent courts
              in New Delhi, India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
