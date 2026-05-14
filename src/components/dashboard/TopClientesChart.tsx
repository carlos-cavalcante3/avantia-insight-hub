import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatCompactBRL } from "@/lib/format";
import type { VendaCliente } from "@/data/mockData";

interface Props {
  data?: VendaCliente[];
  isLoading: boolean;
  error: Error | null;
}

export const TopClientesChart = ({ data, isLoading, error }: Props) => {
  // Maior valor primeiro (topo do gráfico vertical)
  const sorted = [...(data ?? [])].sort((a, b) => b.receita - a.receita);

  return (
    <ReportCard
      id="vendas-ytd"
      title="Top 15 Clientes (YTD)"
      subtitle="Valor fechado no ano (YTD) por empresa"
    >
      <div style={{ height: Math.max(288, sorted.length * 28 + 40) }}>
        {isLoading ? (
          <div className="h-full flex flex-col gap-2 justify-end">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sorted.length === 0 ? (
          <ErrorState message="Sem dados disponíveis no período." />
        ) : (
          <div className="flex justify-start items-start w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="grad-top-clientes" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--brand-orange))" stopOpacity={0.85} />
                    <stop offset="50%" stopColor="hsl(26 80% 60%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--brand-orange))" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCompactBRL(v)}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  type="category"
                  dataKey="empresa"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={170}
                  interval={0}
                  tick={({ x, y, payload }) => {
                    const full = String(payload.value ?? "");
                    const max = 22;
                    const text = full.length > max ? `${full.slice(0, max).trimEnd()}…` : full;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <title>{full}</title>
                        <text
                          x={-6}
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
                  formatter={(value: number) => [formatBRL(value), "Valor Fechado"]}
                />
                <Bar dataKey="receita" radius={[0, 6, 6, 0]} barSize={20} stroke="hsl(26 64% 38%)" strokeWidth={0.5} activeBar={{ fill: "hsl(26 80% 56%)", stroke: "hsl(26 64% 30%)", strokeWidth: 1 }}>
                  {sorted.map((_, i) => (
                    <Cell key={i} fill="url(#grad-top-clientes)" />
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
