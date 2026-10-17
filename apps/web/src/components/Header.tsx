import { ShieldCheck, Activity } from "lucide-react";

interface HeaderProps {
  apiStatus: "checking" | "online" | "offline";
}

export function Header({ apiStatus }: HeaderProps) {
  return (
    <header className="border-b border-red-950/40 bg-black/60 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-400 flex items-center justify-center shadow-lg shadow-red-500/25 ring-1 ring-red-400/30">
            <ShieldCheck className="w-6 h-6 text-white font-bold" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Parakh</span>
            <span className="text-xs text-rose-300 font-mono ml-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
              ORIGINKIT ARC
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Activity
              className={`w-3.5 h-3.5 ${
                apiStatus === "online"
                  ? "text-red-400 animate-pulse"
                  : apiStatus === "checking"
                    ? "text-amber-400"
                    : "text-rose-600"
              }`}
            />
            <span
              className={
                apiStatus === "online"
                  ? "text-red-300"
                  : apiStatus === "checking"
                    ? "text-amber-400"
                    : "text-rose-500"
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
