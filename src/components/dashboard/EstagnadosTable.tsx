import { AlertTriangle } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NegocioEstagnado } from "@/hooks/useDashboardData";

interface Props {
  data?: NegocioEstagnado[];
  isLoading: boolean;
  error: Error | null;
  title?: string;
  maxRows?: number;
}

/** > 30 dias: vermelho · 16–30: laranja · ≤ 15: neutro */
const diasBadge = (dias: number) => {
  if (dias > 30) return "text-red-500 bg-red-500/20 border-red-500/30";
  if (dias >= 16) return "text-orange-500 bg-orange-500/20 border-orange-500/30";
  return "text-slate-300 bg-slate-800/60 border-slate-700/50";
};

export const EstagnadosTable = ({
  data,
  isLoading,
  error,
  title = "Negócios Exigindo Atenção (Estagnados > 15 dias)",
  maxRows = 8,
}: Props) => {
  const rows = (data ?? []).slice(0, maxRows);
  const totalRisco = rows.reduce((s, r) => s + r.valor, 0);

  return (
    <ReportCard
      id="estagnados"
      title={title}
      subtitle={
        isLoading
          ? "Identificando negócios em risco…"
          : `${formatNumber(rows.length)} negócios · ${formatBRL(totalRisco)} em risco`
      }
      action={
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[11px] font-semibold border border-red-500/25">
          <AlertTriangle className="h-3 w-3" />
          Atenção
        </span>
      }
    >
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : rows.length === 0 ? (
        <ErrorState message="Nenhum negócio estagnado." />
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 sm:px-5 py-2 font-medium">Negócio</th>
                <th className="px-3 py-2 font-medium">Gerente</th>
                <th className="px-3 py-2 font-medium text-right">Dias Parado</th>
                <th className="px-4 sm:px-5 py-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id || `${r.negocio}-${r.empresa}`}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 sm:px-5 py-2.5 min-w-0">
                    <p className="font-medium text-slate-100 truncate max-w-[280px]">{r.negocio}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{r.empresa}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                    {r.gestor_nome || r.gerente || r.gestor || "Não Atribuído"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[2.75rem] px-2 py-0.5 rounded-md border text-xs font-bold tabular-nums",
                        diasBadge(r.dias_parado)
                      )}
                    >
                      {r.dias_parado}d
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-right font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                    {formatBRL(r.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportCard>
  );
};
