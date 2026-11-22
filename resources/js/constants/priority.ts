import { RequestPriority } from '../types';

export interface PriorityOption {
  value: RequestPriority;
  label: string;
  desc: string;
  badgeClass: string;
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'LOW',
    label: 'Rendah',
    desc: 'Tidak mendesak',
    badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  },
  {
    value: 'MEDIUM',
    label: 'Sedang',
    desc: 'Standar operasional',
    badgeClass: 'bg-[#e6eef5] text-[#004578] ring-1 ring-inset ring-[#b0cbde]',
  },
  {
    value: 'HIGH',
    label: 'Tinggi',
    desc: 'Kebutuhan prioritas',
    badgeClass: 'bg-[#fff7f2] text-[#ad5919] ring-1 ring-inset ring-[#f77f23]/30',
  },
  {
    value: 'URGENT',
    label: 'Mendesak',
    desc: 'Kritis / butuh segera',
    badgeClass: 'bg-[#fcf1f1] text-[#911414] ring-1 ring-inset ring-[#cf1d1d]/30',
  },
];
