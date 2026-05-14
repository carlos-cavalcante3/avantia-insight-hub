import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: number;        // %, sinal indica positivo/negativo
  icon: LucideIcon;
  hint?: string;
  invertedDelta?: boolean; // ex: para "abertos" ou "estagnados", subir pode ser ruim
}

export const KpiCard = ({ label, value, delta, icon: Icon, hint, invertedDelta }: KpiCardProps) => {
  const positive = (delta ?? 0) >= 0;
  const isGood = invertedDelta ? !positive : positive;

  return (
    <div className="group relative bg-card rounded-lg border border-border shadow-card p-5 transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold -tracking-tightest text-foreground">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className="mt-4 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1).replace(".", ",")}%
          </span>
          <span className="text-xs text-muted-foreground">vs período anterior</span>
        </div>
      )}
    </div>
  );
};
