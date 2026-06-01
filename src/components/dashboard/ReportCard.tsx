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
      "rounded-lg border border-blue-950/50 bg-card p-4 sm:p-5 shadow-lg animate-fade-in-up transition-shadow duration-300 hover:shadow-xl",
      className
    )}
  >
    <header className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-slate-50 truncate">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);
