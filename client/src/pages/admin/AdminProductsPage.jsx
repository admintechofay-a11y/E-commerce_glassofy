import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit2,
  AlertTriangle,
  Package,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import {
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Pagination,
  ConfirmDialog,
  useToast,
} from '../../components/ui';
import AdminProductFormModal from './AdminProductFormModal';
import AdminProductCsvModal from './AdminProductCsvModal';
import SEO from '../../components/common/SEO';

export const AdminProductsPage = () => {
  const { addToast } = useToast();

  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedFinish, setSelectedFinish] = useState('ALL');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Destructive Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
    confirmText: 'Confirm',
  });

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        finish: selectedFinish !== 'ALL' ? selectedFinish : undefined,
      };

      const res = await adminApi.getProducts(params);
      if (res?.data) {
        setProducts(res.data.products || []);
        setPagination((prev) => ({
          ...prev,
          total: res.data.pagination?.total || 0,
          pages: res.data.pagination?.pages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err?.message || 'Unable to load products.');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, selectedCategory, selectedStatus, selectedFinish]);

  const fetchCategories = async () => {
    try {
      const res = await adminApi.getCategories();
      if (res?.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;

    if (action === 'DELETE') {
      setConfirmDialog({
        isOpen: true,
        title: `Delete ${selectedIds.length} Selected Products?`,
        message:
          'This will permanently delete the selected products from the catalogue and database. This action cannot be undone.',
        variant: 'danger',
        confirmText: 'Delete Products',
        onConfirm: async () => {
          try {
            await adminApi.bulkActionProducts('DELETE', selectedIds);
            addToast(`${selectedIds.length} products deleted successfully`, 'success');
            setSelectedIds([]);
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            fetchProducts();
          } catch (err) {
            addToast(err?.message || 'Failed to delete selected products', 'error');
          }
        },
      });
      return;
    }

    try {
      await adminApi.bulkActionProducts(action, selectedIds);
      addToast(
        `${selectedIds.length} products marked as ${action === 'PUBLISH' ? 'Published' : 'Draft'}`,
        'success'
      );
      setSelectedIds([]);
      fetchProducts();
    } catch (err) {
      addToast(err?.message || 'Bulk action failed', 'error');
    }
  };

  // Single Delete
  const handleDeleteProduct = (prod) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete "${prod.name}"?`,
      message: `Permanently delete code ${prod.code}. This will also remove associated variant inventory records.`,
      variant: 'danger',
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        try {
          await adminApi.deleteProduct(prod._id);
          addToast(`Product ${prod.name} deleted`, 'success');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          fetchProducts();
        } catch (err) {
          addToast(err?.message || 'Failed to delete product', 'error');
        }
      },
    });
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const response = await adminApi.exportProductsCsv();
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `glassofy_catalogue_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Catalogue exported as CSV successfully', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      addToast(err?.message || 'Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-6 text-[#2E2622]">
      <SEO
        title="Hardware Products Manager | Admin"
        description="Catalogue management, multi-finish variant matrix builder, CSV bulk import/export, and stock level controls."
      />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#DDD8CF]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-light text-[#2E2622] tracking-tight">
            Product Catalogue
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Manage architectural items, SKU variants, volume price tiers, and specifications.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="text-xs uppercase tracking-[0.08em] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#2E2622]" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsCsvModalOpen(true)}
            className="text-xs uppercase tracking-[0.08em] flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#2E2622]" />
            <span>Import CSV</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
            className="text-xs uppercase tracking-[0.08em] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#DDD8CF] rounded-[2px] shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-[#7A726A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, item code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] pl-9 pr-4 py-2 text-xs text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B]"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="ALL">All Statuses</option>
          <option value="PUBLISHED">Published (Live)</option>
          <option value="DRAFT">Draft (Hidden)</option>
        </select>

        {/* Finish Filter */}
        <select
          value={selectedFinish}
          onChange={(e) => {
            setSelectedFinish(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="ALL">All Finishes</option>
          <option value="CP">Chrome Plated (CP)</option>
          <option value="SS">Satin Stainless (SS)</option>
          <option value="BM">Black Matte (BM)</option>
          <option value="RG">Rose Gold (RG)</option>
        </select>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#3A2F2B] text-[#FAF8F4] font-medium text-xs flex items-center justify-center font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs uppercase tracking-[0.06em] font-medium text-[#2E2622]">Products selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('PUBLISH')}
              className="text-xs py-1"
            >
              Publish Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('DRAFT')}
              className="text-xs py-1"
            >
              Move to Draft
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('DELETE')}
              className="text-xs py-1 text-[#A4493D] hover:bg-[#FAF0EE] border-[#E8C2BC]"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Product Data Table */}
      <div className="bg-white border border-[#DDD8CF] rounded-[2px] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[2px] bg-[#F0EDE8]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-[#A4493D] mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg font-light text-[#2E2622] mb-1">Error Loading Products</h3>
            <p className="text-xs text-[#7A726A] mb-4">{error}</p>
            <Button onClick={fetchProducts} variant="primary" className="text-xs">
              Retry
            </Button>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Products Found"
            description="No items match your filter criteria or search query. Try clearing your filters or create a new product."
            actionLabel="Add New Product"
            onAction={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
              <thead>
                <tr className="border-b border-[#DDD8CF] bg-[#F0EDE8] text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        products.length > 0 && selectedIds.length === products.length
                      }
                      onChange={handleSelectAll}
                      className="accent-[#3A2F2B]"
                    />
                  </th>
                  <th className="p-3 w-14">Photo</th>
                  <th className="p-3">Product & Code</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Finish</th>
                  <th className="p-3">Base Price</th>
                  <th className="p-3">Variants / Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {products.map((p) => {
                  const totalStock =
                    p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
                  const isSelected = selectedIds.includes(p._id);

                  return (
                    <tr
                      key={p._id}
                      className={`hover:bg-[#FAF8F4] transition-colors ${
                        isSelected ? 'bg-[#F0EDE8]' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p._id)}
                          className="accent-[#3A2F2B]"
                        />
                      </td>
                      <td className="p-3">
                        <div className="w-10 h-10 bg-[#F0EDE8] rounded-[2px] border border-[#DDD8CF] flex items-center justify-center p-1">
                          <img
                            src={p.images?.[0] || '/images/glass_connector.png'}
                            alt={p.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                            onError={(e) => {
                              e.target.src = '/images/glass_connector.png';
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-normal text-[#2E2622] truncate text-sm">{p.name}</p>
                        <p className="text-[10px] text-[#7A726A] font-mono tracking-wider">
                          {p.code}
                        </p>
                      </td>
                      <td className="p-3 text-[#7A726A]">
                        {p.category?.name || 'Unassigned'}
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] bg-[#FAF8F4] text-[#2E2622] border border-[#DDD8CF]">
                          {p.finish || 'CP'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-medium text-[#2E2622]">
                        ₹{p.basePrice?.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <div className="text-[#7A726A] font-mono text-xs">
                          <span>{p.variants?.length || 1} vars</span>
                          <span className="mx-1">•</span>
                          <span
                            className={
                              totalStock < 15 ? 'text-[#A4493D] font-medium' : 'text-[#4F6B4A]'
                            }
                          >
                            {totalStock} units
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={p.status === 'PUBLISHED' ? 'success' : 'default'}
                          className="text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8] rounded-[2px] transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 text-[#7A726A] hover:text-[#A4493D] hover:bg-[#FAF0EE] rounded-[2px] transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination */}
        {products.length > 0 && (
          <div className="p-4 border-t border-[#DDD8CF] flex items-center justify-between">
            <span className="text-xs text-[#7A726A] font-mono">
              Showing {products.length} of {pagination.total} products
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            />
          </div>
        )}
      </div>

      {/* Product Create / Edit Modal */}
      <AdminProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        product={editingProduct}
        categories={categories}
        onSaved={fetchProducts}
      />

      {/* CSV Import Modal */}
      <AdminProductCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImported={fetchProducts}
      />

      {/* Interactive Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
      />
    </div>
  );
};

export default AdminProductsPage;
