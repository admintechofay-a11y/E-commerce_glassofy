import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import SEO from '../components/common/SEO';
import { Button, Input } from '../components/ui';
import { useToast } from '../components/ui';

export const ContactPage = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: 'Trade Hardware Inquiry',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    // Simulate inquiry submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      showToast('Thank you! Your architectural hardware inquiry has been submitted.', 'success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: 'Trade Hardware Inquiry',
        message: '',
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-14 sm:py-20 text-[#2E2622]">
      <SEO
        title="Contact Glassofy | Architectural Glass Hardware Technical Support"
        description="Connect with Glassofy for technical architectural glass fittings inquiries, custom finish matching, trade pricing, and order support."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Direct Commercial Assistance
          </span>
          <h1 className="text-4xl sm:text-5xl font-serif font-light text-[#2E2622] tracking-tight">
            Connect With Our Engineering Team
          </h1>
          <p className="text-sm text-[#7A726A] leading-relaxed max-w-2xl mx-auto">
            Have questions regarding glass cutout specifications, load-bearing capacities, or bulk contract discounts?
            Reach out through our direct hotline, email, or submission form.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Contact Details Card */}
          <div className="lg:col-span-1 p-8 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs space-y-8">
            <h2 className="text-lg font-serif font-light text-[#2E2622] border-b border-[#DDD8CF] pb-4">
              Headquarters & Depot
            </h2>

            <div className="space-y-6 text-xs text-[#2E2622]">
              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#2E2622] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#2E2622] text-sm">Industrial Logistics Hub</h3>
                  <p className="text-[#7A726A] mt-1 leading-relaxed">
                    Plot 48, Okhla Industrial Area, Phase II, New Delhi - 110020, India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Phone className="w-5 h-5 text-[#2E2622] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#2E2622] text-sm">Trade Hotline</h3>
                  <a
                    href="tel:+919876543210"
                    className="text-[#2E2622] hover:text-[#7A726A] font-mono text-sm block mt-1 transition-colors underline underline-offset-2"
                  >
                    +91 98765 43210
                  </a>
                  <p className="text-[11px] text-[#7A726A] mt-0.5">Mon - Sat: 9:30 AM to 7:00 PM IST</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Mail className="w-5 h-5 text-[#2E2622] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#2E2622] text-sm">Electronic Mail</h3>
                  <a
                    href="mailto:trade@glassofy.com"
                    className="text-[#2E2622] hover:text-[#7A726A] text-sm block mt-1 transition-colors underline underline-offset-2"
                  >
                    trade@glassofy.com
                  </a>
                  <a
                    href="mailto:support@glassofy.com"
                    className="text-[#7A726A] hover:text-[#2E2622] text-xs block mt-0.5 transition-colors underline underline-offset-2"
                  >
                    support@glassofy.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-[#2E2622] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#2E2622] text-sm">Operating Hours</h3>
                  <p className="text-[#7A726A] mt-1">Monday – Saturday: 9:30 AM – 7:00 PM IST</p>
                  <p className="text-[#7A726A]">Sunday: Closed (Emergency dispatch on request)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="lg:col-span-2 p-8 sm:p-10 rounded-[2px] bg-white border border-[#DDD8CF] shadow-xs">
            <h2 className="text-xl font-serif font-light text-[#2E2622] mb-1">Send Technical Inquiry</h2>
            <p className="text-xs text-[#7A726A] mb-6">
              Our hardware engineers respond within 4 business hours with pricing, technical cutouts, and CAD details.
            </p>

            {isSuccess && (
              <div className="mb-6 p-4 rounded-[2px] bg-[#F2F7F2] border border-[#CFE0CF] flex items-center gap-3 text-[#4F6B4A] text-xs">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Your message has been received! Our trade manager will contact you promptly.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Architect or Fabricator Name"
                  required
                />
                <Input
                  label="Company / Firm Name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Skyline Glass Solutions"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  required
                />
                <Input
                  label="Mobile Number *"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A]">Inquiry Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3.5 py-2.5 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                >
                  <option value="Trade Hardware Inquiry">Trade Hardware Bulk Inquiry</option>
                  <option value="Custom Finish Matching">Custom PVD Finish Matching</option>
                  <option value="Cutout & Technical Tolerance">Glass Cutout & Technical Tolerances</option>
                  <option value="Existing Order Status">Existing Order & Logistics Inquiry</option>
                  <option value="Dealership & Distribution">Dealership & Distribution Partnership</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.08em] font-medium text-[#7A726A]">Message & Project Details *</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please specify hardware codes, required quantities, glass thickness, and delivery city..."
                  required
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-3.5 text-xs text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <span>Dispatching Inquiry...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Submit Inquiry</span>
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
