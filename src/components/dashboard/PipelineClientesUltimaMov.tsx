import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber } from "@/lib/format";
import type { UltimaMovEmpresa } from "@/hooks/useDashboardData";

const PAGE_SIZE = 8;

const diasDesde = (iso: string | null): number | null => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const formatRelative = (iso: string | null): string => {
  const d = diasDesde(iso);
  if (d === null) return "—";
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  if (d < 30) return `há ${d} dias`;
  if (d < 60) return `há ${Math.floor(d / 7)} semanas`;
  return `há ${Math.floor(d / 30)} meses`;
};

const movBadge = (iso: string | null): string => {
  const d = diasDesde(iso) ?? 999;
  if (d <= 7) return "bg-success/10 text-success border-success/30";
  if (d <= 30) return "bg-primary/10 text-primary border-primary/20";
  if (d <= 60) return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
};

interface Props {
  data?: UltimaMovEmpresa[];
  isLoading: boolean;
  error: Error | null;
  sectorLabel?: string;
  setorSelecionado?: string;
  title?: string;
  subtitle?: string;
}

export const PipelineClientesUltimaMov = ({
  data,
  isLoading,
  error,
  sectorLabel,
  setorSelecionado,
  title = "Pipeline por Cliente",
  subtitle,
}: Props) => {
  const [page, setPage] = useState(0);
  const dadosFiltrados = useMemo(() => {
    const base = data ?? [];
    if (!setorSelecionado) return base;
    const setorNorm = setorSelecionado.toLowerCase();
    return base.filter((item) => {
      const pipeline = String(item.pipeline_nome ?? "").toLowerCase();
      return pipeline.includes(setorNorm);
    });
  }, [data, setorSelecionado]);
  const dadosFiltradosDoSetor = dadosFiltrados;
  const sorted = useMemo(
    () => [...dadosFiltradosDoSetor].sort((a, b) => b.valor_estimado - a.valor_estimado),
    [dadosFiltradosDoSetor]
  );
  useEffect(() => {
    setPage(0);
  }, [data]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <ReportCard
      id="pipeline-cliente"
      title={title}
      subtitle={
        subtitle ??
        isLoading
          ? "Carregando empresas…"
          : `${sorted.length} empresas com negócios em aberto · ${
              sectorLabel ? `${sectorLabel} · ` : ""
            }ordenadas por valor`
      }
      action={
        !isLoading ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted/40 px-2 text-xs font-semibold text-foreground">
            {dadosFiltradosDoSetor.length}
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : sorted.length === 0 ? (
        <ErrorState message="Nenhuma empresa com pipeline aberto." />
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-5 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium text-right">Negócios</th>
                  <th className="px-3 py-2 font-medium text-right">Valor Estimado</th>
                  <th className="px-4 sm:px-5 py-2 font-medium text-right">Última Movimentação</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <tr
                    key={row.empresa}
                    className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-2.5 font-medium text-foreground truncate max-w-[280px]">
                      {row.empresa}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
                        {formatNumber(row.total_abertos)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatBRL(row.valor_estimado)}
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${movBadge(
                          row.ultima_movimentacao
                        )}`}
                      >
                        {formatRelative(row.ultima_movimentacao)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Página <span className="font-semibold text-foreground">{page + 1}</span> de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </ReportCard>
  );
};
