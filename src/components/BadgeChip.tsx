import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BadgeChipProps {
  children: ReactNode;
  className?: string;
}

export function BadgeChip({ children, className }: BadgeChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20", className)}>
      {children}
    </span>
  );
}
