import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Badge, Button, Skeleton, EmptyState, Pagination } from '../../components/ui';
import SEO from '../../components/common/SEO';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionSearch, setActionSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        entity: entityFilter !== 'ALL' ? entityFilter : undefined,
        action: actionSearch.trim() || undefined,
      };

      const res = await adminApi.getAuditLogs(params);
      if (res?.data) {
        setLogs(res.data.logs || []);
        setPagination((prev) => ({
          ...prev,
          total: res.data.pagination?.total || 0,
          pages: res.data.pagination?.pages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err?.message || 'Unable to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, entityFilter, actionSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadgeVariant = (action) => {
    if (action.includes('CREATE') || action.includes('PUBLISH')) return 'success';
    if (action.includes('DELETE') || action.includes('BLOCK') || action.includes('CANCEL'))
      return 'danger';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Audit Logs | Admin | Glassofy"
        description="Comprehensive immutable audit trail of administrator actions, data modifications, and system events in Glassofy."
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#2E2622] tracking-wide">
            System Audit Trail
          </h1>
          <p className="text-xs text-[#7A726A] mt-1">
            Immutable historical record of every administrative create, update, delete, and workflow
            change.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchLogs}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#3A2F2B]" />
          <span>Refresh Trail</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#F0EDE8]/60 border border-[#DDD8CF] rounded-[2px] flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Action */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#7A726A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action (e.g. CREATE, DELETE, STATUS_CHANGE)..."
            value={actionSearch}
            onChange={(e) => {
              setActionSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] pl-9 pr-4 py-2 text-xs text-[#2E2622] placeholder-[#7A726A] focus:outline-none focus:border-[#3A2F2B] font-mono uppercase"
          />
        </div>

        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] px-3 py-2 text-xs text-[#2E2622] focus:outline-none focus:border-[#3A2F2B] font-mono"
        >
          <option value="ALL">All Entities</option>
          <option value="PRODUCT">PRODUCT</option>
          <option value="CATEGORY">CATEGORY</option>
          <option value="ORDER">ORDER</option>
          <option value="USER">USER</option>
          <option value="DISCOUNT_RULE">DISCOUNT_RULE</option>
          <option value="COUPON">COUPON</option>
          <option value="SETTINGS">SETTINGS</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[2px] bg-[#F0EDE8]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <h3 className="font-serif text-lg font-normal text-[#2E2622] mb-1">
              Error Loading Audit Logs
            </h3>
            <p className="text-xs text-[#7A726A] mb-4">{error}</p>
            <Button onClick={fetchLogs} variant="primary" className="text-xs">
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Audit Records"
            description="No administrative activities found matching the criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E2622] border-collapse">
              <thead>
                <tr className="border-b border-[#DDD8CF] text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-mono bg-[#F0EDE8]/60">
                  <th className="p-3.5 w-8"></th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Actor (Admin)</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target Entity</th>
                  <th className="p-3.5">Entity ID</th>
                  <th className="p-3.5">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CF]">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log._id;
                  return (
                    <React.Fragment key={log._id}>
                      <tr
                        onClick={() => toggleExpand(log._id)}
                        className="hover:bg-[#F0EDE8]/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 text-center text-[#7A726A]">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#3A2F2B]" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[#7A726A] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5">
                          <p className="font-medium text-[#2E2622]">
                            {log.user?.fullName || 'System Administrator'}
                          </p>
                          <p className="text-[10px] text-[#7A726A] font-mono">
                            {log.user?.email || 'automated-task'}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant={getActionBadgeVariant(log.action)}
                            className="text-[10px] font-mono"
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono font-medium text-[#3A2F2B]">{log.entity}</td>
                        <td className="p-3.5 font-mono text-[#7A726A]">
                          {log.entityId ? (
                            <span className="truncate block max-w-[120px]">{log.entityId}</span>
                          ) : (
                            <span className="text-[#DDD8CF]">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[#7A726A] text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                      </tr>

                      {/* Expandable JSON details row */}
                      {isExpanded && (
                        <tr className="bg-[#F0EDE8]/40 border-y border-[#DDD8CF]">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#7A726A] font-medium">
                                Mutation Metadata & Payload Snapshot
                              </span>
                              <pre className="p-3 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] text-[11px] font-mono text-[#2E2622] overflow-x-auto max-h-60 leading-relaxed">
                                {JSON.stringify(
                                  {
                                    details: log.details || {},
                                    userAgent: log.userAgent || 'N/A',
                                    actor: log.user
                                      ? {
                                          id: log.user._id,
                                          name: log.user.fullName,
                                          email: log.user.email,
                                        }
                                      : 'System',
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination */}
        {logs.length > 0 && (
          <div className="p-4 border-t border-[#DDD8CF] flex items-center justify-between">
            <span className="text-xs text-[#7A726A] font-mono">
              Showing {logs.length} of {pagination.total} audit events
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
