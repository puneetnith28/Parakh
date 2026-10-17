import { ShieldCheck, Activity } from 'lucide-react';

export interface HeaderProps {
  apiStatus: 'checking' | 'online' | 'offline';
}

export function Header({ apiStatus }: HeaderProps) {
  return (
    <header className="border-b border-[#E2E5DE] bg-white sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#163300] flex items-center justify-center text-[#9FE870] shadow-sm">
            <ShieldCheck className="w-5 h-5 text-[#9FE870] font-bold" />
          </div>
          <div className="flex items-baseline">
            <span className="font-display text-2xl tracking-tight text-[#111111]">Parakh</span>
            <span className="w-2 h-2 rounded-full bg-[#9FE870] ml-1 mb-1" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1 rounded-full bg-[#F2F4F0] text-[#5F625E]">
            <Activity
              className={`w-3.5 h-3.5 ${
                apiStatus === 'online'
                  ? 'text-[#163300]'
                  : apiStatus === 'checking'
                  ? 'text-amber-600 animate-pulse'
                  : 'text-rose-600'
              }`}
            />
            <span className="font-bold">
              API: {apiStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
