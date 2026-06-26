import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatBRL, formatNumber } from "@/lib/format";
import type { UltimaMovEmpresa } from "@/hooks/useDashboardData";

import {
  formatRelativeMovimentacao,
  movBadgeClass,
} from "@/lib/movimentacaoAlerts";

const PAGE_SIZE = 8;

const NegocioPopoverList = ({
  empresa,
  items,
}: {
  empresa: string;
  items: NonNullable<UltimaMovEmpresa["negocios_detalhados"]>;
}) => (
  <div className="w-72">
    <p className="text-xs font-semibold text-slate-100 mb-1 truncate">{empresa}</p>
    <p className="text-[10px] text-slate-400 mb-2">{items.length} negócios em aberto</p>
    <ScrollArea className="h-72 w-full rounded-md">
      <div className="space-y-2 pr-3">
        {items.map((item, index) => (
          <div
            key={`${item.nome}-${index}`}
            className="space-y-0.5 border-b border-slate-700/60 pb-2 last:border-0 last:pb-0"
          >
            <p className="font-medium text-slate-100 leading-snug text-xs">
              {item.nome || "Oportunidade"}
            </p>
            <p className="text-slate-300 text-xs">{item.gerente || "—"}</p>
            <p className="font-semibold text-blue-400 tabular-nums text-xs">
              {formatBRL(Number(item.valor ?? 0))}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

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
  const sorted = useMemo(
    () => [...dadosFiltrados].sort((a, b) => b.valor_estimado - a.valor_estimado),
    [dadosFiltrados]
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
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800/60 px-2 text-xs font-semibold text-slate-100">
            {dadosFiltrados.length}
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : sorted.length === 0 ? (
        <ErrorState message="Nenhuma empresa com pipeline aberto." />
      ) : (
        <>
          <div className="w-full">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col />
                <col style={{ width: "72px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2 font-medium">Empresa</th>
                  <th className="px-2 py-2 font-medium text-right">Neg.</th>
                  <th className="px-2 py-2 font-medium text-right">Valor</th>
                  <th className="px-2 py-2 font-medium text-right">Últ. Mov.</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => {
                  const negocios = row.negocios_detalhados ?? [];
                  const hasPopover = negocios.length > 0;
                  return (
                    <tr
                      key={row.empresa}
                      className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-2 py-2.5 font-medium text-slate-100 truncate">
                        {row.empresa}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold">
                          {formatNumber(row.total_abertos)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                        {hasPopover ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="cursor-pointer underline decoration-dotted underline-offset-4 hover:text-orange-500 transition-colors"
                              >
                                {formatBRL(row.valor_estimado)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              side="left"
                              align="start"
                              className="border-slate-800/60 bg-slate-900 p-3 shadow-xl w-auto max-w-sm"
                            >
                              <NegocioPopoverList empresa={row.empresa} items={negocios} />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          formatBRL(row.valor_estimado)
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${movBadgeClass(
                            row.ultima_movimentacao
                          )}`}
                        >
                          {formatRelativeMovimentacao(row.ultima_movimentacao)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Página <span className="font-semibold text-slate-100">{page + 1}</span> de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700"
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
