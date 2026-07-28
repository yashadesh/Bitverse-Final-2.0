import { Skeleton } from "@/components/ui/skeleton";

export function FileCardSkeleton() {
  return (
    <div className="file-row animate-shimmer pointer-events-none opacity-90" data-testid="file-card-skeleton">
      <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-white/15 rounded-md w-3/5" />
        <div className="h-3 bg-white/5 rounded-md w-2/5" />
      </div>
      <div className="w-20 h-9 rounded-full bg-white/10 border border-white/10 shrink-0" />
    </div>
  );
}

export function SubjectCardSkeleton() {
  return (
    <div className="card-glass p-6 flex items-center gap-4 h-28 animate-shimmer pointer-events-none" data-testid="subject-card-skeleton">
      <div className="w-12 h-12 rounded-xl bg-[#00E5D4]/10 border border-[#00E5D4]/20 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-white/15 rounded-md w-4/5" />
        <div className="h-3 bg-white/5 rounded-md w-2/5" />
      </div>
      <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
    </div>
  );
}

export function ModuleCardSkeleton() {
  return (
    <div className="card-glass p-6 flex items-center gap-4 h-28 animate-shimmer pointer-events-none" data-testid="module-card-skeleton">
      <div className="w-12 h-12 rounded-xl bg-[#00E5D4]/10 border border-[#00E5D4]/20 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 bg-white/15 rounded-md w-3/4" />
        <div className="h-3 bg-[#00E5D4]/15 rounded-md w-1/3" />
      </div>
      <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-4 mb-8 animate-shimmer" data-testid="header-skeleton">
      <div className="h-6 w-32 bg-[#00E5D4]/10 border border-[#00E5D4]/20 rounded-full" />
      <div className="h-10 md:h-12 w-3/4 max-w-lg bg-white/15 rounded-2xl" />
      <div className="h-4 w-1/2 max-w-md bg-white/5 rounded-lg" />
    </div>
  );
}

export function ResourceGridSkeleton({ count = 6, type = "subject" }) {
  const Component = type === "module" ? ModuleCardSkeleton : type === "file" ? FileCardSkeleton : SubjectCardSkeleton;
  
  if (type === "file") {
    return (
      <div className="space-y-3 mt-6" data-testid="resource-file-grid-skeleton">
        {Array.from({ length: count }).map((_, i) => (
          <FileCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6" data-testid="resource-grid-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}

export function BookAccordionSkeleton() {
  return (
    <div className="card-glass overflow-hidden animate-shimmer p-5 flex items-center gap-4" data-testid="book-accordion-skeleton">
      <div className="w-11 h-11 rounded-xl bg-[#00E5D4]/10 border border-[#00E5D4]/20 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/15 rounded-md w-1/2" />
        <div className="h-3 bg-white/5 rounded-md w-1/4" />
      </div>
      <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
    </div>
  );
}

export function TreeSkeleton() {
  return (
    <div className="card-glass p-8 flex flex-col items-center justify-center min-h-[380px] animate-shimmer w-full" data-testid="tree-skeleton">
      <div className="w-16 h-16 rounded-full bg-[#00E5D4]/15 border border-[#00E5D4]/30 mb-8" />
      <div className="flex justify-around w-full max-w-md mb-8">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="w-12 h-12 rounded-full bg-white/10" />
      </div>
      <div className="flex justify-between w-full max-w-lg">
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div className="w-10 h-10 rounded-full bg-white/5" />
      </div>
    </div>
  );
}
