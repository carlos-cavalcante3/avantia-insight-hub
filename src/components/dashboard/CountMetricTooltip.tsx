import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBRL } from "@/lib/format";

export interface CountDetailLine {
  label: string;
  sublabel?: string;
  valor?: number;
}

interface CountMetricTooltipProps {
  count: number;
  unitLabel: string;
  lines: CountDetailLine[];
  children: ReactNode;
  emptyLabel?: string;
}

export const CountMetricTooltip = ({
  count,
  unitLabel,
  lines,
  children,
  emptyLabel = "Sem registros detalhados.",
}: CountMetricTooltipProps) => {
  const hasDetails = lines.length > 0;

  if (!hasDetails) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-4">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-sm border-slate-800/60 bg-slate-900 p-3 shadow-xl"
        >
          <p className="text-xs font-semibold text-slate-100 mb-1">
            {count} {unitLabel}
          </p>
          <ScrollArea className="max-h-64 pr-2">
            <div className="space-y-1.5">
              {lines.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className="flex items-start justify-between gap-3 border-b border-slate-800/50 pb-1.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{line.label}</p>
                    {line.sublabel && (
                      <p className="text-[10px] text-slate-400 truncate">{line.sublabel}</p>
                    )}
                  </div>
                  {line.valor != null && (
                    <span className="text-xs font-semibold text-blue-400 tabular-nums shrink-0">
                      {formatBRL(line.valor)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          {!lines.length && <p className="text-xs text-slate-400">{emptyLabel}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
