import { AlertTriangle, Clock } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropostaEstagnada } from "@/data/mockData";

const severity = (dias: number) => {
  if (dias >= 40) return { label: "Crítico", classes: "bg-destructive/10 text-destructive border-destructive/30" };
  if (dias >= 30) return { label: "Alto", classes: "bg-warning/10 text-warning border-warning/30" };
  return { label: "Atenção", classes: "bg-primary/10 text-primary border-primary/30" };
};

interface Props {
  data?: PropostaEstagnada[];
  isLoading: boolean;
  error: Error | null;
}

export const PropostasEstagnadasList = ({ data, isLoading, error }: Props) => {
  const sorted = [...(data ?? [])].sort((a, b) => b.dias_sem_interacao - a.dias_sem_interacao);
  const totalRisco = sorted.reduce((s, d) => s + d.valor, 0);

  return (
    <ReportCard
      id="estagnadas"
      title="Propostas Estagnadas"
      subtitle={
        isLoading
          ? "Identificando negócios em risco…"
          : `${sorted.length} negócios sem interação · ${formatBRL(totalRisco)} em risco`
      }
      action={
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" />
          Atenção
        </span>
      }
    >
      {isLoading ? (
        <ul className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </ul>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : sorted.length === 0 ? (
        <ErrorState message="Nenhuma proposta estagnada — bom trabalho!" />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {sorted.map((p) => {
              const sev = severity(p.dias_sem_interacao);
              return (
                <li key={p.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start gap-3">
                    <div
                      className={cn(
                        "shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-md border",
                        sev.classes
                      )}
                    >
                      <span className="text-lg font-bold leading-none tabular-nums">{p.dias_sem_interacao}</span>
                      <span className="text-[10px] uppercase tracking-wider mt-0.5">dias</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-semibold text-foreground truncate">{p.negocio}</p>
                        <p className="font-bold text-foreground tabular-nums">{formatBRL(p.valor)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.empresa} · {p.fase}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-muted-foreground">
                          Gerente: <span className="text-foreground font-medium">{p.gestor}</span>
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            sev.classes
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {sev.label}
                        </span>
                        <span className="text-muted-foreground font-mono">{p.id}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            Total de propostas listadas: {formatNumber(sorted.length)}
          </p>
        </>
      )}
    </ReportCard>
  );
};
