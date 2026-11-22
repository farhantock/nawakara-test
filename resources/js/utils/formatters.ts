import { RequestPriority, RequestStatus } from '../types';

export function formatRupiah(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }
  const isInt = Number.isInteger(amount);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return (
    new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date) + ' WIB'
  );
}

export interface StatusBadgeConfig {
  label: string;
  bg: string;
  dot: string;
}

export function getStatusBadge(status: RequestStatus): StatusBadgeConfig {
  switch (status) {
    case 'DRAFT':
      return {
        label: 'Draft',
        bg: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
        dot: 'bg-slate-400',
      };
    case 'SUBMITTED':
      return {
        label: 'Submitted',
        bg: 'bg-[#fff7f2] text-[#ad5919] ring-1 ring-inset ring-[#f77f23]/25',
        dot: 'bg-[#f77f23] animate-pulse',
      };
    case 'APPROVED':
      return {
        label: 'Approved',
        bg: 'bg-[#f3f8f3] text-[#286627] ring-1 ring-inset ring-[#399238]/25',
        dot: 'bg-[#399238]',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        bg: 'bg-[#fcf1f1] text-[#911414] ring-1 ring-inset ring-[#cf1d1d]/25',
        dot: 'bg-[#cf1d1d]',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

export interface PriorityBadgeConfig {
  label: string;
  bg: string;
}

export function getPriorityBadge(priority?: RequestPriority | null): PriorityBadgeConfig {
  switch (priority) {
    case 'LOW':
      return {
        label: 'Rendah',
        bg: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
      };
    case 'MEDIUM':
      return {
        label: 'Sedang',
        bg: 'bg-[#e6eef5] text-[#004578] ring-1 ring-inset ring-[#b0cbde]',
      };
    case 'HIGH':
      return {
        label: 'Tinggi',
        bg: 'bg-[#fff7f2] text-[#ad5919] ring-1 ring-inset ring-[#f77f23]/30',
      };
    case 'URGENT':
      return {
        label: 'Mendesak',
        bg: 'bg-[#fcf1f1] text-[#911414] ring-1 ring-inset ring-[#cf1d1d]/30',
      };
    default:
      return {
        label: 'Sedang',
        bg: 'bg-[#e6eef5] text-[#004578] ring-1 ring-inset ring-[#b0cbde]',
      };
  }
}
