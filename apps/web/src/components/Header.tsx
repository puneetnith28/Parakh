import { ShieldCheck, Activity } from "lucide-react";

interface HeaderProps {
  apiStatus: "checking" | "online" | "offline";
}

export function Header({ apiStatus }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Parakh</span>
            <span className="text-xs text-emerald-400 font-mono ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              MVP
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Activity
              className={`w-3.5 h-3.5 ${
                apiStatus === "online"
                  ? "text-emerald-400 animate-pulse"
                  : apiStatus === "checking"
                    ? "text-amber-400"
                    : "text-rose-400"
              }`}
            />
            <span
              className={
                apiStatus === "online"
                  ? "text-emerald-400"
                  : apiStatus === "checking"
                    ? "text-amber-400"
                    : "text-rose-400"
              }
            >
              API: {apiStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
