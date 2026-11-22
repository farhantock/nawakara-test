import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Plus } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badgeClass?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  allowCustom = false,
  compact = false,
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  const hasExactMatch = options.some(
    (opt) => opt.value.toLowerCase() === search.trim().toLowerCase()
  );

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = compact ? Math.max(rect.width, 140) : Math.max(rect.width, 220);
    const viewportHeight = window.innerHeight;
    const estimatedHeight = 240;

    let top = rect.bottom + 4;
    // If not enough room below, open above
    if (rect.bottom + estimatedHeight > viewportHeight && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 4;
    }

    setDropdownPos({
      top,
      left: Math.min(rect.left, window.innerWidth - dropdownWidth - 10),
      width: dropdownWidth,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setSearch('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
  };

  const handleSelect = (val: string) => {
    onChange(val);
    handleClose();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleScrollOrResize = () => {
      handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        className={`w-full bg-white border border-slate-300 rounded-md text-slate-800 flex items-center justify-between text-left cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#005696] focus:border-[#005696] disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-1.5 text-xs'
        } ${isOpen ? 'ring-1 ring-[#005696] border-[#005696]' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate flex items-center gap-1.5 min-w-0">
          {selectedOption ? (
            <>
              {selectedOption.badgeClass ? (
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${selectedOption.badgeClass}`}
                >
                  {selectedOption.label}
                </span>
              ) : (
                <span className="font-medium text-slate-900">{selectedOption.label}</span>
              )}
            </>
          ) : value ? (
            <span className="font-medium text-slate-900">{value}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#005696]' : ''
          }`}
        />
      </button>

      {/* Fixed Floating Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
          }}
          className="z-50 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="p-1.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0].value);
                    } else if (allowCustom && search.trim()) {
                      handleSelect(search.trim());
                    }
                  }
                }}
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#005696] focus:border-[#005696]"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 && (!allowCustom || !search.trim()) ? (
              <div className="py-3 px-3 text-center text-slate-400 text-xs">
                Tidak ada pilihan yang cocok
              </div>
            ) : (
              <>
                {filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#e6eef5] text-[#004578] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          {opt.badgeClass ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${opt.badgeClass}`}
                            >
                              {opt.label}
                            </span>
                          ) : (
                            <span className="truncate">{opt.label}</span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#004578] shrink-0" />}
                    </button>
                  );
                })}

                {/* Allow Custom Option */}
                {allowCustom && search.trim() && !hasExactMatch && (
                  <button
                    type="button"
                    onClick={() => handleSelect(search.trim())}
                    className="w-full px-2.5 py-1.5 text-left text-xs text-[#004578] bg-[#f5f6f9] hover:bg-[#e6eef5] flex items-center gap-1.5 cursor-pointer font-medium border-t border-slate-100"
                  >
                    <Plus className="w-3 h-3 text-[#004578]" />
                    <span>
                      Gunakan <strong>"{search.trim()}"</strong>
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
