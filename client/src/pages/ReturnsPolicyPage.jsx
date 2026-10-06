import React from 'react';
import { RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Button } from '../components/ui';

export const ReturnsPolicyPage = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-14 sm:py-20 text-[#2E2622]">
      <SEO
        title="Returns & Replacement Policy | Glassofy Architectural Hardware"
        description="Review Glassofy's 7-day trade returns policy, replacement guidelines for defective glass fittings, and warranty terms."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Quality Guarantee
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">
            Returns & Replacement Policy
          </h1>
          <p className="text-xs text-[#7A726A]">Last updated: October 2026</p>
        </div>

        <div className="p-8 sm:p-10 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-8 text-xs sm:text-sm text-[#2E2622] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              1. 7-Day Replacement Window for Standard Stock
            </h2>
            <p className="text-[#7A726A]">
              Glassofy accepts return requests for uninstalled, unused standard architectural hardware within 7 calendar
              days of delivery. Returned items must remain in their original factory condition with all protective films,
              screws, hex keys, and EPDM gaskets intact inside original packaging.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B08D57]" strokeWidth={1.5} />
              2. Transit Damage & Dead On Arrival (DOA) Procedure
            </h2>
            <p className="text-[#7A726A]">
              In the rare event of transit damage or surface blemishing, please report the issue within 48 hours of
              delivery by emailing photographs of the outer carton and damaged hardware to{' '}
              <a href="mailto:trade@glassofy.com" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A]">
                trade@glassofy.com
              </a>{' '}
              or via telephone at{' '}
              <a href="tel:+919876543210" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A]">
                +91 98765 43210
              </a>
              . We will dispatch an expedited replacement free of cost upon verification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              3. 5-Year Mechanical Warranty
            </h2>
            <p className="text-[#7A726A]">
              All Glassofy heavy-duty shower hinges, floor springs, and patch fittings carry a 5-year replacement
              warranty covering internal spring fatigue, hydraulic leakage, and casting defects under normal installation
              conditions in accordance with recommended glass weight thresholds.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              4. Non-Returnable Items
            </h2>
            <ul className="space-y-2 text-[#7A726A] pl-4 list-disc">
              <li>Hardware that has been drilled, altered, welded, or installed onto glass panels.</li>
              <li>Custom cut-to-length canopy rods, custom PVD color coating batches, and bespoke fabrications.</li>
              <li>Clearance or discontinued items marked as Final Sale at the time of purchase.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4F6B4A]" strokeWidth={1.5} />
              5. Refund Settlement
            </h2>
            <p className="text-[#7A726A]">
              Once the returned consignment is inspected at our warehouse depot, approved refunds are initiated within
              2-3 business days to the original payment method (or credited to your trade account ledger for future orders).
            </p>
          </section>
        </div>

        <div className="text-center pt-4">
          <Link to="/contact">
            <Button variant="secondary" size="md">
              Submit Return Request to Trade Desk
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReturnsPolicyPage;
