import { Trophy } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import type { GestorDetalhado } from "@/hooks/useDashboardData";

const medalColor = (rank: number) => {
  if (rank === 0) return "bg-primary text-primary-foreground";
  if (rank === 1) return "bg-secondary text-secondary-foreground";
  if (rank === 2) return "bg-brand-charcoal text-white";
  return "bg-muted text-muted-foreground";
};

interface Props {
  data?: GestorDetalhado[];
  isLoading: boolean;
  error: Error | null;
}

export const GestoresLeaderboard = ({ data, isLoading, error }: Props) => {
  const sorted = [...(data ?? [])].sort((a, b) => b.volume - a.volume);
  const maxVolume = sorted[0]?.volume ?? 1;

  return (
    <ReportCard
      id="gestores"
      title="Desempenho de Gerentes (YTD)"
      subtitle="Comparativo entre gerentes no ano em curso (YTD)"
      action={
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          Leaderboard
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
        <ErrorState message="Sem dados de gerentes." />
      ) : (
        <ul className="space-y-3">
          {sorted.map((g, i) => {
            const pct = (g.volume / maxVolume) * 100;
            return (
              <li
                key={g.gestor}
                className="rounded-md border border-border bg-card hover:bg-muted/30 transition-colors p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${medalColor(i)}`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{g.gestor}</p>
                      <p className="text-sm font-bold text-foreground tabular-nums">
                        {formatBRL(g.volume)}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-orange rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Win Rate:{" "}
                        <span className="font-semibold text-foreground">{formatPercent(g.win_rate)}</span>
                      </span>
                      <span>
                        Negócios:{" "}
                        <span className="font-semibold text-foreground">{formatNumber(g.qtd_negocios)}</span>
                      </span>
                      <span>
                        Ticket Médio:{" "}
                        <span className="font-semibold text-foreground">{formatBRL(g.ticket_medio)}</span>
                      </span>
                      <span>
                        Tempo médio:{" "}
                        <span className="font-semibold text-foreground">
                          {Math.round(g.dias_medios_fechamento)} d
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ReportCard>
  );
};
