import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Search,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Button, Input, Select, useToast } from '../../components/ui';

export const AdminProductFormModal = ({ isOpen, onClose, product, categories = [], onSaved }) => {
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [finish, setFinish] = useState('CP');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [baseMrp, setBaseMrp] = useState(0);
  const [status, setStatus] = useState('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState(false);
  const [tags, setTags] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Variants & Tiers
  const [variants, setVariants] = useState([]);
  const [bulkPricing, setBulkPricing] = useState([]);
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setTitle(product.title || product.name || '');
      setSlug(product.slug || '');
      setCode(product.code || '');
      setCategory(product.category?._id || product.category || categories[0]?._id || '');
      setFinish(product.finish || 'CP');
      setDescription(product.description || '');
      setBasePrice(product.basePrice || 0);
      setBaseMrp(product.baseMrp || product.basePrice || 0);
      setStatus(product.status || 'PUBLISHED');
      setIsFeatured(Boolean(product.isFeatured));
      setTags(Array.isArray(product.tags) ? product.tags.join(', ') : '');
      setMetaTitle(product.metaTitle || '');
      setMetaDescription(product.metaDescription || '');
      setVariants(
        product.variants?.map((v) => ({
          sku: v.sku || '',
          size: v.size || '',
          finish: v.finish || 'CP',
          price: v.price || 0,
          mrp: v.mrp || v.price || 0,
          stock: v.stock ?? 50,
          isActive: v.isActive !== false,
        })) || []
      );
      setBulkPricing(
        product.bulkPricing?.map((b) => ({
          minQty: b.minQty ?? b.minQuantity ?? 10,
          discountPercentage: b.discountPercentage ?? 0,
          fixedPrice: b.fixedPrice ?? 0,
        })) || []
      );
      setImages(product.images || []);
    } else {
      // Defaults for new product
      setName('');
      setTitle('');
      setSlug('');
      setCode(`GLAS-${Date.now().toString().slice(-4)}`);
      setCategory(categories[0]?._id || '');
      setFinish('CP');
      setDescription('');
      setBasePrice(1200);
      setBaseMrp(1500);
      setStatus('PUBLISHED');
      setIsFeatured(false);
      setTags('hardware, architectural');
      setMetaTitle('');
      setMetaDescription('');
      setVariants([
        {
          sku: 'STD-CP',
          size: 'Standard',
          finish: 'CP',
          price: 1200,
          mrp: 1500,
          stock: 50,
          isActive: true,
        },
      ]);
      setBulkPricing([
        { minQty: 10, discountPercentage: 5, fixedPrice: 0 },
        { minQty: 50, discountPercentage: 15, fixedPrice: 0 },
      ]);
      setImages(['/images/glass_connector.png']);
    }
  }, [product, categories, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Variant helpers
  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        sku: `${code}-${variants.length + 1}`,
        size: 'Standard',
        finish: finish || 'CP',
        price: Number(basePrice) || 1000,
        mrp: Number(baseMrp) || 1200,
        stock: 50,
        isActive: true,
      },
    ]);
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Bulk Tier helpers
  const handleAddTier = () => {
    setBulkPricing([
      ...bulkPricing,
      {
        minQty: (bulkPricing[bulkPricing.length - 1]?.minQty || 10) + 10,
        discountPercentage: 10,
        fixedPrice: 0,
      },
    ]);
  };

  const handleUpdateTier = (index, field, value) => {
    const updated = [...bulkPricing];
    updated[index][field] = Number(value);
    setBulkPricing(updated);
  };

  const handleRemoveTier = (index) => {
    setBulkPricing(bulkPricing.filter((_, i) => i !== index));
  };

  // Image Reordering helpers
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleMoveImage = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    setImages(copy);
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Product name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        title: title || name,
        slug: slug.trim() || undefined,
        code,
        category,
        finish,
        description,
        basePrice: Number(basePrice),
        baseMrp: Number(baseMrp),
        status,
        isFeatured,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        metaTitle: metaTitle || `${name} | Glassofy Architectural Hardware`,
        metaDescription:
          metaDescription ||
          description.slice(0, 150) ||
          'Premium architectural glass fittings and architectural hardware.',
        variants: variants.map((v) => ({
          ...v,
          price: Number(v.price),
          mrp: Number(v.mrp),
          stock: Number(v.stock),
        })),
        bulkPricing: bulkPricing.map((b) => ({
          minQty: Number(b.minQty),
          discountPercentage: Number(b.discountPercentage),
          fixedPrice: Number(b.fixedPrice),
        })),
        images,
      };

      if (product?._id) {
        await adminApi.updateProduct(product._id, payload);
        addToast('Product updated successfully', 'success');
      } else {
        await adminApi.createProduct(payload);
        addToast('Product created successfully', 'success');
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      addToast(err?.message || 'Failed to save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#DDD8CF] flex items-center justify-between bg-[#F0EDE8]/50">
          <div>
            <h2 className="text-xl font-serif font-light text-[#2E2622]">
              {product ? `Edit Product: ${product.name}` : 'Create New Product'}
            </h2>
            <p className="text-[12px] text-[#7A726A] mt-0.5">
              Manage variants, volume discount tiers, media assets, and SEO parameters.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A726A] hover:text-[#2E2622] rounded-[2px] hover:bg-[#DDD8CF]/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold border-b border-[#DDD8CF] pb-2">
              1. General Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Product Name *"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!title) setTitle(e.target.value);
                }}
                required
                placeholder="e.g. Heavy Duty Shower Hinge 90 Deg"
              />
              <Input
                label="Catalogue Item Code *"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="e.g. SH-90-BR"
              />
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3.5 py-2.5 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                  required
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Primary Finish</label>
                <select
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3.5 py-2.5 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                >
                  <option value="CP">Chrome Plated (CP)</option>
                  <option value="SS">Satin Stainless Steel (SS)</option>
                  <option value="BM">Black Matte (BM)</option>
                  <option value="RG">Rose Gold (RG)</option>
                  <option value="AB">Antique Brass (AB)</option>
                  <option value="GL">Gold Mirror (GL)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-3 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                placeholder="Technical specifications, load capacity, glass thickness compatibility..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Input
                label="Base Price (₹) *"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
              />
              <Input
                label="Base MRP (₹)"
                type="number"
                value={baseMrp}
                onChange={(e) => setBaseMrp(e.target.value)}
              />
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3.5 py-2.5 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                >
                  <option value="PUBLISHED">PUBLISHED (Live)</option>
                  <option value="DRAFT">DRAFT (Hidden)</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="featuredToggle"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded-[2px] border-[#DDD8CF] text-[#3A2F2B] focus:ring-[#3A2F2B]"
                />
                <label htmlFor="featuredToggle" className="text-xs text-[#2E2622] font-medium">
                  Featured Product
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Product Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD8CF] pb-2">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
                2. Variants & Inventory ({variants.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#3A2F2B]" />
                <span>Add Variant</span>
              </Button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] grid grid-cols-2 sm:grid-cols-7 gap-2 items-center text-xs"
                >
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={v.sku}
                      onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622] font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Size / Spec"
                      value={v.size}
                      onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Finish"
                      value={v.finish}
                      onChange={(e) => handleUpdateVariant(idx, 'finish', e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Price"
                      value={v.price}
                      onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622] font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622] font-mono"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      disabled={variants.length === 1}
                      className="p-1.5 text-[#7A726A] hover:text-[#A4493D] disabled:opacity-30 rounded-[2px]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Bulk Quantity Pricing Tiers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD8CF] pb-2">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold">
                3. Bulk Volume Tiers ({bulkPricing.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTier}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#3A2F2B]" />
                <span>Add Tier</span>
              </Button>
            </div>

            {bulkPricing.length === 0 ? (
              <p className="text-xs text-[#7A726A] italic">No bulk volume tiers configured.</p>
            ) : (
              <div className="space-y-2">
                {bulkPricing.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] grid grid-cols-1 sm:grid-cols-4 gap-3 items-center text-xs"
                  >
                    <div>
                      <label className="text-[10px] text-[#7A726A] uppercase tracking-[0.05em] block mb-1">Min Quantity</label>
                      <input
                        type="number"
                        value={tier.minQty}
                        onChange={(e) => handleUpdateTier(idx, 'minQty', e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#7A726A] uppercase tracking-[0.05em] block mb-1">Discount %</label>
                      <input
                        type="number"
                        value={tier.discountPercentage}
                        onChange={(e) =>
                          handleUpdateTier(idx, 'discountPercentage', e.target.value)
                        }
                        className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#7A726A] uppercase tracking-[0.05em] block mb-1">
                        Fixed Price (₹ optional)
                      </label>
                      <input
                        type="number"
                        value={tier.fixedPrice}
                        onChange={(e) => handleUpdateTier(idx, 'fixedPrice', e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-2.5 py-1.5 text-xs text-[#2E2622] font-mono"
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="p-1.5 text-[#7A726A] hover:text-[#A4493D] rounded-[2px]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Image Gallery & Reordering */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold border-b border-[#DDD8CF] pb-2">
              4. Product Media & Gallery ({images.length})
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter image URL (/images/photo.png or https://...)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
              />
              <Button type="button" variant="outline" onClick={handleAddImage} className="text-xs">
                Add Image
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px] p-2 flex flex-col items-center"
                >
                  <img
                    src={img}
                    alt={`Product preview ${idx + 1}`}
                    className="w-full h-24 object-contain rounded-[2px] bg-[#FAF8F4] mb-2 mix-blend-multiply"
                    onError={(e) => {
                      e.target.src = '/images/glass_connector.png';
                    }}
                  />
                  <div className="w-full flex items-center justify-between pt-1 border-t border-[#DDD8CF]">
                    <span className="text-[10px] font-mono text-[#7A726A]">#{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-[#7A726A] hover:text-[#2E2622] disabled:opacity-20"
                        title="Move left/up"
                      >
                        <ArrowUp className="w-3 h-3 rotate-[-90deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 1)}
                        disabled={idx === images.length - 1}
                        className="p-1 text-[#7A726A] hover:text-[#2E2622] disabled:opacity-20"
                        title="Move right/down"
                      >
                        <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 text-[#7A726A] hover:text-[#A4493D]"
                        title="Delete image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: SEO Fields & SERP Preview */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#7A726A] font-semibold border-b border-[#DDD8CF] pb-2">
              5. Search Engine Optimization (SEO)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Meta Title (Max 60 chars)"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={`${name || 'Product'} | Glassofy`}
                />
                <span className="text-[10px] text-[#7A726A] font-mono mt-1 block">
                  {metaTitle.length}/60 characters
                </span>
              </div>
              <div>
                <Input
                  label="URL Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated from title"
                />
                <span className="text-[10px] text-[#7A726A] font-mono mt-1 block">
                  /products/{slug || 'generated-slug'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">
                Meta Description (Max 160 chars)
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                maxLength={160}
                className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-3 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                placeholder="Compelling SERP snippet summarizing finish, load rating, and usage..."
              />
              <span className="text-[10px] text-[#7A726A] font-mono mt-1 block">
                {metaDescription.length}/160 characters
              </span>
            </div>

            {/* Google Search Snippet Preview Box */}
            <div className="p-4 bg-[#F0EDE8]/50 border border-[#DDD8CF] rounded-[2px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A726A] mb-2 block">
                Google SERP Snippet Preview
              </span>
              <p className="text-xs text-[#7A726A] font-mono">
                https://glassofy.com &gt; products &gt; {slug || 'shower-hinge-90'}
              </p>
              <h4 className="text-sm font-serif font-medium text-[#2E2622] hover:underline cursor-pointer mt-0.5">
                {metaTitle || `${name || 'Product Name'} | Architectural Hardware | Glassofy`}
              </h4>
              <p className="text-xs text-[#7A726A] mt-1 line-clamp-2">
                {metaDescription ||
                  description.slice(0, 150) ||
                  'Architectural hardware for glass installations. Commercial quality, certified test standards, direct fabricator pricing.'}
              </p>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#DDD8CF] flex items-center justify-end gap-3 bg-[#F0EDE8]/60 rounded-b-[4px]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{product ? 'Save Changes' : 'Create Product'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminProductFormModal;
