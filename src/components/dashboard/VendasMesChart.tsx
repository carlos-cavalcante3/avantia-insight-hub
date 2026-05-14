import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatCompactBRL, formatNumber } from "@/lib/format";
import type { VendaMes } from "@/hooks/useDashboardData";

const MESES_PT_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface Props {
  data?: VendaMes[];
  isLoading: boolean;
  error: Error | null;
}

export const VendasMesChart = ({ data, isLoading, error }: Props) => {
  const rows = data ?? [];
  const now = new Date();
  const anoAtual = now.getUTCFullYear();
  const mesCorte = now.getUTCMonth() + 1;
  const mesFimLabel = MESES_PT_LONG[mesCorte - 1] ?? "";

  return (
    <ReportCard
      id="vendas-mes"
      title={`Evolução de Vendas Fechadas (YTD ${anoAtual})`}
      subtitle={`Janeiro a ${mesFimLabel} ${anoAtual} (YTD) · receita total fechada`}
    >
      <div className="h-72">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : rows.length === 0 ? (
          <ErrorState message="Sem dados mensais." />
        ) : (
          <div className="flex justify-start items-start w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 18, right: 12, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="grad-vendas-mes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(26 80% 62%)" stopOpacity={1} />
                    <stop offset="50%" stopColor="hsl(var(--brand-orange))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(26 64% 40%)" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="mes_label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => formatCompactBRL(v)}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as VendaMes;
                    const mesNome = MESES_PT_LONG[p.mes - 1] ?? `Mês ${p.mes}`;
                    return (
                      <div
                        className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs"
                        style={{ boxShadow: "var(--shadow-elevated)" }}
                      >
                        <p className="font-semibold text-foreground mb-2">
                          {mesNome} {p.ano}
                        </p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>
                            <span className="text-foreground/90">Valor Total:</span>{" "}
                            {formatBRL(p.receita_total)}
                          </li>
                          <li>
                            <span className="text-foreground/90">Valor Recorrente:</span>{" "}
                            {formatBRL(p.receita_recorrente)}
                          </li>
                          <li>
                            <span className="text-foreground/90">Valor Único:</span>{" "}
                            {formatBRL(p.receita_unica)}
                          </li>
                          <li>
                            <span className="text-foreground/90">Negócios Fechados:</span>{" "}
                            {formatNumber(p.qtd_negocios)}
                          </li>
                        </ul>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="receita_total"
                  name="Valor Fechado"
                  fill="url(#grad-vendas-mes)"
                  stroke="hsl(26 64% 35%)"
                  strokeWidth={0.5}
                  radius={[6, 6, 0, 0]}
                  activeBar={{ fill: "hsl(26 80% 58%)", stroke: "hsl(26 64% 28%)", strokeWidth: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ReportCard>
  );
};
