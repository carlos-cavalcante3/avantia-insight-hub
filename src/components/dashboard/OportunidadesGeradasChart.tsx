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
import type { OportunidadeGerada } from "@/hooks/useDashboardData";

interface Props {
  data?: OportunidadeGerada[];
  isLoading: boolean;
  error: Error | null;
}

export const OportunidadesGeradasChart = ({ data, isLoading, error }: Props) => {
  const rows = data ?? [];
  return (
    <ReportCard
      id="oportunidades-geradas"
      title="Oportunidades Geradas (Evolução Mensal YTD)"
      subtitle="Últimos meses · valor (R$) de novas oportunidades geradas por mês"
    >
      <div className="h-72">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : rows.length === 0 ? (
          <ErrorState message="Sem dados de geração." />
        ) : (
          <div className="flex justify-start items-start w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="grad-oportunidades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 60% 65%)" stopOpacity={1} />
                    <stop offset="50%" stopColor="hsl(var(--brand-blue))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(217 38% 40%)" stopOpacity={0.95} />
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
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "var(--shadow-elevated)",
                  }}
                  formatter={(value: number, _n, props) => [
                    `${formatBRL(value)} · ${formatNumber(Number(props.payload.qtd_gerada ?? 0))} oportunidades`,
                    "Geradas",
                  ]}
                  labelFormatter={(l) => String(l)}
                />
                <Bar
                  dataKey="valor_gerado"
                  fill="url(#grad-oportunidades)"
                  stroke="hsl(217 38% 35%)"
                  strokeWidth={0.5}
                  radius={[6, 6, 0, 0]}
                  activeBar={{ fill: "hsl(217 60% 60%)", stroke: "hsl(217 38% 28%)", strokeWidth: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ReportCard>
  );
};
