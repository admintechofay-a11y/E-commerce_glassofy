import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  EmptyState,
  ConfirmDialog,
  useToast,
} from '../../components/ui';
import SEO from '../../components/common/SEO';

export const AdminCategoriesPage = () => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getCategories();
      if (res?.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err?.message || 'Unable to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setDisplayOrder(categories.length + 1);
    setImage('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setSlug(cat.slug || '');
    setDescription(cat.description || '');
    setDisplayOrder(cat.displayOrder || 1);
    setImage(cat.image || '');
    setIsActive(cat.isActive !== false);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Category name is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        displayOrder: Number(displayOrder) || 1,
        image: image.trim(),
        isActive,
      };

      if (editingCategory) {
        await adminApi.updateCategory(editingCategory._id, payload);
        addToast(`Category "${name}" updated successfully`, 'success');
      } else {
        await adminApi.createCategory(payload);
        addToast(`Category "${name}" created successfully`, 'success');
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Failed to save category:', err);
      addToast(err?.message || 'Failed to save category', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Category "${cat.name}"?`,
      message:
        'This will permanently delete this category. If products are attached to this category, please reassign them first.',
      onConfirm: async () => {
        try {
          await adminApi.deleteCategory(cat._id);
          addToast(`Category "${cat.name}" deleted`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          fetchCategories();
        } catch (err) {
          addToast(err?.message || 'Failed to delete category', 'error');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Product Categories Manager | Admin"
        description="Architectural category hierarchy, display sequence configuration, and category imagery management."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            Catalogue Categories
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Organize hardware items into hierarchy with sort ordering and visual banners.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={openCreateModal}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </Button>
      </div>

      {/* Categories Table */}
      <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[2px] bg-[#F0EDE8]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-[#A4493D] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-normal text-[#2E2622] mb-1">
              Error Loading Categories
            </h3>
            <p className="text-xs text-[#7A726A] mb-4">{error}</p>
            <Button onClick={fetchCategories} variant="primary" className="text-xs">
              Retry
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Categories Available"
            description="Create categories to organize your hardware catalogue into navigable sections."
            actionLabel="Create Category"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
              <thead>
                <tr className="border-b border-[#DDD8CF] text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-mono bg-[#F0EDE8]/60">
                  <th className="p-3.5 w-12 text-center">Order</th>
                  <th className="p-3.5 w-16">Image</th>
                  <th className="p-3.5">Category Name</th>
                  <th className="p-3.5">Slug</th>
                  <th className="p-3.5">Products</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-[#F0EDE8]/40 transition-colors">
                    <td className="p-3.5 text-center font-mono font-medium text-[#3A2F2B]">
                      #{cat.displayOrder || 1}
                    </td>
                    <td className="p-3.5">
                      <div className="w-10 h-10 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] overflow-hidden flex items-center justify-center">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-[#7A726A]" />
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-[#2E2622]">{cat.name}</p>
                      {cat.description && (
                        <p className="text-[10px] text-[#7A726A] truncate max-w-xs">
                          {cat.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[#7A726A]">/{cat.slug}</td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded-[2px] bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF] text-[11px]">
                        {cat.productCount || 0} items
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={cat.isActive !== false ? 'success' : 'default'}
                        className="text-[10px]"
                      >
                        {cat.isActive !== false ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-[#7A726A] hover:text-[#2E2622] hover:bg-[#DDD8CF]/40 rounded-[2px] transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-[#7A726A] hover:text-[#A4493D] hover:bg-[#A4493D]/10 rounded-[2px] transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-serif font-light text-[#2E2622] mb-1">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>
            <p className="text-xs text-[#7A726A] mb-6">
              Configure name, slug, ordering priority, and visual banner.
            </p>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <Input
                label="Category Name *"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingCategory) {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
                  }
                }}
                required
                placeholder="e.g. Shower Hinges"
              />

              <Input
                label="URL Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. shower-hinges"
              />

              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A] mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-2.5 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
                  placeholder="Summary for mega-menu and category header..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Display Order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  required
                />
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="catActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded-[2px] border-[#DDD8CF] text-[#3A2F2B] focus:ring-[#3A2F2B]"
                  />
                  <label htmlFor="catActive" className="text-xs text-[#2E2622] font-medium">
                    Visible in Menu
                  </label>
                </div>
              </div>

              <Input
                label="Banner / Thumbnail URL"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/images/shower_hinge_banner.png"
              />

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCategory ? 'Update' : 'Create'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destructive Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete Category"
        confirmVariant="danger"
      />
    </div>
  );
};

export default AdminCategoriesPage;
