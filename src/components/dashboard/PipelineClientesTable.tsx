import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatDateBR, formatNumber } from "@/lib/format";
import type { PipelineCliente } from "@/data/mockData";

const PAGE_SIZE = 6;

interface Props {
  data?: PipelineCliente[];
  isLoading: boolean;
  error: Error | null;
}

export const PipelineClientesTable = ({ data, isLoading, error }: Props) => {
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.valor_estimado - a.valor_estimado),
    [data]
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <ReportCard
      id="pipeline-cliente"
      title="Pipeline por Cliente"
      subtitle={
        isLoading
          ? "Carregando empresas…"
          : `${sorted.length} empresas com negócios em aberto`
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : sorted.length === 0 ? (
        <ErrorState message="Nenhuma empresa com pipeline aberto." />
      ) : (
        <>
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 sm:px-6 py-3 font-medium">Empresa</th>
                  <th className="px-3 py-3 font-medium text-right">Negócios</th>
                  <th className="px-3 py-3 font-medium text-right">Valor Estimado</th>
                  <th className="px-5 sm:px-6 py-3 font-medium text-right">Fechamento Esperado</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <tr
                    key={row.empresa}
                    className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 sm:px-6 py-3.5 font-medium text-foreground">{row.empresa}</td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
                        {formatNumber(row.total_abertos)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-foreground tabular-nums">
                      {formatBRL(row.valor_estimado)}
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 text-right text-muted-foreground tabular-nums">
                      {row.fechamento_esperado ? formatDateBR(row.fechamento_esperado) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Página <span className="font-semibold text-foreground">{page + 1}</span> de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
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
