import { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { LogOut, ShieldCheck, User as UserIcon, ChevronDown } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isManager = user?.role === 'MANAGER';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="bg-[#004578] border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="w-full px-6 sm:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-white tracking-tight">
              Purchase Request System
            </span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-white/20 ${
                dropdownOpen ? 'bg-white/15' : 'hover:bg-white/10'
              }`}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">{user?.name}</div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-white/70 group-hover:text-white transition-transform duration-150 ${
                  dropdownOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* User Info Header */}
                <div className="px-2.5 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#e6eef5] border border-[#b0cbde] flex items-center justify-center text-[#004578] font-bold text-[11px] shrink-0">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{user?.name}</span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-px rounded border shrink-0 ${isManager
                            ? 'bg-[#004578] text-white border-[#004578]'
                            : 'bg-[#e6eef5] text-[#004578] border-[#b0cbde]'
                            }`}
                        >
                          <span>{isManager ? 'Manajer' : 'Karyawan'}</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-[#cf1d1d] hover:bg-[#fcf1f1] rounded-md transition-colors cursor-pointer text-left group"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#cf1d1d] transition-colors" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
