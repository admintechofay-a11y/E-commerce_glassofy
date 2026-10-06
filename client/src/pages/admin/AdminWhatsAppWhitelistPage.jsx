import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ShieldCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, Badge, ConfirmDialog, useToast, Modal } from '../../components/ui';
import { adminApi } from '../../api/adminApi';
import SEO from '../../components/common/SEO';

export const AdminWhatsAppWhitelistPage = () => {
  const { addToast } = useToast();
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('Lead Fabricator');
  const [businessName, setBusinessName] = useState('');

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Fetch whitelist from backend
  const fetchWhitelist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getWhatsappWhitelist();
      setWhitelist(res?.data?.whitelist || res?.data?.data?.whitelist || res?.whitelist || []);
    } catch (err) {
      console.error('Failed to load whitelist:', err);
      addToast(err?.message || 'Failed to load WhatsApp whitelist', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchWhitelist();
  }, [fetchWhitelist]);

  const handleAddNumber = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      addToast('Name and Mobile number are required', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.addWhatsappWhitelist({
        name: name.trim(),
        mobile: phone.trim(),
        label,
        businessName: businessName.trim(),
      });
      addToast('Mobile number added to WhatsApp whitelist successfully!', 'success');
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setBusinessName('');
      await fetchWhitelist();
    } catch (err) {
      console.error('Failed to add whitelist number:', err);
      addToast(err?.message || err?.response?.data?.message || 'Failed to add number to whitelist', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      setActionLoading(true);
      await adminApi.toggleWhatsappWhitelist(item._id);
      addToast(`Status updated for ${item.mobile}`, 'success');
      await fetchWhitelist();
    } catch (err) {
      console.error('Failed to toggle whitelist status:', err);
      addToast(err?.message || err?.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (item) => {
    setConfirmDialog({
      isOpen: true,
      title: `Remove ${item.name} (${item.mobile})?`,
      message: 'This number will no longer be authorized to upload catalogue items or receive automated broadcasts.',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await adminApi.deleteWhatsappWhitelist(item._id);
          addToast(`${item.name} removed from whitelist`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          await fetchWhitelist();
        } catch (err) {
          console.error('Failed to delete whitelist item:', err);
          addToast(err?.message || err?.response?.data?.message || 'Failed to remove from whitelist', 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filtered = whitelist.filter(
    (w) =>
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.mobile?.includes(search) ||
      w.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      w.label?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SEO
        title="WhatsApp Whitelist | Admin | Glassofy"
        description="Manage authorized dealer and fabricator phone numbers permitted to upload catalogue items via WhatsApp integration."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#DDD8CF]">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            WhatsApp Authorized Whitelist
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Registered fabricators and architects authorized to submit catalogue items via WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchWhitelist}
            disabled={loading}
            className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] border-[#DDD8CF] text-[#2E2622] hover:bg-[#F0EDE8]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] bg-[#3A2F2B] hover:bg-[#2E2622] text-[#FAF8F4]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Number</span>
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[2px] bg-[#4F6B4A]/10 text-[#4F6B4A] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#4F6B4A]">
              Active Security Whitelist Guard
            </p>
            <p className="text-[11px] text-[#7A726A] mt-0.5">
              Only phone numbers actively registered below can upload catalogue photos to create drafts. Unknown senders receive a polite rejection alert.
            </p>
          </div>
        </div>
        <Badge variant="success" className="text-[10px] uppercase tracking-wider shrink-0">
          Enforced
        </Badge>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border border-[#DDD8CF] rounded-[2px] flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#7A726A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search whitelist by name, company, or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] pl-9 pr-4 py-2 text-xs text-[#2E2622] placeholder-[#7A726A]/60 focus:outline-none focus:border-[#3A2F2B] font-mono"
          />
        </div>
      </div>

      {/* Whitelist Table */}
      <div className="bg-white border border-[#DDD8CF] rounded-[4px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
            <thead>
              <tr className="border-b border-[#DDD8CF] text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-medium bg-[#F0EDE8]">
                <th className="p-3.5">Contact Name</th>
                <th className="p-3.5">WhatsApp Mobile</th>
                <th className="p-3.5">Business / Firm</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Date Added</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD8CF]/70">
              {loading && whitelist.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-[#7A726A]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3A2F2B]" />
                    Loading whitelist...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-[#7A726A]">
                    No whitelisted contacts found. Click "Add Number" to authorize a sender.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-[#F0EDE8]/50 transition-colors">
                    <td className="p-3.5 font-medium text-[#2E2622]">{item.name}</td>
                    <td className="p-3.5 font-mono text-[#3A2F2B] font-medium">+{item.mobile}</td>
                    <td className="p-3.5 text-[#7A726A]">{item.businessName || '—'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-[2px] font-mono text-[10px] bg-[#F0EDE8] text-[#7A726A] border border-[#DDD8CF]">
                        {item.label || 'Fabricator'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={item.isActive ? 'success' : 'default'}
                        className="text-[10px] tracking-wider"
                      >
                        {item.isActive ? 'ACTIVE' : 'PAUSED'}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-[#7A726A]">
                      {item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded-[2px] text-[11px] uppercase tracking-[0.05em] text-[#2E2622] hover:bg-[#F0EDE8] font-mono border border-[#DDD8CF] transition-colors"
                        >
                          {item.isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={actionLoading}
                          className="p-1.5 text-[#7A726A] hover:text-[#A4493D] hover:bg-[#A4493D]/10 rounded-[2px] transition-colors"
                          title="Remove from Whitelist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Number Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Authorize WhatsApp Mobile Number"
          size="md"
        >
          <form onSubmit={handleAddNumber} className="space-y-4 text-xs">
            <p className="text-xs text-[#7A726A]">
              Only numbers added here can upload catalogue pictures to create draft products.
            </p>

            <Input
              label="Contact / Representative Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Sharma"
              required
            />

            <Input
              label="WhatsApp Mobile Number (e.g. 919876543210 or 9876543210) *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 919876543210"
              required
            />

            <Input
              label="Firm / Business Name (Optional)"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Glass Works"
            />

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                Classification / Role
              </label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
              >
                <option value="Lead Fabricator">Lead Fabricator</option>
                <option value="Glazing Contractor">Glazing Contractor</option>
                <option value="Architectural Consultant">Architectural Consultant</option>
                <option value="Hardware Distributor">Hardware Distributor</option>
                <option value="Internal Staff">Internal Staff</option>
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CF]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-[2px] border-[#DDD8CF] text-[#2E2622] hover:bg-[#F0EDE8]">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={actionLoading} className="rounded-[2px] bg-[#3A2F2B] hover:bg-[#2E2622] text-[#FAF8F4]">
                {actionLoading ? 'Saving...' : 'Save to Whitelist'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Remove Contact"
        confirmVariant="danger"
      />
    </div>
  );
};

export default AdminWhatsAppWhitelistPage;
