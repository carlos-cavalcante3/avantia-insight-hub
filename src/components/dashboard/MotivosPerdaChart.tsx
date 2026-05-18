import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber } from "@/lib/format";
import type { MotivoPerda } from "@/hooks/useDashboardData";

interface Props {
  data?: MotivoPerda[];
  isLoading: boolean;
  error: Error | null;
}

export const MotivosPerdaChart = ({ data, isLoading, error }: Props) => {
  // TOP 10 motivos por frequência (do maior para o menor)
  const rows = [...(data ?? [])]
    .sort((a, b) => b.qtd_negocios - a.qtd_negocios)
    .slice(0, 10);

  // Altura dinâmica: mínimo 40px por linha para evitar sobreposição,
  // garantindo legibilidade independentemente da quantidade de motivos.
  const ROW_H = 40;
  const chartHeight = Math.max(220, rows.length * ROW_H + 40);

  return (
    <ReportCard
      id="motivos-perda"
      title="Motivos de Perda — Top 10"
      subtitle="Ranking por frequência · valor perdido no total"
    >
      <div style={{ height: chartHeight }}>
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : rows.length === 0 ? (
          <ErrorState message="Sem dados de perda." />
        ) : (
          <div className="flex h-full min-h-0 w-full items-start justify-start overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                barCategoryGap="35%"
              >
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(v) => formatNumber(v)}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="motivo"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={190}
                  interval={0}
                  tick={({ x, y, payload }) => {
                    const full = String(payload.value ?? "");
                    const max = 26;
                    const text = full.length > max ? `${full.slice(0, max).trimEnd()}…` : full;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <title>{full}</title>
                        <text
                          x={-8}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill="hsl(var(--muted-foreground))"
                          fontSize={11}
                        >
                          {text}
                        </text>
                      </g>
                    );
                  }}
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
                  labelFormatter={(label) => String(label)}
                  formatter={(value: number, _n, p) => [
                    `${formatNumber(value)} negócios · ${formatBRL(Number(p.payload.valor_perdido ?? 0))}`,
                    "Perdidos",
                  ]}
                />
                <Bar dataKey="qtd_negocios" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {rows.map((_, i) => (
                    <Cell key={i} fill="hsl(var(--destructive) / 0.85)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ReportCard>
  );
};
