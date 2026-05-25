import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  colorDot?: string; // e.g. '#10b981' for active, '#64748b' for inactive
}

interface Props {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CustomSelect({ options, value, onChange, className = '', placeholder = 'Select option' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-slate-950/60 hover:bg-slate-900/60 border ${
          isOpen ? 'border-brand-500/50 ring-2 ring-brand-500/20' : 'border-slate-800/80'
        } rounded-xl text-slate-200 text-sm font-semibold select-none cursor-pointer transition-all duration-200 focus:outline-none`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.colorDot && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.colorDot }}
            ></span>
          )}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-400' : ''}`}
        />
      </button>

      {/* Options Panel Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-[#090d16]/95 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden z-[1000] animate-scale-up py-1.5 max-h-60 overflow-y-auto">
          {/* Subtle inside gradient sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.02] to-transparent pointer-events-none"></div>

          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold leading-normal transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-slate-350 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.colorDot && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'shadow-[0_0_6px_currentColor]' : ''}`}
                      style={{ backgroundColor: opt.colorDot }}
                    ></span>
                  )}
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
