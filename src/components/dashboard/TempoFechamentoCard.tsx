import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Clock } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatNumber } from "@/lib/format";
import type { TempoFechamento } from "@/hooks/useDashboardData";

interface Props {
  data?: TempoFechamento;
  isLoading: boolean;
  error: Error | null;
}

export const TempoFechamentoCard = ({ data, isLoading, error }: Props) => {
  return (
    <ReportCard
      id="tempo-fechamento"
      title="Tempo Médio de Fechamento"
      subtitle="Diferença entre criação e fechamento de negócios ganhos"
      action={
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Ciclo comercial
        </span>
      }
    >
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : !data || !data.total_amostras ? (
        <ErrorState message="Sem amostras suficientes." />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Média" value={`${data.media_dias.toFixed(0)} d`} />
            <Stat label="Mediana" value={`${data.mediana_dias.toFixed(0)} d`} />
            <Stat label="Amostras" value={formatNumber(data.total_amostras)} />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bucket} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${formatNumber(v)} negócios`, "Distribuição"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.bucket.map((_, i) => (
                    <Cell key={i} fill="hsl(var(--brand-blue))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ReportCard>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/40 p-2.5 text-center">
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-lg font-bold text-foreground tabular-nums">{value}</p>
  </div>
);
