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

const MotivoTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: MotivoPerda }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const qtd = Number(payload[0]?.value ?? row?.qtd_negocios ?? 0);
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold leading-snug text-slate-100">{label ?? row?.motivo}</p>
      <p className="mt-1 text-slate-300">
        {formatNumber(qtd)} negocios - {formatBRL(Number(row?.valor_perdido ?? 0))}
      </p>
    </div>
  );
};

export const MotivosPerdaChart = ({ data, isLoading, error }: Props) => {
  const rows = [...(data ?? [])]
    .sort((a, b) => b.qtd_negocios - a.qtd_negocios)
    .slice(0, 15);

  const rowHeight = 42;
  const chartHeight = Math.max(260, rows.length * rowHeight + 48);

  return (
    <ReportCard
      id="motivos-perda"
      title="Motivos de Perda - Top 15"
      subtitle="Ranking por frequencia - valor perdido no total - dados a partir de Jan/2026"
    >
      <div style={{ height: chartHeight }}>
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : rows.length === 0 ? (
          <ErrorState message="Sem dados de perda." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
              barCategoryGap="32%"
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
                tickLine={false}
                axisLine={false}
                width={260}
                interval={0}
                tick={{ fontSize: 12, fill: "#e2e8f0" }}
              />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<MotivoTooltip />} />
              <Bar dataKey="qtd_negocios" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {rows.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--destructive) / 0.85)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ReportCard>
  );
};
