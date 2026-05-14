import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";

interface Props {
  valorMes?: number;
  recorrente?: number;
  unico?: number;
  isLoading?: boolean;
}

export const ValorFechadoMesCard = ({ valorMes, recorrente, unico, isLoading }: Props) => {
  const valorFechado = valorMes || 0;
  const valorRecorrente = recorrente || 0;
  const valorUnico = unico || 0;

  return (
    <div className="bg-card rounded-lg border border-border shadow-card p-3.5 flex items-start gap-3 min-w-0">
      <div className="h-10 w-10 shrink-0 rounded-md flex items-center justify-center bg-primary/10 text-primary">
        <Calendar className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
          Valor Fechado (Mês Atual)
        </p>
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-24 mt-1" />
            <Skeleton className="h-3 w-32 mt-1.5" />
          </>
        ) : (
          <>
            <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums truncate -tracking-tightest">
              {formatBRL(valorFechado)}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 truncate">
              Recorrente:{" "}
              <span className="font-semibold text-foreground/80">{formatBRL(valorRecorrente)}</span>
              {" | "}
              Único:{" "}
              <span className="font-semibold text-foreground/80">{formatBRL(valorUnico)}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
