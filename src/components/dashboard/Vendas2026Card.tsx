import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import type { VendaAnoSamePeriod } from "@/hooks/useDashboardData";

const MES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Props {
  data?: VendaAnoSamePeriod;
  isLoading: boolean;
  error: Error | null;
}

const variation = (atual: number, anterior: number): number | null => {
  if (!anterior) return null;
  return (atual / anterior - 1) * 100;
};

const trendFor = (pct: number | null): { Icon: LucideIcon; color: string } => {
  if (pct === null) return { Icon: Minus, color: "text-muted-foreground" };
  if (pct > 0.1) return { Icon: TrendingUp, color: "text-success" };
  if (pct < -0.1) return { Icon: TrendingDown, color: "text-destructive" };
  return { Icon: Minus, color: "text-muted-foreground" };
};

export const Vendas2026Card = ({ data, isLoading, error }: Props) => {
  const periodo = data
    ? `Comparativo Jan – ${MES_LABEL[Math.max(0, data.mes_corte - 1)]} · ${data.ano_atual} vs ${data.ano_anterior} (mesmo período)`
    : "Mesmo período do ano anterior";

  return (
    <ReportCard
      id="vendas-ano"
      title={
        data
          ? `Vendas ${data.ano_atual} — Visão Executiva (YTD)`
          : "Vendas — Visão Executiva (YTD)"
      }
      subtitle={periodo}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : !data ? (
        <ErrorState message="Sem dados de vendas." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ComparisonStat
            label="Valor Fechado"
            metric="Valor Fechado"
            valueAtual={formatBRL(data.receita_atual)}
            valueAnterior={formatBRL(data.receita_anterior)}
            anoAtual={data.ano_atual}
            anoAnterior={data.ano_anterior}
            pct={variation(data.receita_atual, data.receita_anterior)}
          />
          <ComparisonStat
            label="Quantidade de negócios"
            metric="Quantidade"
            valueAtual={formatNumber(data.qtd_atual)}
            valueAnterior={formatNumber(data.qtd_anterior)}
            anoAtual={data.ano_atual}
            anoAnterior={data.ano_anterior}
            pct={variation(data.qtd_atual, data.qtd_anterior)}
          />
          <ComparisonStat
            label="Ticket médio"
            metric="Ticket médio"
            valueAtual={formatBRL(data.ticket_atual)}
            valueAnterior={formatBRL(data.ticket_anterior)}
            anoAtual={data.ano_atual}
            anoAnterior={data.ano_anterior}
            pct={variation(data.ticket_atual, data.ticket_anterior)}
          />
        </div>
      )}
    </ReportCard>
  );
};

interface CompProps {
  label: string;
  metric: string;
  valueAtual: string;
  valueAnterior: string;
  anoAtual: number;
  anoAnterior: number;
  pct: number | null;
}

const ComparisonStat = ({
  label,
  metric,
  valueAtual,
  valueAnterior,
  anoAtual,
  anoAnterior,
  pct,
}: CompProps) => {
  const { Icon, color } = trendFor(pct);
  const sign = pct !== null && pct > 0 ? "+" : "";
  const pctLabel = pct === null ? "s/ base" : `${sign}${formatPercent(pct)}`;

  return (
    <div className="rounded-md bg-muted/40 p-3 flex flex-col gap-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-bold text-foreground tabular-nums leading-tight">
        {valueAtual}
      </p>
      <div className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>
          {metric} {pctLabel} vs {anoAnterior}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {anoAnterior}: <span className="font-medium text-foreground/80">{valueAnterior}</span>
        <span className="mx-1">·</span>
        {anoAtual}: <span className="font-medium text-foreground/80">{valueAtual}</span>
      </p>
    </div>
  );
};
