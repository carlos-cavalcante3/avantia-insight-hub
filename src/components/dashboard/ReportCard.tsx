import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ReportCard = ({ id, title, subtitle, action, children, className }: ReportCardProps) => (
  <section
    id={id}
    className={cn(
      "bg-card/95 backdrop-blur-sm rounded-lg border border-border/70 shadow-lg shadow-slate-200/50 p-4 sm:p-5 animate-fade-in-up transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
      className
    )}
  >
    <header className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);
