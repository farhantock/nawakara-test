import { PurchaseRequest, User } from '../types';
import { formatRupiah, formatDate, getStatusBadge, getPriorityBadge } from '../utils/formatters';
import {
  Plus,
  ChevronRight,
  Package,
} from 'lucide-react';

interface RequestListProps {
  requests: PurchaseRequest[];
  loading: boolean;
  currentUser: User | null;
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  onSelectRequest: (id: number) => void;
  onCreateClick: () => void;
}

export default function RequestList({
  requests,
  loading,
  currentUser,
  currentFilter,
  onFilterChange,
  onSelectRequest,
  onCreateClick,
}: RequestListProps) {
  const isManager = currentUser?.role === 'MANAGER';

  // Compute counts
  const totalCount = requests.length;
  const draftCount = requests.filter((r) => r.status === 'DRAFT').length;
  const submittedCount = requests.filter((r) => r.status === 'SUBMITTED').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filters = isManager
    ? [
        { key: 'ALL', label: 'Semua', count: totalCount },
        { key: 'SUBMITTED', label: 'Submitted', count: submittedCount },
        { key: 'APPROVED', label: 'Approved', count: approvedCount },
        { key: 'REJECTED', label: 'Rejected', count: rejectedCount },
      ]
    : [
        { key: 'ALL', label: 'Semua', count: totalCount },
        { key: 'DRAFT', label: 'Draft', count: draftCount },
        { key: 'SUBMITTED', label: 'Submitted', count: submittedCount },
        { key: 'APPROVED', label: 'Approved', count: approvedCount },
        { key: 'REJECTED', label: 'Rejected', count: rejectedCount },
      ];

  return (
    <div className="space-y-4">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {isManager ? 'Pengajuan Masuk' : 'Purchase Request Saya'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'Daftar pengajuan pengadaan belanja barang dan jasa dari seluruh karyawan.'
              : 'Kelola pengajuan belanja barang, submit untuk persetujuan, atau ajukan ulang.'}
          </p>
        </div>

        {currentUser?.role === 'EMPLOYEE' && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#004578] hover:bg-[#004d87] active:bg-[#005696] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Request</span>
          </button>
        )}
      </div>

      {/* KPI Overview Strip */}
      <div className={`grid gap-3 ${isManager ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {!isManager && (
          <div
            onClick={() => onFilterChange('DRAFT')}
            className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
              currentFilter === 'DRAFT'
                ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-300'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Draft</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{draftCount}</span>
            </div>
          </div>
        )}

        <div
          onClick={() => onFilterChange('SUBMITTED')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer ${currentFilter === 'SUBMITTED'
            ? 'bg-[#fff7f2] border-[#f77f23]/40 ring-1 ring-[#f77f23]/40'
            : 'bg-white border-slate-200 hover:border-orange-200 shadow-xs'
            }`}
        >
          <div className="text-[11px] font-semibold text-[#ad5919] uppercase tracking-wider">Submitted</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#f77f23]">{submittedCount}</span>
          </div>
        </div>

        <div
          onClick={() => onFilterChange('APPROVED')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer ${currentFilter === 'APPROVED'
            ? 'bg-[#f3f8f3] border-[#399238]/40 ring-1 ring-[#399238]/40'
            : 'bg-white border-slate-200 hover:border-green-200 shadow-xs'
            }`}
        >
          <div className="text-[11px] font-semibold text-[#286627] uppercase tracking-wider">Approved</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#399238]">{approvedCount}</span>
          </div>
        </div>

        <div
          onClick={() => onFilterChange('REJECTED')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer ${currentFilter === 'REJECTED'
            ? 'bg-[#fcf1f1] border-[#cf1d1d]/40 ring-1 ring-[#cf1d1d]/40'
            : 'bg-white border-slate-200 hover:border-red-200 shadow-xs'
            }`}
        >
          <div className="text-[11px] font-semibold text-[#911414] uppercase tracking-wider">Rejected</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#cf1d1d]">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${currentFilter === f.key
              ? 'bg-[#004578] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            {f.label} <span className="text-[11px] opacity-80">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#005696] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs text-slate-500 font-medium">Memuat data...</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Tidak ada purchase request</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Belum ada data untuk status ini. Silakan buat baru atau ubah filter status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Nomor PR</th>
                  <th className="px-4 py-3">Pemohon</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prioritas</th>
                  <th className="px-4 py-3">Disetujui Oleh</th>
                  <th className="px-4 py-3 text-right">Total Nilai</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => {
                  const badge = getStatusBadge(req.status);
                  const priorityBadge = getPriorityBadge(req.priority);
                  const isOwn = req.requester_id === currentUser?.id;
                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-[#f5f6f9]/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-[#005696] flex items-center gap-1.5 transition-colors">
                          {req.number}
                          {isOwn && isManager && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200 font-medium">
                              Milik Sendiri
                            </span>
                          )}
                        </div>
                        {req.notes && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {req.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{req.requester?.name || 'User'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${priorityBadge.bg}`}
                        >
                          {priorityBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {req.approver?.name || req.history?.find((h) => h.action === 'APPROVED')?.actor?.name ? (
                          <div className="font-medium text-slate-800">
                            {req.approver?.name || req.history?.find((h) => h.action === 'APPROVED')?.actor?.name}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="font-bold text-slate-900">
                          {formatRupiah(req.total_amount)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {formatDate(req.created_at)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="text-slate-400 group-hover:text-[#005696] transition-colors inline-block">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
