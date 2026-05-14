import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ScoreCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  isLoading?: boolean;
  accent?: "primary" | "secondary" | "success" | "warning";
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export const ScoreCard = ({ label, value, icon: Icon, isLoading, accent = "primary" }: ScoreCardProps) => {
  return (
    <div className="bg-card rounded-lg border border-border shadow-card p-3.5 flex items-center gap-3 min-w-0">
      <div className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center ${accentMap[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-6 w-24 mt-1" />
        ) : (
          <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums truncate -tracking-tightest">
            {value}
          </p>
        )}
      </div>
    </div>
  );
};
