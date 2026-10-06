import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Factory, Users, CheckCircle2 } from 'lucide-react';
import SEO from '../components/common/SEO';
import { Button } from '../components/ui';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-14 sm:py-20 text-[#2E2622]">
      <SEO
        title="About Glassofy | Architectural Glass Fittings & Precision Hardware"
        description="Learn about Glassofy, India's premier manufacturer and distributor of architectural glass hardware, heavy shower hinges, and commercial fittings."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Precision Engineering & Craftsmanship
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-light text-[#2E2622] tracking-tight leading-[1.08]">
            Architectural Hardware Built For Enduring Distinction
          </h1>
          <p className="text-sm sm:text-base text-[#7A726A] leading-relaxed max-w-2xl mx-auto pt-2">
            Founded to bridge industrial metallurgical precision with bespoke architectural aesthetics,
            Glassofy manufactures high-performance glass fittings, shower enclosure systems, and heavy-load
            structural brass hardware for luxury residences and commercial developments across India.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622]">
              <Factory className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-serif font-light text-[#2E2622]">Forged Brass & SS 304 Alloys</h2>
            <p className="text-xs text-[#7A726A] leading-relaxed">
              We exclusively utilize high-density forged brass and surgical-grade AISI 304/316 stainless steel,
              guaranteeing zero porosity, zero stress cracking, and exceptional resistance to humid and coastal climates.
            </p>
          </div>

          <div className="p-8 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622]">
              <Award className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-serif font-light text-[#2E2622]">PVD Nanotech Finishes</h2>
            <p className="text-xs text-[#7A726A] leading-relaxed">
              Our vacuum Physical Vapor Deposition (PVD) finishes in Brushed Brass, Matt Black, Rose Gold, and
              Glossy Chrome undergo 500-hour salt spray endurance tests to ensure lifelong surface integrity.
            </p>
          </div>

          <div className="p-8 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622]">
              <Users className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-serif font-light text-[#2E2622]">Direct Fabricator Support</h2>
            <p className="text-xs text-[#7A726A] leading-relaxed">
              We work directly with glass fabricators, facade engineers, and interior contractors, providing
              custom cutout templates, exact glass thickness tolerances, and tiered trade pricing.
            </p>
          </div>
        </div>

        {/* Manufacturing & Standards */}
        <div className="p-8 sm:p-12 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
              Quality Assurance
            </span>
            <h2 className="text-3xl font-serif font-light text-[#2E2622] tracking-tight">
              Rigorous Cycle & Load Testing
            </h2>
            <p className="text-xs sm:text-sm text-[#7A726A] leading-relaxed">
              Every shower hinge and floor pivot mechanism is cycle-tested for over 100,000 continuous opening
              and closing operations with tempered glass loads up to 65 kg per pair. Integrated high-grade
              EPDM and silicone gaskets prevent glass slippage and stress fractures.
            </p>
            <ul className="space-y-2.5 text-xs text-[#2E2622]">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F6B4A] shrink-0" />
                <span>Certified 100,000-cycle hydraulic and mechanical hinge endurance</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F6B4A] shrink-0" />
                <span>Compatible with 8mm, 10mm, and 12mm monolithic and laminated glass</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F6B4A] shrink-0" />
                <span>Compliant with Indian IS and International DIN architectural standards</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#FAF8F4] p-6 sm:p-8 rounded-[2px] border border-[#DDD8CF] space-y-4">
            <h3 className="text-base font-serif font-light text-[#2E2622]">Trade Inquiries & Consultations</h3>
            <p className="text-xs text-[#7A726A] leading-relaxed">
              Architects and developers requiring customized finish matching, custom dimension brackets, or
              volume project estimates can connect directly with our engineering department.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link to="/products">
                <Button variant="primary" size="md" className="w-full sm:w-auto">
                  Explore Catalogue
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="secondary" size="md" className="w-full sm:w-auto">
                  Contact Technical Team
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
