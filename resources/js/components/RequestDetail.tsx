import { useState } from 'react';
import { PurchaseRequest, User } from '../types';
import { formatRupiah, formatDate, getStatusBadge, getPriorityBadge } from '../utils/formatters';
import {
  ArrowLeft,
  Check,
  X,
  Send,
  Edit2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { ApproveModal, RejectModal, SubmitModal } from './ActionModals';

interface RequestDetailProps {
  request: PurchaseRequest;
  currentUser: User | null;
  onBack: () => void;
  onEdit: (req: PurchaseRequest) => void;
  onSubmit: (id: number) => void;
  onApprove: (id: number, comment?: string) => void;
  onReject: (id: number, comment: string) => void;
  loadingAction: boolean;
}

export default function RequestDetail({
  request,
  currentUser,
  onBack,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  loadingAction,
}: RequestDetailProps) {
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  const isOwner = currentUser?.id === request.requester_id;
  const isManager = currentUser?.role === 'MANAGER';
  const badge = getStatusBadge(request.status);
  const priorityBadge = getPriorityBadge(request.priority);

  const canEdit = isOwner && request.status === 'DRAFT';
  const canSubmit = isOwner && request.status === 'DRAFT';
  const canApprove = isManager && !isOwner && request.status === 'SUBMITTED';
  const canReject = isManager && !isOwner && request.status === 'SUBMITTED';

  const handleApproveConfirm = (comment?: string) => {
    setShowApproveModal(false);
    onApprove(request.id, comment);
  };

  const handleRejectConfirm = (comment: string) => {
    setShowRejectModal(false);
    onReject(request.id, comment);
  };

  const handleSubmitConfirm = () => {
    setShowSubmitModal(false);
    onSubmit(request.id);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Back & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              onClick={() => onEdit(request)}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Draft</span>
            </button>
          )}

          {canSubmit && (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#004578] hover:bg-[#004d87] active:bg-[#005696] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request</span>
            </button>
          )}

          {canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#286627] hover:bg-[#307c30] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
          )}

          {canReject && (
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#cf1d1d] hover:bg-[#fcf1f1] border border-[#cf1d1d] text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Request Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {request.number}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[#004578] bg-[#e6eef5] ring-1 ring-inset ring-[#b0cbde]">
                v{request.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dibuat oleh <span className="font-semibold text-slate-800">{request.requester?.name}</span>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Nilai
            </div>
            <div className="text-2xl font-bold text-[#004578] mt-0.5">
              {formatRupiah(request.total_amount)}
            </div>
          </div>
        </div>

        {/* Key Metadata Details */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Pemohon</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">{request.requester?.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Prioritas</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">{priorityBadge.label}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Tanggal Dibuat</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{formatDate(request.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Tanggal Diajukan</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {request.submitted_at ? formatDate(request.submitted_at) : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Tanggal Keputusan</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {request.decided_at ? formatDate(request.decided_at) : '—'}
            </span>
          </div>
        </div>

        {request.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Catatan Pengadaan
            </div>
            <p className="text-xs text-slate-700 bg-[#f5f6f9] p-3 rounded-lg border border-slate-200">
              {request.notes}
            </p>
          </div>
        )}
      </div>

      {isManager && isOwner && request.status === 'SUBMITTED' && (
        <div className="p-3.5 rounded-lg bg-[#fff7f2] border border-[#f77f23]/30 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#f77f23] shrink-0 mt-0.5" />
          <div className="text-xs text-[#ad5919]">
            <span className="font-bold">Otorisasi (E2): </span>
            Anda adalah pemohon pengajuan ini. Manajer tidak diizinkan menyetujui atau menolak pengajuan miliknya sendiri.
          </div>
        </div>
      )}

      {/* Items Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          Rincian Barang / Jasa
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">#</th>
                <th className="px-3 py-2.5">Nama Barang / Jasa</th>
                <th className="px-3 py-2.5 text-center w-24">Satuan</th>
                <th className="px-3 py-2.5 text-right w-20">Qty</th>
                <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                <th className="px-3 py-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {request.items?.map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-[#f5f6f9]/60">
                  <td className="px-3 py-3 text-center text-slate-400 font-medium text-[11px]">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{it.name}</td>
                  <td className="px-3 py-3 text-center text-slate-600 font-medium">{it.uom || 'Pcs'}</td>
                  <td className="px-3 py-3 text-right font-medium">{it.qty}</td>
                  <td className="px-3 py-3 text-right font-medium text-slate-600">
                    {formatRupiah(it.unit_price)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900">
                    {formatRupiah(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
              <tr>
                <td colSpan={5} className="px-3 py-3 text-right uppercase text-[11px] tracking-wider text-slate-500">
                  Total Nilai
                </td>
                <td className="px-3 py-3 text-right text-sm font-bold text-[#004578]">
                  {formatRupiah(request.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Audit Trail & Approval History (F7) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#005696]" />
            <span>Riwayat Persetujuan & Audit Trail</span>
          </div>
        </div>

        {!request.history || request.history.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada riwayat aktivitas.</p>
        ) : (
          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {request.history.map((h) => {
              return (
                <div key={h.id} className="relative">
                  {/* Timeline Dot */}
                  <div className="absolute -left-5 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#005696] flex items-center justify-center shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#005696]" />
                  </div>

                  <div className="bg-[#f5f6f9] p-3 rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 text-[11px]">
                          {h.action}
                        </span>

                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-900">
                          {h.actor?.name || 'Sistem'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(h.created_at)}
                      </span>
                    </div>

                    {h.comment && (
                      <p className="mt-2 text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                        {h.comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <SubmitModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmitConfirm}
        loading={loadingAction}
      />
      <ApproveModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApproveConfirm}
        loading={loadingAction}
      />
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectConfirm}
        loading={loadingAction}
      />
    </div>
  );
}
