import { useToastStore } from '../store/toastStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        let bg = 'bg-slate-900 border-slate-800';
        let icon = <Info className="w-5 h-5 text-sky-400" />;

        if (t.type === 'success') {
          bg = 'bg-slate-900 border-emerald-500/30';
          icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
        } else if (t.type === 'error') {
          bg = 'bg-slate-900 border-rose-500/30';
          icon = <AlertCircle className="w-5 h-5 text-rose-400" />;
        } else if (t.type === 'warning') {
          bg = 'bg-slate-900 border-amber-500/30';
          icon = <AlertCircle className="w-5 h-5 text-amber-400" />;
        }

        return (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-3 p-4 rounded-xl border shadow-xl ${bg} backdrop-blur-md animate-slide-in pointer-events-auto transition-all`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <p className="text-sm font-medium text-slate-100">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
