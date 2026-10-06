import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';
import SEO from '../components/common/SEO';

export const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-14 sm:py-20 text-[#2E2622]">
      <SEO
        title="Privacy Policy | Glassofy Architectural Hardware"
        description="Learn how Glassofy collects, safeguards, and handles your personal and business data in compliance with Indian Information Technology regulations."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Data Governance & Security
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#7A726A]">Effective Date: October 2026</p>
        </div>

        <div className="p-8 sm:p-10 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-8 text-xs sm:text-sm text-[#2E2622] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              1. Information We Collect
            </h2>
            <p className="text-[#7A726A]">
              When you create an account, request a trade quotation, or place an architectural hardware order on Glassofy,
              we collect necessary contact and business credentials including your full name, business entity name,
              Goods and Services Tax (GSTIN) number, corporate billing address, delivery coordinates, contact telephone number,
              and electronic mail address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              2. Commercial Usage of Information
            </h2>
            <p className="text-[#7A726A]">
              Your data is utilized strictly for the execution of commercial transactions:
            </p>
            <ul className="space-y-1.5 text-[#7A726A] pl-4 list-disc">
              <li>Processing hardware purchase orders, consignment packing, and Pan-India logistics dispatch.</li>
              <li>Generating compliant B2B tax invoices reflecting input tax credit (ITC) for your GSTIN.</li>
              <li>Providing real-time order tracking and dispatch alerts via SMS, WhatsApp, and email.</li>
              <li>Administering trade volume discount tiers, custom contract credit, and technical engineering support.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              3. Protection of Financial Credentials
            </h2>
            <p className="text-[#7A726A]">
              Glassofy never stores debit card, credit card, net banking credentials, or UPI PINs on its servers.
              All online digital payments are processed through PCI-DSS Level 1 compliant gateways (Razorpay).
              Data transmission is encrypted end-to-end using Transport Layer Security (TLS 1.3).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-light text-[#2E2622] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7A726A]" strokeWidth={1.5} />
              4. Cookies & Session Management
            </h2>
            <p className="text-[#7A726A]">
              We employ strict, secure <code className="text-[#2E2622] bg-[#F0EDE8] px-1 py-0.5 rounded-[2px]">httpOnly</code> cookies to maintain your authenticated
              session and preserve items in your active architectural hardware cart. We do not sell, rent, or trade your
              commercial information to third-party advertising brokers.
            </p>
          </section>

          <section className="space-y-3 border-t border-[#DDD8CF] pt-6">
            <h2 className="text-base font-serif font-light text-[#2E2622]">5. Contact Data Privacy Officer</h2>
            <p className="text-[#7A726A]">
              For inquiries regarding data retention, rectification, or deletion, please contact our Compliance Officer at{' '}
              <a href="mailto:privacy@glassofy.com" className="text-[#2E2622] underline underline-offset-2 hover:text-[#7A726A]">
                privacy@glassofy.com
              </a>{' '}
              or by postal dispatch to our New Delhi logistics office.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
