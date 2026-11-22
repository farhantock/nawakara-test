import React, { useState, useEffect, useRef } from 'react';
import * as yup from 'yup';
import { Check, X, Send } from 'lucide-react';

const rejectReasonSchema = yup.object({
  comment: yup
    .string()
    .trim()
    .required('Alasan penolakan wajib diisi sesuai aturan bisnis (F6).')
    .max(1000, 'Alasan penolakan maksimal 1.000 karakter.'),
});

const approveCommentSchema = yup.object({
  comment: yup
    .string()
    .trim()
    .nullable()
    .max(1000, 'Catatan maksimal 1.000 karakter.'),
});

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment?: string) => void;
  loading: boolean;
}

export function ApproveModal({ isOpen, onClose, onConfirm, loading }: ApproveModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [comment, setComment] = useState<string>('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        onClose();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await approveCommentSchema.validate({ comment: comment.trim() || null });
      onConfirm(comment.trim() || undefined);
    } catch {
      onConfirm(undefined);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto rounded-xl p-0 bg-transparent shadow-2xl max-w-md w-full border-0 focus:outline-none backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs"
      aria-labelledby="approve-modal-title"
    >
      <div className="bg-white rounded-xl w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f3f8f3] text-[#286627] flex items-center justify-center border border-[#399238]/30">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h3 id="approve-modal-title" className="text-sm font-bold text-slate-900">Setujui Purchase Request</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Persetujuan (Opsional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tambahkan catatan jika diperlukan..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#399238] focus:border-[#399238] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-[#286627] hover:bg-[#307c30] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Menyetujui...' : 'Konfirmasi Setujui'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  loading: boolean;
}

export function RejectModal({ isOpen, onClose, onConfirm, loading }: RejectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        onClose();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rejectReasonSchema.validate({ comment: comment.trim() });
      setError('');
      onConfirm(comment.trim());
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        setError(err.message);
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto rounded-xl p-0 bg-transparent shadow-2xl max-w-md w-full border-0 focus:outline-none backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs"
      aria-labelledby="reject-modal-title"
    >
      <div className="bg-white rounded-xl w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#fcf1f1] text-[#911414] flex items-center justify-center border border-[#cf1d1d]/30">
            <X className="w-5 h-5" />
          </div>
          <div>
            <h3 id="reject-modal-title" className="text-sm font-bold text-slate-900">Tolak Purchase Request</h3>
            <p className="text-[11px] text-slate-500">Transisi status ke Rejected (Final)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alasan Penolakan <span className="text-[#cf1d1d]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError('');
              }}
              placeholder="Jelaskan alasan penolakan untuk pemohon..."
              className={`w-full px-3 py-2 text-xs border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 ${error
                ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-300 focus:ring-[#cf1d1d] focus:border-[#cf1d1d]'
                }`}
            />
            {error && <p className="text-[11px] text-[#cf1d1d] mt-1 font-semibold">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-[#cf1d1d] hover:bg-[#b01919] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Menolak...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function SubmitModal({ isOpen, onClose, onConfirm, loading }: SubmitModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        onClose();
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto rounded-xl p-0 bg-transparent shadow-2xl max-w-md w-full border-0 focus:outline-none backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs"
      aria-labelledby="submit-modal-title"
    >
      <div className="bg-white rounded-xl w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#e6eef5] text-[#004578] flex items-center justify-center border border-[#b0cbde]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 id="submit-modal-title" className="text-sm font-bold text-slate-900">Submit Purchase Request?</h3>
            <p className="text-[11px] text-slate-500">Ajukan ke manajer untuk ditinjau</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Setelah diajukan, status berubah menjadi <strong>Submitted</strong> dan seluruh rincian item barang akan terkunci dari pengeditan.
        </p>

        <div className="flex justify-end gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-[#004578] hover:bg-[#004d87] active:bg-[#005696] text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Mengajukan...' : 'Ya, Submit Sekarang'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
