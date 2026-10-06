import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
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
import AdminUserDetailModal from './AdminUserDetailModal';
import SEO from '../../components/common/SEO';

export const AdminUsersPage = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Detail Modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Quick Action Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        role: role !== 'ALL' ? role : undefined,
        status: status !== 'ALL' ? status : undefined,
      };

      const res = await adminApi.getUsers(params);
      if (res?.data) {
        setUsers(res.data.users || []);
        setPagination((prev) => ({
          ...prev,
          total: res.data.pagination?.total || 0,
          pages: res.data.pagination?.pages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err?.message || 'Unable to load user accounts');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleQuickToggleStatus = (u) => {
    const willBlock = u.isActive !== false;
    setConfirmDialog({
      isOpen: true,
      title: willBlock ? `Block Account: ${u.fullName}?` : `Unblock Account: ${u.fullName}?`,
      message: willBlock
        ? 'Blocking this account will immediately revoke access and prevent future logins.'
        : 'Activating this account will restore customer privileges.',
      onConfirm: async () => {
        try {
          await adminApi.toggleUserStatus(u._id, !willBlock);
          addToast(`Account ${willBlock ? 'blocked' : 'activated'}`, 'success');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          fetchUsers();
        } catch (err) {
          addToast(err?.message || 'Failed to update user status', 'error');
        }
      },
    });
  };

  const handleQuickResetLink = async (u) => {
    try {
      const res = await adminApi.generateResetPasswordLink(u._id);
      if (res?.data?.resetUrl) {
        navigator.clipboard.writeText(res.data.resetUrl);
        addToast(`Reset link for ${u.fullName} copied to clipboard!`, 'success');
      }
    } catch (err) {
      addToast(err?.message || 'Failed to generate reset link', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Customer & Trade Accounts | Admin"
        description="Manage customer profiles, B2B trade approvals, contractor GST credentials, role modifications, and account access."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            Registered Users & Accounts
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Customer directory, commercial fabricators, access control, and password links.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchUsers}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#3A2F2B]" />
          <span>Refresh Users</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#F0EDE8]/60 border border-[#DDD8CF] rounded-[2px] flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#7A726A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, email, mobile, or business name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] pl-9 pr-4 py-2 text-xs text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B]"
          />
        </div>

        {/* Role */}
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="ALL">All Roles</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[2px] bg-[#F0EDE8]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-[#A4493D] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-normal text-[#2E2622] mb-1">Error Loading Users</h3>
            <p className="text-xs text-[#7A726A] mb-4">{error}</p>
            <Button onClick={fetchUsers} variant="primary" className="text-xs">
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="No customer accounts match your search filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
              <thead>
                <tr className="border-b border-[#DDD8CF] text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-mono bg-[#F0EDE8]/60">
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Business / Fabricator</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {users.map((u) => (
                  <tr
                    key={u._id}
                    onClick={() => {
                      setSelectedUserId(u._id);
                      setIsDetailOpen(true);
                    }}
                    className="hover:bg-[#F0EDE8]/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] text-[#2E2622] flex items-center justify-center font-bold text-xs shrink-0">
                          {u.fullName?.charAt(0) || 'U'}
                        </div>
                        <span className="font-medium text-[#2E2622]">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="text-[#2E2622]">{u.email}</p>
                      <p className="text-[10px] text-[#7A726A] font-mono">{u.mobile || '-'}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="text-[#2E2622]">{u.businessName || 'Individual'}</p>
                      {u.gstNumber && (
                        <p className="text-[10px] text-[#7A726A] font-mono">GST: {u.gstNumber}</p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={u.role === 'ADMIN' ? 'warning' : 'default'}
                        className="text-[10px]"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={u.isActive !== false ? 'success' : 'danger'}
                        className="text-[10px]"
                      >
                        {u.isActive !== false ? 'Active' : 'Blocked'}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-[#7A726A]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setSelectedUserId(u._id);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-[#7A726A] hover:text-[#2E2622] hover:bg-[#DDD8CF]/40 rounded-[2px] transition-colors"
                          title="View Profile & Orders"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickResetLink(u)}
                          className="p-1.5 text-[#7A726A] hover:text-[#3A2F2B] hover:bg-[#DDD8CF]/40 rounded-[2px] transition-colors"
                          title="Copy Password Reset Link"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickToggleStatus(u)}
                          className={`p-1.5 rounded-[2px] transition-colors ${
                            u.isActive !== false
                              ? 'text-[#7A726A] hover:text-[#A4493D] hover:bg-[#A4493D]/10'
                              : 'text-[#7A726A] hover:text-[#4F6B4A] hover:bg-[#4F6B4A]/10'
                          }`}
                          title={u.isActive !== false ? 'Block Account' : 'Activate Account'}
                        >
                          {u.isActive !== false ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination */}
        {users.length > 0 && (
          <div className="p-4 border-t border-[#DDD8CF] flex items-center justify-between">
            <span className="text-xs text-[#7A726A] font-mono">
              Showing {users.length} of {pagination.total} users
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            />
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <AdminUserDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        userId={selectedUserId}
        onUserUpdated={fetchUsers}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
      />
    </div>
  );
};

export default AdminUsersPage;
