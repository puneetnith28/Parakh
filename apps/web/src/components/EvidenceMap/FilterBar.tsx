import { Search, X, Filter } from "lucide-react";
import { EvidenceStatus } from "@parakh/contracts";

export type FilterStatus = "all" | EvidenceStatus | "gaps_only";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories?: string[];
  counts?: {
    total: number;
    demonstrated: number;
    partially_demonstrated: number;
    not_demonstrated: number;
    needs_review: number;
  };
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedCategory,
  onCategoryChange,
  categories = [
    "all",
    "frontend",
    "backend",
    "database",
    "devops",
    "architecture",
    "security",
    "testing",
    "general",
  ],
  counts,
}: FilterBarProps) {
  const statusChips: { id: FilterStatus; label: string; count?: number; activeClass: string }[] = [
    {
      id: "all",
      label: "All Items",
      count: counts?.total,
      activeClass: "bg-slate-200 text-slate-900 border-slate-200 shadow-sm",
    },
    {
      id: "demonstrated",
      label: "Demonstrated",
      count: counts?.demonstrated,
      activeClass: "bg-emerald-500 text-emerald-950 font-semibold border-emerald-400 shadow-sm",
    },
    {
      id: "partially_demonstrated",
      label: "Partial",
      count: counts?.partially_demonstrated,
      activeClass: "bg-amber-400 text-amber-950 font-semibold border-amber-300 shadow-sm",
    },
    {
      id: "not_demonstrated",
      label: "Not Found",
      count: counts?.not_demonstrated,
      activeClass: "bg-slate-600 text-slate-100 font-semibold border-slate-500 shadow-sm",
    },
    {
      id: "needs_review",
      label: "Needs Review",
      count: counts?.needs_review,
      activeClass: "bg-indigo-400 text-indigo-950 font-semibold border-indigo-300 shadow-sm",
    },
    {
      id: "gaps_only",
      label: "Gaps Only",
      count:
        counts ? (counts.partially_demonstrated || 0) + (counts.not_demonstrated || 0) : undefined,
      activeClass: "bg-rose-500 text-white font-semibold border-rose-400 shadow-sm",
    },
  ];

  return (
    <div className="p-4 rounded-2xl bg-neutral-950/75 border border-red-950/40 backdrop-blur-md space-y-3.5 shadow-xl">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Instant Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search requirements, rationales, citations..."
            className="w-full bg-black/60 border border-neutral-800 text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/70 focus:border-red-500/70 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-200 rounded-md transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Domain Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-black/60 border border-neutral-800 text-zinc-300 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-neutral-800/60">
        <span className="text-[11px] font-medium text-zinc-500 mr-1 uppercase tracking-wider">
          Filter:
        </span>
        {statusChips.map((chip) => {
          const isActive = statusFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onStatusFilterChange(chip.id)}
              className={`px-2.5 py-1 rounded-lg text-xs transition border flex items-center gap-1.5 ${
                isActive
                  ? chip.activeClass
                  : "bg-black/40 text-zinc-400 border-neutral-800/80 hover:border-neutral-700 hover:text-zinc-200"
              }`}
            >
              <span>{chip.label}</span>
              {typeof chip.count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-black/20 text-current" : "bg-neutral-800 text-zinc-400"
                  }`}
                >
                  {chip.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
