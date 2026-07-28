import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-shimmer rounded-lg bg-white/5 border border-white/[0.06]", className)}
      {...props} />
  );
}

export { Skeleton }
