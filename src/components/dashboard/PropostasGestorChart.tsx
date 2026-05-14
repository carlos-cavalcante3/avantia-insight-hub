import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatCompactBRL, formatNumber } from "@/lib/format";
import type { PropostaGestor } from "@/hooks/useDashboardData";

interface Props {
  data?: PropostaGestor[];
  isLoading: boolean;
  error: Error | null;
}

export const PropostasGestorChart = ({ data, isLoading, error }: Props) => {
  const sorted = [...(data ?? [])].sort((a, b) => b.valor_propostas_ano - a.valor_propostas_ano);
  const height = Math.max(280, sorted.length * 32 + 40);

  return (
    <ReportCard
      id="propostas-gestor"
      title="Propostas Colocadas"
      subtitle="Volume bruto de propostas por gerente no ano (YTD) — todos os status"
    >
      <div style={{ height }}>
        {isLoading ? (
          <div className="h-full flex flex-col gap-2 justify-end">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sorted.length === 0 ? (
          <ErrorState message="Sem dados de propostas." />
        ) : (
          <div className="flex justify-start items-start w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
              >
                <defs>
                  <linearGradient id="grad-propostas-gestor" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--brand-blue))" stopOpacity={0.85} />
                    <stop offset="50%" stopColor="hsl(217 60% 65%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--brand-blue))" stopOpacity={0.95} />
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
                  dataKey="gestor_nome"
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
                  formatter={(value: number, _n, props) => [
                    `${formatBRL(value)} · ${formatNumber(Number(props.payload.total_propostas_ano ?? 0))} propostas`,
                    "Propostas Colocadas",
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="valor_propostas_ano" radius={[0, 6, 6, 0]} barSize={20} stroke="hsl(217 38% 35%)" strokeWidth={0.5} activeBar={{ fill: "hsl(217 60% 60%)", stroke: "hsl(217 38% 28%)", strokeWidth: 1 }}>
                  {sorted.map((_, i) => (
                    <Cell key={i} fill="url(#grad-propostas-gestor)" />
                  ))}
                  <LabelList
                    dataKey="total_propostas_ano"
                    position="right"
                    formatter={(v: number) => (v ? `${formatNumber(v)}` : "")}
                    fill="hsl(var(--foreground))"
                    fontSize={10}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ReportCard>
  );
};
