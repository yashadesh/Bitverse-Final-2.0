import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function PaginatedList({
  items = [],
  renderItem,
  initialLimit = 6,
  increment = 6,
  emptyState = null,
  testId = "paginated-list",
}) {
  const [limit, setLimit] = useState(initialLimit);

  if (!items || items.length === 0) {
    return emptyState;
  }

  const visibleItems = items.slice(0, limit);
  const remaining = items.length - visibleItems.length;

  const handleLoadMore = () => {
    setLimit((prev) => prev + increment);
  };

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="space-y-3 transition-all duration-300">
        {visibleItems.map((item, index) => renderItem(item, index))}
      </div>
      
      {remaining > 0 && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={handleLoadMore}
            className="group flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#00E5D4]/40 text-sm font-mono text-white/70 hover:text-[#00E5D4] hover:shadow-[0_0_15px_rgba(0,229,212,0.1)] hover:bg-[#00E5D4]/5 transition-all duration-300"
            data-testid={`${testId}-load-more`}
          >
            <span>Load More ({remaining} remaining)</span>
            <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-[#00E5D4] transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}
