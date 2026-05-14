import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import {
  usePerformanceGestor,
  useRankingMovimentacoesDeals,
  useRankingVisitas,
} from "@/hooks/useGerentesData";

const RankingList = ({
  items,
  isLoading,
  format = formatNumber,
  empty = "Sem dados.",
}: {
  items: { responsavel: string; qtd: number }[] | undefined;
  isLoading: boolean;
  format?: (v: number) => string;
  empty?: string;
}) => {
  if (isLoading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </ul>
    );
  }
  if (!items || items.length === 0)
    return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li
          key={it.responsavel}
          className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card hover:bg-muted/30 transition-colors px-3 py-2"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-6 w-6 shrink-0 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-sm font-medium text-foreground truncate">{it.responsavel}</span>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums">{format(it.qtd)}</span>
        </li>
      ))}
    </ul>
  );
};

export const GerentesTab = () => {
  const perf = usePerformanceGestor();
  const movs = useRankingMovimentacoesDeals(10);
  const visitas = useRankingVisitas(10);

  if (perf.error) return <ErrorState message={(perf.error as Error).message} />;

  const data = perf.data ?? [];
  const sortedByVolume = [...data].sort(
    (a, b) => b.valor_total_ganho_ytd - a.valor_total_ganho_ytd
  );

  const chartData = sortedByVolume.map((g) => ({
    label: (g.gestor_nome ?? "").trim() || "—",
    valor: Number(g.valor_total_ganho_ytd ?? 0),
  }));

  const liderancaByOportunidades = [...data]
    .sort((a, b) => b.total_oportunidades_ytd - a.total_oportunidades_ytd)
    .map((g) => ({ label: g.gestor_nome, valor: g.total_oportunidades_ytd }));
  const liderancaByPropostas = [...data]
    .sort((a, b) => b.valor_propostas_ytd - a.valor_propostas_ytd)
    .map((g) => ({ label: g.gestor_nome, valor: g.valor_propostas_ytd }));
  const liderancaByFechados = [...data]
    .sort((a, b) => b.negocios_ganhos_ytd - a.negocios_ganhos_ytd)
    .map((g) => ({ label: g.gestor_nome, valor: g.negocios_ganhos_ytd }));
  const liderancaByPerdidos = [...data]
    .sort((a, b) => b.negocios_perdidos_ytd - a.negocios_perdidos_ytd)
    .map((g) => ({ label: g.gestor_nome, valor: g.negocios_perdidos_ytd }));

  return (
    <>
      {/* Bloco 1 — Volume + KPIs operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ReportCard
            title="Volume Total Vendido por Gerente (YTD)"
            subtitle="Volume financeiro acumulado no ano"
          >
            {perf.isLoading ? (
              <Skeleton className="h-[450px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados de gerentes.
              </div>
            ) : (
              <div className="min-h-[650px] h-[650px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 140, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#0f172a", fontWeight: 600 }}
                      width={220}
                      interval={0}
                    />
                    <RechartsTooltip
                      formatter={(v: number) => formatBRL(Number(v))}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="valor" fill="#f97316" radius={[0, 6, 6, 0]} barSize={18}>
                      <LabelList
                        dataKey="valor"
                        position="right"
                        fill="#0f172a"
                        fontSize={12}
                        formatter={(v: number) => formatBRL(Number(v))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>
        </div>
        <div className="lg:col-span-2">
          <ReportCard
            title="KPIs Operacionais por Gerente"
            subtitle="Win rate · negócios · ticket · prazo"
          >
            {perf.isLoading ? (
              <ul className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </ul>
            ) : sortedByVolume.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sem dados de performance.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {sortedByVolume.map((g) => (
                  <li
                    key={g.gestor_nome}
                    className="rounded-md border border-border/50 bg-card px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">
                      {g.gestor_nome}
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="text-muted-foreground">
                        Win Rate:{" "}
                        <span className="font-semibold text-foreground">
                          {formatPercent(g.win_rate)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Fechados:{" "}
                        <span className="font-semibold text-foreground">
                          {formatNumber(g.negocios_ganhos_ytd)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Ticket:{" "}
                        <span className="font-semibold text-foreground">
                          {formatBRL(g.ticket_medio)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Prazo:{" "}
                        <span className="font-semibold text-foreground">
                          {Math.round(g.dias_medios_fechamento)} dias
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ReportCard>
        </div>
      </div>

      {/* Bloco 2 — Liderança por indicador (grid 2x2) */}
      <ReportCard
        title="Liderança por Indicador (YTD)"
        subtitle="Rankings individuais por indicador para leitura executiva"
      >
        {perf.isLoading ? (
          <Skeleton className="h-[980px] lg:h-[920px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
            Sem dados de gerentes.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportCard title="Oportunidades Geradas" subtitle="Ranking do maior para o menor">
              <MiniRankingBarChart data={liderancaByOportunidades} color="#3b82f6" valueType="number" />
            </ReportCard>
            <ReportCard title="Propostas Colocadas" subtitle="Ranking do maior para o menor">
              <MiniRankingBarChart data={liderancaByPropostas} color="#f97316" valueType="currency" />
            </ReportCard>
            <ReportCard title="Negócios Fechados" subtitle="Ranking do maior para o menor">
              <MiniRankingBarChart data={liderancaByFechados} color="#10b981" valueType="number" />
            </ReportCard>
            <ReportCard title="Negócios Perdidos" subtitle="Ranking do maior para o menor">
              <MiniRankingBarChart data={liderancaByPerdidos} color="#ef4444" valueType="number" />
            </ReportCard>
          </div>
        )}
      </ReportCard>

      {/* Bloco 3 — Rankings operacionais CRM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard
          title="Atividades no RD (Movimentações)"
          subtitle="Quem mais movimentou negócios recentemente"
        >
          <RankingList
            items={movs.data}
            isLoading={movs.isLoading}
            empty={
              movs.error
                ? "Não foi possível carregar o ranking de movimentações."
                : "Sem movimentações registradas."
            }
          />
        </ReportCard>
        <ReportCard title="Visitas Comerciais" subtitle="Contagem de visitas e reuniões realizadas">
          <RankingList
            items={visitas.data}
            isLoading={visitas.isLoading}
            empty={
              visitas.error
                ? "Não foi possível carregar o ranking de visitas."
                : "Sem visitas registradas."
            }
          />
        </ReportCard>
      </div>
    </>
  );
};

const MiniRankingBarChart = ({
  data,
  color,
  valueType,
}: {
  data: { label: string; valor: number }[];
  color: string;
  valueType: "currency" | "number";
}) => {
  const dadosLimpos = data.filter((item) => Number(item.valor) > 0);
  if (dadosLimpos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum gerente com resultado neste indicador.
      </p>
    );
  }
  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={dadosLimpos} layout="vertical" margin={{ top: 8, right: 36, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "#0f172a", fontWeight: 600 }}
            width={140}
            interval={0}
          />
          <RechartsTooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [
              valueType === "currency" ? formatBRL(Number(value)) : formatNumber(Number(value)),
              "Valor",
            ]}
          />
          <Bar dataKey="valor" fill={color} radius={[0, 6, 6, 0]} barSize={16}>
            <LabelList
              dataKey="valor"
              position="right"
              fill="#0f172a"
              fontSize={12}
              formatter={(value: number) =>
                valueType === "currency" ? formatBRL(Number(value)) : formatNumber(Number(value))
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
