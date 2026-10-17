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
      activeClass: "bg-[#9FE870] text-[#163300] font-bold border-[#9FE870] shadow-xs",
    },
    {
      id: "partially_demonstrated",
      label: "Partial",
      count: counts?.partially_demonstrated,
      activeClass: "bg-amber-100 text-amber-900 font-bold border-amber-300 shadow-xs",
    },
    {
      id: "not_demonstrated",
      label: "Not Found",
      count: counts?.not_demonstrated,
      activeClass: "bg-slate-200 text-slate-800 font-bold border-slate-300 shadow-xs",
    },
    {
      id: "needs_review",
      label: "Needs Review",
      count: counts?.needs_review,
      activeClass: "bg-sky-100 text-sky-900 font-bold border-sky-300 shadow-xs",
    },
    {
      id: "gaps_only",
      label: "Gaps Only",
      count:
        counts ? (counts.partially_demonstrated || 0) + (counts.not_demonstrated || 0) : undefined,
      activeClass: "bg-rose-100 text-rose-900 font-bold border-rose-300 shadow-xs",
    },
  ];

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#E2E5DE] space-y-3.5 shadow-xs">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Instant Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#828580] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search requirements, rationales, citations..."
            className="w-full bg-[#F2F4F0] border border-[#E2E5DE] text-[#111111] placeholder-[#828580] text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#163300] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#5F625E] hover:text-[#111111] rounded-md transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Domain Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-[#5F625E] shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-[#F2F4F0] border border-[#E2E5DE] text-[#111111] text-xs sm:text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#163300] cursor-pointer"
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
      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#E2E5DE]">
        <span className="text-[11px] font-bold text-[#5F625E] mr-1 uppercase tracking-wider">
          Filter:
        </span>
        {statusChips.map((chip) => {
          const isActive = statusFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onStatusFilterChange(chip.id)}
              className={`px-3 py-1.5 rounded-full text-xs transition border flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? chip.activeClass
                  : "bg-[#F2F4F0] text-[#5F625E] border-[#E2E5DE] hover:border-[#163300]/40 hover:text-[#111111]"
              }`}
            >
              <span>{chip.label}</span>
              {typeof chip.count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-black/10 text-current font-bold" : "bg-white text-[#5F625E] border border-[#E2E5DE]"
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
