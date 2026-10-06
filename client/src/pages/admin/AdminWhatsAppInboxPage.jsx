import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  RotateCw,
  ExternalLink,
  Edit,
  Eye,
  AlertTriangle,
  Sparkles,
  Package,
  RefreshCw,
} from 'lucide-react';
import { Badge, Button, useToast, ConfirmDialog, Modal } from '../../components/ui';
import { adminApi } from '../../api/adminApi';
import SEO from '../../components/common/SEO';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Ingestions' },
  { id: 'DRAFT_CREATED', label: 'Drafts Created' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'FAILED', label: 'Failed / Format Errors' },
  { id: 'IGNORED', label: 'Ignored (Non-Whitelisted)' },
];

export const AdminWhatsAppInboxPage = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  // Simulator Modal
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simForm, setSimForm] = useState({
    from: '919876543210',
    senderName: 'Rohan Sharma (Lead Fabricator)',
    caption:
      'Shower Hinge 90 | SH-90-CP | Shower Hinges | CP | 1250 | 50 | Heavy brass 90 deg glass-to-wall hinge',
    messageType: 'image',
  });

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: () => {},
  });

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 50,
      };
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await adminApi.getWhatsappMessages(params);
      const fetched = res?.data?.messages || res?.data?.data?.messages || res?.messages || [];
      setMessages(fetched);

      if (fetched.length > 0 && (!selectedMessageId || !fetched.some((m) => m._id === selectedMessageId))) {
        setSelectedMessageId(fetched[0]._id);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp messages:', err);
      addToast(err?.message || 'Failed to load WhatsApp inbox messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, selectedMessageId, addToast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const selectedMessage = messages.find((m) => m._id === selectedMessageId) || messages[0] || null;

  // Publish Draft
  const handlePublish = async (msg) => {
    try {
      setActionLoading(true);
      const res = await adminApi.publishWhatsappDraft(msg._id);
      addToast(res?.message || res?.data?.message || 'Product published to store successfully!', 'success');
      await fetchMessages();
    } catch (err) {
      console.error('Failed to publish draft:', err);
      addToast(err?.message || err?.response?.data?.message || 'Failed to publish product', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Draft
  const handleReject = (msg) => {
    setConfirmDialog({
      isOpen: true,
      title: `Reject WhatsApp Submission?`,
      message: `Are you sure you want to reject "${msg.parsedFields?.name || msg.caption}"? The linked product will be archived.`,
      confirmText: 'Reject Submission',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await adminApi.rejectWhatsappDraft(msg._id, 'Rejected by Administrator');
          addToast(res?.message || 'Submission marked as rejected', 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          await fetchMessages();
        } catch (err) {
          addToast(err?.message || err?.response?.data?.message || 'Failed to reject submission', 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Retry Message
  const handleRetry = async (msg) => {
    try {
      setActionLoading(true);
      const res = await adminApi.retryWhatsappMessage(msg._id);
      addToast(res?.message || 'Message re-processed successfully', 'success');
      await fetchMessages();
    } catch (err) {
      console.error('Failed to retry message:', err);
      addToast(err?.message || err?.response?.data?.message || 'Retry failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Send Mock Webhook
  const handleSimulate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await adminApi.sendMockWhatsappWebhook(simForm);
      const msgText = res?.message || 'Mock WhatsApp message ingested successfully!';
      addToast(msgText, 'success');
      setIsSimModalOpen(false);
      await fetchMessages();
    } catch (err) {
      console.error('Simulation error:', err);
      addToast(err?.message || err?.response?.data?.message || 'Simulation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT_CREATED':
        return <Badge variant="warning" className="text-[10px] tracking-wider">DRAFT CREATED</Badge>;
      case 'PUBLISHED':
        return <Badge variant="success" className="text-[10px] tracking-wider">PUBLISHED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" className="text-[10px] tracking-wider">REJECTED</Badge>;
      case 'FAILED':
        return <Badge variant="danger" className="text-[10px] tracking-wider">FAILED</Badge>;
      case 'IGNORED':
        return <Badge variant="default" className="text-[10px] tracking-wider">IGNORED</Badge>;
      default:
        return <Badge variant="default" className="text-[10px] tracking-wider">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <SEO
        title="WhatsApp Ingestion Inbox | Admin | Glassofy"
        description="Review, curate, validate, and convert incoming WhatsApp catalogue submissions into store products with AI/OCR processing."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#DDD8CF]">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            WhatsApp Catalogue Ingestion
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Automated image parsing, Zod caption validation, and one-click store publishing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchMessages}
            disabled={loading}
            className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] border-[#DDD8CF] text-[#2E2622] hover:bg-[#F0EDE8]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsSimModalOpen(true)}
            className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] bg-[#3A2F2B] hover:bg-[#2E2622] text-[#FAF8F4]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Message (Mock)</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#DDD8CF]">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-[2px] text-[11px] uppercase tracking-[0.08em] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                  : 'text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#DDD8CF] rounded-[4px] overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[650px]">
        {/* Left Pane: Ingested Messages List */}
        <div className="w-full md:w-88 lg:w-96 border-b md:border-b-0 md:border-r border-[#DDD8CF] flex flex-col bg-[#FAF8F4]">
          {/* Search Bar */}
          <div className="p-3.5 border-b border-[#DDD8CF]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#7A726A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, phone, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-[#DDD8CF] rounded-[2px] pl-9 pr-3 py-1.5 text-xs text-[#2E2622] placeholder-[#7A726A]/60 focus:outline-none focus:border-[#3A2F2B]"
              />
            </div>
          </div>

          {/* List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#DDD8CF]/70">
            {loading && messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7A726A]">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3A2F2B]" />
                Loading WhatsApp inbox...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7A726A]">
                <MessageSquare className="w-8 h-8 text-[#DDD8CF] mx-auto mb-2" />
                No messages found matching criteria.
              </div>
            ) : (
              messages.map((m) => {
                const isSelected = m._id === selectedMessageId;
                const timeStr = m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const dateStr = m.createdAt
                  ? new Date(m.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '';

                return (
                  <div
                    key={m._id}
                    onClick={() => setSelectedMessageId(m._id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected ? 'bg-[#F0EDE8] border-l-2 border-[#3A2F2B]' : 'hover:bg-[#F0EDE8]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-xs text-[#2E2622] truncate">
                          {m.senderName || m.senderMobile}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#7A726A] font-mono shrink-0">
                        {dateStr} {timeStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] text-[#7A726A] font-mono">
                        +{m.senderMobile}
                      </span>
                      {getStatusBadge(m.status)}
                    </div>

                    <div className="flex items-center gap-3">
                      {m.mediaUrl ? (
                        <div className="w-10 h-10 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] shrink-0 p-1 flex items-center justify-center">
                          <img
                            src={m.mediaUrl}
                            alt="Thumbnail"
                            className="w-full h-full object-contain mix-blend-multiply"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#7A726A] shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#2E2622] font-medium truncate">
                          {m.parsedFields?.name || m.caption || 'No caption'}
                        </p>
                        {m.parsedFields?.price ? (
                          <p className="text-[11px] text-[#2E2622] font-serif font-medium">
                            ₹{m.parsedFields.price.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] text-[#7A726A] font-sans font-normal uppercase tracking-wider">
                              • Code: {m.parsedFields.code}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#7A726A] truncate">
                            {m.error || 'Parsing pending'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Ingestion Detail */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {selectedMessage ? (
            <div className="p-6 space-y-6">
              {/* Header Status & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-serif font-light text-[#2E2622]">
                      {selectedMessage.parsedFields?.name || 'Incoming Submission'}
                    </h2>
                    {getStatusBadge(selectedMessage.status)}
                  </div>
                  <p className="text-xs text-[#7A726A] font-mono mt-1">
                    Sender: {selectedMessage.senderName} (+{selectedMessage.senderMobile}) • Message ID:{' '}
                    {selectedMessage.messageId || 'N/A'}
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2">
                  {selectedMessage.status === 'DRAFT_CREATED' && (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => handlePublish(selectedMessage)}
                        disabled={actionLoading}
                        className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] bg-[#4F6B4A] hover:bg-[#3d5339] text-[#FAF8F4]"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Publish to Store</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(selectedMessage)}
                        disabled={actionLoading}
                        className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] text-[#A4493D] border-[#DDD8CF] hover:bg-[#A4493D]/10"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}

                  {selectedMessage.status === 'PUBLISHED' && selectedMessage.product && (
                    <a
                      href={`/products/${selectedMessage.product.slug || selectedMessage.product._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-[2px] bg-[#4F6B4A]/10 border border-[#4F6B4A]/20 text-[#4F6B4A] hover:bg-[#4F6B4A]/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Live Product</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {selectedMessage.status === 'FAILED' && (
                    <Button
                      variant="outline"
                      onClick={() => handleRetry(selectedMessage)}
                      disabled={actionLoading}
                      className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] text-[#B08D57] border-[#DDD8CF] hover:bg-[#B08D57]/10"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retry Parsing</span>
                    </Button>
                  )}

                  {selectedMessage.product && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/admin/products?search=${encodeURIComponent(
                            selectedMessage.parsedFields?.code || selectedMessage.product.code || ''
                          )}`
                        )
                      }
                      className="text-xs flex items-center gap-1.5 h-9 rounded-[2px] border-[#DDD8CF] text-[#2E2622] hover:bg-[#F0EDE8]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Product Editor</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Main Content Grid: Image + Parsed Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Image Section */}
                <div className="lg:col-span-5 space-y-3">
                  <h3 className="text-[11px] font-medium text-[#7A726A] uppercase tracking-[0.08em]">
                    Catalogue Photo
                  </h3>
                  <div className="bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] overflow-hidden p-4 flex items-center justify-center min-h-[300px]">
                    {selectedMessage.mediaUrl ? (
                      <img
                        src={selectedMessage.mediaUrl}
                        alt="WhatsApp Upload"
                        className="max-h-[360px] w-auto object-contain mix-blend-multiply"
                      />
                    ) : (
                      <div className="text-center p-8 text-[#7A726A]">
                        <Package className="w-12 h-12 mx-auto mb-2 text-[#DDD8CF]" />
                        <p className="text-xs">No image asset available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parsed Fields Section */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-[11px] font-medium text-[#7A726A] uppercase tracking-[0.08em]">
                    Parsed Product Specifications
                  </h3>

                  <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Product Name</span>
                        <p className="text-sm font-medium text-[#2E2622]">
                          {selectedMessage.parsedFields?.name || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Product Code</span>
                        <p className="text-sm font-mono text-[#3A2F2B] font-medium">
                          {selectedMessage.parsedFields?.code || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Category</span>
                        <p className="text-xs text-[#2E2622]">
                          {selectedMessage.parsedFields?.category || 'Architectural Hardware'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Finish</span>
                        <p className="text-xs text-[#2E2622]">
                          {selectedMessage.parsedFields?.finish || 'CP'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Base Price</span>
                        <p className="text-base font-serif font-medium text-[#2E2622]">
                          ₹{selectedMessage.parsedFields?.price ? selectedMessage.parsedFields.price.toLocaleString('en-IN') : '0'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Initial Stock</span>
                        <p className="text-sm text-[#2E2622] font-mono">
                          {selectedMessage.parsedFields?.stock || 50} units
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#DDD8CF]">
                      <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] block mb-1">Description</span>
                      <p className="text-xs text-[#2E2622] leading-relaxed">
                        {selectedMessage.parsedFields?.description || 'No detailed description.'}
                      </p>
                    </div>
                  </div>

                  {/* Raw Caption & Error Info */}
                  <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-4 space-y-2">
                    <span className="text-[11px] text-[#7A726A] uppercase tracking-[0.08em] block">
                      Original WhatsApp Caption
                    </span>
                    <p className="text-xs text-[#2E2622] font-mono bg-white p-2.5 rounded-[2px] border border-[#DDD8CF] break-words">
                      {selectedMessage.caption || '(No caption provided)'}
                    </p>

                    {selectedMessage.error && (
                      <div className="p-3 bg-[#A4493D]/10 border border-[#A4493D]/20 rounded-[2px] flex items-start gap-2.5 text-xs text-[#A4493D]">
                        <AlertTriangle className="w-4 h-4 text-[#A4493D] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Processing Issue:</p>
                          <p className="text-[11px] text-[#A4493D]/90">{selectedMessage.error}</p>
                        </div>
                      </div>
                    )}

                    {selectedMessage.replyText && (
                      <div className="mt-2 text-[11px] text-[#7A726A] font-mono">
                        <span className="text-[#7A726A]">Automated Reply Sent: </span>
                        <span className="text-[#2E2622]">{selectedMessage.replyText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#7A726A]">
              <MessageSquare className="w-12 h-12 mb-3 text-[#DDD8CF]" />
              <p className="text-sm text-[#2E2622] font-medium">Select a WhatsApp submission</p>
              <p className="text-xs text-[#7A726A] mt-1 max-w-sm">
                Choose an item from the left pane to inspect the parsed fields, examine the product photo, and publish to the live store.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Simulator Modal */}
      {isSimModalOpen && (
        <Modal
          isOpen={isSimModalOpen}
          onClose={() => setIsSimModalOpen(false)}
          title="Simulate WhatsApp Product Ingestion"
          size="md"
        >
          <form onSubmit={handleSimulate} className="space-y-4 text-xs">
            <p className="text-[#7A726A] text-xs">
              Simulates a live Meta Cloud API webhook payload. Tests whitelist verification, image downloading, Zod caption parsing, and DRAFT product creation without live Meta credentials.
            </p>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1">
                Sender WhatsApp Number (Must be whitelisted)
              </label>
              <input
                type="text"
                value={simForm.from}
                onChange={(e) => setSimForm({ ...simForm, from: e.target.value })}
                required
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] font-mono focus:outline-none focus:border-[#3A2F2B]"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1">
                Sender Contact Name
              </label>
              <input
                type="text"
                value={simForm.senderName}
                onChange={(e) => setSimForm({ ...simForm, senderName: e.target.value })}
                required
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1">
                Pipe-Delimited Caption
              </label>
              <textarea
                rows={3}
                value={simForm.caption}
                onChange={(e) => setSimForm({ ...simForm, caption: e.target.value })}
                required
                placeholder="Name | Code | Category | Finish | Price | Stock | Description"
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] font-mono focus:outline-none focus:border-[#3A2F2B]"
              />
              <span className="text-[10px] text-[#7A726A] block mt-1">
                Format: Name | Code | Category | Finish | Price | Stock | Description
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CF]">
              <Button type="button" variant="outline" onClick={() => setIsSimModalOpen(false)} className="rounded-[2px] border-[#DDD8CF] text-[#2E2622] hover:bg-[#F0EDE8]">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={actionLoading} className="rounded-[2px] bg-[#3A2F2B] hover:bg-[#2E2622] text-[#FAF8F4]">
                {actionLoading ? 'Ingesting...' : 'Ingest Mock Message'}
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
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.confirmVariant}
      />
    </div>
  );
};

export default AdminWhatsAppInboxPage;
