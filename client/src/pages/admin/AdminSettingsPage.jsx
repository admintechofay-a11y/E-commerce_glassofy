import React, { useState, useEffect } from 'react';
import {
  Settings,
  DollarSign,
  Truck,
  Store,
  Mail,
  Save,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Button, Input, Skeleton, useToast } from '../../components/ui';
import SEO from '../../components/common/SEO';

export const AdminSettingsPage = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('financial');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Financial & Shipping
  const [gstRate, setGstRate] = useState(18);
  const [shippingFee, setShippingFee] = useState(250);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);

  // Store Details
  const [storeName, setStoreName] = useState('Glassofy Architectural Hardware');
  const [supportEmail, setSupportEmail] = useState('support@glassofy.com');
  const [supportPhone, setSupportPhone] = useState('+91 98200 12345');
  const [address, setAddress] = useState('Plot 42, Industrial Area, Phase II, Pune - 411013');
  const [gstin, setGstin] = useState('27AAACG1234F1Z5');

  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState({
    orderConfirmationSubject: 'Order Confirmed - Glassofy Architectural Hardware #{{orderNumber}}',
    orderConfirmationBody:
      'Dear {{customerName}},\n\nThank you for your order #{{orderNumber}}. Your payment has been received and our warehouse is preparing your hardware items for dispatch.\n\nTotal Paid: ₹{{grandTotal}}\nDelivery Address: {{shippingAddress}}\n\nThank you for partnering with Glassofy.',
    orderShippedSubject: 'Dispatched: Your Glassofy Order #{{orderNumber}} is on the way',
    orderShippedBody:
      'Dear {{customerName}},\n\nYour order #{{orderNumber}} has been dispatched via {{courier}} with tracking number: {{trackingNumber}}.\n\nYou can track your shipment online or contact our dispatch team for urgent site logistics.',
    passwordResetSubject: 'Reset Your Glassofy Account Password',
    passwordResetBody:
      'Hello {{customerName}},\n\nA password reset request was initiated for your Glassofy account. Click the secure link below to choose a new password:\n\n{{resetUrl}}\n\nIf you did not request this, you can safely ignore this email.',
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSettings();
      if (res?.data) {
        const { pricing, storeDetails, emailTemplates: templates } = res.data;
        if (pricing) {
          setGstRate(pricing.gstRate ?? 18);
          setShippingFee(pricing.flatShippingRate ?? 250);
          setFreeShippingThreshold(pricing.freeShippingThreshold ?? 5000);
        }
        if (storeDetails) {
          setStoreName(storeDetails.storeName || storeName);
          setSupportEmail(storeDetails.supportEmail || supportEmail);
          setSupportPhone(storeDetails.supportPhone || supportPhone);
          setAddress(storeDetails.address || address);
          setGstin(storeDetails.gstin || gstin);
        }
        if (templates) {
          setEmailTemplates((prev) => ({ ...prev, ...templates }));
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err?.message || 'Unable to load store settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        gstRate: Number(gstRate),
        flatShippingRate: Number(shippingFee),
        freeShippingThreshold: Number(freeShippingThreshold),
        storeDetails: {
          storeName,
          supportEmail,
          supportPhone,
          address,
          gstin,
        },
        emailTemplates,
      };

      await adminApi.updateSettings(payload);
      addToast('System settings and shipping rules saved successfully', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast(err?.message || 'Failed to update settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-charcoal" />
        <Skeleton className="h-96 rounded-2xl bg-charcoal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Store Settings | Admin | Glassofy"
        description="Configure global store options, tax rates, shipping rules, and email templates for the Glassofy architectural platform."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            Platform Settings & Rules
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Global tax rules, delivery fee thresholds, store identity, and notification copy.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Changes</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDD8CF]">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'financial'
              ? 'border-[#3A2F2B] text-[#2E2622]'
              : 'border-transparent text-[#7A726A] hover:text-[#2E2622]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Taxes & Shipping Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('store')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'store'
              ? 'border-[#3A2F2B] text-[#2E2622]'
              : 'border-transparent text-[#7A726A] hover:text-[#2E2622]'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Store Identity & Contacts</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'email'
              ? 'border-[#3A2F2B] text-[#2E2622]'
              : 'border-transparent text-[#7A726A] hover:text-[#2E2622]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Templates</span>
        </button>
      </div>

      {/* Tab 1: Financial & Shipping */}
      {activeTab === 'financial' && (
        <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] space-y-6 shadow-sm">
          <div className="flex items-start gap-3 p-3.5 bg-[#F0EDE8]/60 border border-[#DDD8CF] rounded-[2px]">
            <Info className="w-4 h-4 text-[#3A2F2B] shrink-0 mt-0.5" />
            <p className="text-xs text-[#2E2622] leading-relaxed">
              These rules directly dictate the server-side discount engine and checkout pricing
              breakdown. Changing the GST rate or shipping thresholds applies instantly to all new
              orders.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <Input
                label="GST Tax Rate (%) *"
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                required
              />
              <span className="text-[11px] text-[#7A726A] mt-1 block">
                Standard architectural hardware GST is 18%.
              </span>
            </div>

            <div>
              <Input
                label="Flat Delivery Fee (₹) *"
                type="number"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                required
              />
              <span className="text-[11px] text-[#7A726A] mt-1 block">
                Fee charged when taxable subtotal is below threshold.
              </span>
            </div>

            <div>
              <Input
                label="Free Shipping Threshold (₹) *"
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                required
              />
              <span className="text-[11px] text-[#7A726A] mt-1 block">
                Orders equal or exceeding this qualify for FREE delivery.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Store Details */}
      {activeTab === 'store' && (
        <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand / Store Name *"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
            <Input
              label="Registered GSTIN *"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              required
            />
            <Input
              label="Customer Support Email *"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              required
            />
            <Input
              label="Help Desk Contact Phone *"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
              Office / Central Dispatch Depot Address
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-3 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Email Notification Templates */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Order Confirmation */}
          <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] space-y-3 shadow-sm">
            <h3 className="text-sm font-serif font-medium text-[#2E2622] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#3A2F2B]" />
              <span>Order Confirmation Template</span>
            </h3>
            <Input
              label="Subject Line"
              value={emailTemplates.orderConfirmationSubject}
              onChange={(e) =>
                setEmailTemplates({
                  ...emailTemplates,
                  orderConfirmationSubject: e.target.value,
                })
              }
            />
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Email Body</label>
              <textarea
                rows={5}
                value={emailTemplates.orderConfirmationBody}
                onChange={(e) =>
                  setEmailTemplates({
                    ...emailTemplates,
                    orderConfirmationBody: e.target.value,
                  })
                }
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-3 text-xs text-[#2E2622] font-mono focus:outline-none focus:border-[#3A2F2B] leading-relaxed"
              />
            </div>
            <p className="text-[10px] text-[#7A726A] font-mono">
              Available tags: &#123;&#123;orderNumber&#125;&#125;, &#123;&#123;customerName&#125;&#125;,
              &#123;&#123;grandTotal&#125;&#125;, &#123;&#123;shippingAddress&#125;&#125;
            </p>
          </div>

          {/* Order Shipped */}
          <div className="p-6 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] space-y-3 shadow-sm">
            <h3 className="text-sm font-serif font-medium text-[#2E2622] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#3A2F2B]" />
              <span>Order Dispatched Notification</span>
            </h3>
            <Input
              label="Subject Line"
              value={emailTemplates.orderShippedSubject}
              onChange={(e) =>
                setEmailTemplates({
                  ...emailTemplates,
                  orderShippedSubject: e.target.value,
                })
              }
            />
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Email Body</label>
              <textarea
                rows={4}
                value={emailTemplates.orderShippedBody}
                onChange={(e) =>
                  setEmailTemplates({
                    ...emailTemplates,
                    orderShippedBody: e.target.value,
                  })
                }
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-3 text-xs text-[#2E2622] font-mono focus:outline-none focus:border-[#3A2F2B] leading-relaxed"
              />
            </div>
            <p className="text-[10px] text-[#7A726A] font-mono">
              Available tags: &#123;&#123;orderNumber&#125;&#125;, &#123;&#123;customerName&#125;&#125;,
              &#123;&#123;trackingNumber&#125;&#125;, &#123;&#123;courier&#125;&#125;
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
