import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBRL } from "@/lib/format";
import type { VendaDetalhe } from "@/hooks/useVendasData";

interface DealListTooltipContentProps {
  title: string;
  total?: number;
  totalLabel?: string;
  items: VendaDetalhe[];
  showCliente?: boolean;
  showNegocio?: boolean;
  emptyLabel?: string;
}

export const DealListTooltipContent = ({
  title,
  total,
  totalLabel = "Total",
  items,
  showCliente = false,
  showNegocio = false,
  emptyLabel = "Sem detalhes disponíveis.",
}: DealListTooltipContentProps) => {
  const sorted = [...items]
    .filter((d) => Number(d.valor ?? 0) > 0)
    .sort((a, b) => Number(b.valor ?? 0) - Number(a.valor ?? 0));

  return (
    <div className="w-72 bg-slate-900 border border-slate-700 p-3 rounded-md shadow-2xl">
      <div className="border-b border-slate-800 pb-2 mb-2">
        <p className="text-sm font-bold text-slate-100 truncate" title={title}>
          {title}
        </p>
        {total != null && (
          <p className="text-xs text-slate-400">
            {totalLabel}: {formatBRL(Number(total))}
          </p>
        )}
      </div>
      <ScrollArea className="h-64 pr-2">
        <div>
          {sorted.length ? (
            sorted.map((item, index) => (
              <div
                key={`${item.nome}-${item.cliente}-${index}`}
                className="flex justify-between items-start py-1.5 gap-3 border-b border-slate-800/50 last:border-0"
              >
                <div className="min-w-0">
                  {showCliente && (
                    <p className="text-xs font-medium text-slate-100 truncate">{item.cliente}</p>
                  )}
                  <p className="text-xs text-slate-300 truncate">{item.gerente || "—"}</p>
                  {showNegocio && item.nome && item.nome !== item.cliente && (
                    <p className="text-[10px] text-slate-500 truncate">{item.nome}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-blue-400 tabular-nums shrink-0">
                  {formatBRL(Number(item.valor ?? 0))}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">{emptyLabel}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
