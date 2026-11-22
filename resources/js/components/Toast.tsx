import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  title?: string;
  duration?: number;
}

const TOAST_STYLES: Record<
  ToastType,
  {
    icon: typeof CheckCircle2;
    defaultTitle: string;
    iconBg: string;
    iconColor: string;
    barColor: string;
    ringColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    defaultTitle: 'Berhasil',
    iconBg: 'bg-[#f3f8f3]',
    iconColor: 'text-[#399238]',
    barColor: 'bg-[#399238]',
    ringColor: 'ring-[#399238]/20',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: 'Terjadi Kesalahan',
    iconBg: 'bg-[#fcf1f1]',
    iconColor: 'text-[#cf1d1d]',
    barColor: 'bg-[#cf1d1d]',
    ringColor: 'ring-[#cf1d1d]/20',
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'Peringatan',
    iconBg: 'bg-[#fff7f2]',
    iconColor: 'text-[#f77f23]',
    barColor: 'bg-[#f77f23]',
    ringColor: 'ring-[#f77f23]/20',
  },
  info: {
    icon: Info,
    defaultTitle: 'Informasi',
    iconBg: 'bg-[#e6eef5]',
    iconColor: 'text-[#005696]',
    barColor: 'bg-[#005696]',
    ringColor: 'ring-[#005696]/20',
  },
};

export default function Toast({
  message,
  type,
  onClose,
  title,
  duration = 4000,
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const config = TOAST_STYLES[type];
  const Icon = config.icon;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!duration || duration <= 0 || isPaused) return;
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, isPaused]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`fixed top-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm transition-all duration-200 ease-out ${visible
        ? 'translate-y-0 opacity-100 scale-100'
        : 'translate-y-2 opacity-0 scale-95'
        }`}
    >
      <div className="relative overflow-hidden rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.16)]">
        <div className="flex items-start gap-3 p-3.5 pr-3">
          {/* Icon Badge */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${config.iconBg} ${config.iconColor} ${config.ringColor}`}
          >
            <Icon className="h-4 w-4" />
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              {title ?? config.defaultTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed break-words">
              {message}
            </p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup notifikasi"
            title="Tutup notifikasi"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Accent Line di bagian bawah */}
        <div className={`h-0.5 w-full ${config.barColor} opacity-80`} />
      </div>
    </div>
  );
}