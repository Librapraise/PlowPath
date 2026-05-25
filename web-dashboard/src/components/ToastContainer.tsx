import { useEffect, useState } from 'react';
import { useToastStore } from '../store/toastStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

function ToastItem({ id, message, type }: { id: string; message: string; type: string }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = 4500;
    const interval = 50;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => Math.max(prev - step, 0));
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(id), 300);
  };

  let borderColor = 'border-sky-500/25';
  let progressColor = 'bg-sky-400';
  let icon = <Info className="w-5 h-5 text-sky-400" />;

  if (type === 'success') {
    borderColor = 'border-emerald-500/25';
    progressColor = 'bg-emerald-400';
    icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
  } else if (type === 'error') {
    borderColor = 'border-rose-500/25';
    progressColor = 'bg-rose-400';
    icon = <AlertCircle className="w-5 h-5 text-rose-400" />;
  } else if (type === 'warning') {
    borderColor = 'border-amber-500/25';
    progressColor = 'bg-amber-400';
    icon = <AlertCircle className="w-5 h-5 text-amber-400" />;
  }

  return (
    <div
      className={`flex flex-col rounded-xl border ${borderColor} shadow-xl glass-panel overflow-hidden pointer-events-auto transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100 animate-slide-in'
      }`}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          {icon}
          <p className="text-sm font-medium text-slate-100">{message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-200 transition-colors rounded-md p-0.5 hover:bg-white/5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="h-[2px] w-full bg-slate-800/50">
        <div
          className={`h-full ${progressColor} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%`, opacity: 0.6 }}
        ></div>
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} />
      ))}
    </div>
  );
}
