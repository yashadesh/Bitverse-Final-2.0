import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs font-mono uppercase tracking-widest mb-6 animate-fade-in text-white/50"
      data-testid="breadcrumbs-nav"
    >
      {/* Home element */}
      <div className="flex items-center">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 text-white/40 hover:text-[#00E5D4] transition-colors duration-200 py-1"
          title="Back to Home"
          data-testid="breadcrumb-home"
        >
          <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
      </div>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1.5 md:gap-2">
            <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
            {isLast ? (
              <span 
                className="text-[#00E5D4] font-semibold select-none truncate max-w-[150px] md:max-w-[240px] py-1"
                aria-current="page"
                data-testid={`breadcrumb-active-${index}`}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-white/40 hover:text-[#00E5D4] transition-colors duration-200 truncate max-w-[120px] md:max-w-[200px] py-1"
                data-testid={`breadcrumb-link-${index}`}
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
