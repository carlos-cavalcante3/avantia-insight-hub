import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber } from "@/lib/format";
import type { VendaMesCliente } from "@/hooks/useDashboardData";

interface Props {
  data?: VendaMesCliente[];
  isLoading: boolean;
  error: Error | null;
}

export const VendasMesPorClienteList = ({ data, isLoading, error }: Props) => {
  const rows = [...(data ?? [])].sort((a, b) => b.valor_ganho - a.valor_ganho);
  const total = rows.reduce((s, r) => s + r.valor_ganho, 0);
  const max = rows[0]?.valor_ganho ?? 1;

  return (
    <ReportCard
      id="vendas-mes-clientes"
      title="Vendas do Mês por Cliente (Mês Atual)"
      subtitle={
        rows.length === 0
          ? "Nenhum fechamento registrado no mês corrente"
          : `${rows.length} clientes · ${formatBRL(total)} em valor fechado`
      }
    >
      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </ul>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : rows.length === 0 ? (
        <div className="h-24 flex items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          Nenhum fechamento registrado no mês corrente
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const pct = max ? (r.valor_ganho / max) * 100 : 0;
            return (
              <li key={r.empresa_nome} className="text-xs">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-medium text-foreground truncate max-w-[60%]" title={r.empresa_nome}>
                    {r.empresa_nome}
                  </span>
                  <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                    <span className="text-foreground font-semibold">
                      {formatBRL(r.valor_ganho)}
                    </span>
                    {" · "}
                    {formatNumber(r.qtd_negocios)} neg.
                  </span>
                </div>
                <div className="relative h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-orange"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ReportCard>
  );
};
