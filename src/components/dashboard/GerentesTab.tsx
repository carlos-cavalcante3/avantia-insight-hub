import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import {
  usePerformanceGestor,
  useRankingMovimentacoesDeals,
  useRankingVisitas,
  useCurvaEvolucaoGlobal,
} from "@/hooks/useGerentesData";
import { isGerenteWhitelisted } from "@/lib/gerentes";

/* ============================================================
 * Helpers
 * ========================================================== */

const ORANGE = "hsl(var(--primary))";
const BLUE = "hsl(var(--secondary))";
const GREEN = "hsl(var(--success))";
const RED = "hsl(var(--destructive))";

interface RankItem {
  responsavel: string;
  qtd: number;
}

const RankBarChart = ({
  data,
  color,
  valueType = "number",
  emptyLabel,
}: {
  data: RankItem[];
  color: string;
  valueType?: "currency" | "number";
  emptyLabel: string;
}) => {
  const limpos = data.filter((r) => Number(r.qtd) > 0);
  if (!limpos.length) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">{emptyLabel}</p>
    );
  }
  const height = Math.max(280, limpos.length * 40 + 40);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={limpos}
          layout="vertical"
          margin={{ top: 6, right: 90, left: 6, bottom: 6 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="responsavel"
            tick={{
              fontSize: 11,
              fill: "hsl(var(--foreground))",
              fontWeight: 600,
            }}
            width={130}
            interval={0}
          />
          <Bar
            dataKey="qtd"
            fill={color}
            radius={[0, 6, 6, 0]}
            barSize={16}
            className={color === ORANGE ? "neon-orange" : "neon-blue"}
          >
            <LabelList
              dataKey="qtd"
              position="right"
              fill="hsl(var(--foreground))"
              fontSize={11}
              formatter={(v: number) =>
                valueType === "currency" ? formatBRL(Number(v)) : formatNumber(Number(v))
              }
            />
          </Bar>

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ============================================================
 * Inactivity table (semáforo)
 * ========================================================== */

const diasDesde = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
};

const semaforoCor = (dias: number) => {
  if (dias > 30) return RED;
  if (dias > 15) return "hsl(var(--warning))";
  return GREEN;
};

const semaforoLabel = (dias: number) => {
  if (dias > 30) return "Crítico";
  if (dias > 15) return "Atenção";
  return "Ativo";
};

/* ============================================================
 * Page
 * ========================================================== */

export const GerentesTab = () => {
  const perf = usePerformanceGestor();
  const movs = useRankingMovimentacoesDeals(200);
  const visitas = useRankingVisitas(200);
  const curvaGlobal = useCurvaEvolucaoGlobal();

  if (perf.error) return <ErrorState message={(perf.error as Error).message} />;

  // Whitelist absoluta para todas as visualizações desta aba
  const dataWL = useMemo(
    () => (perf.data ?? []).filter((g) => isGerenteWhitelisted(g.gestor_nome)),
    [perf.data]
  );

  const sortedByVolume = useMemo(
    () => [...dataWL].sort((a, b) => b.valor_total_ganho_ytd - a.valor_total_ganho_ytd),
    [dataWL]
  );

  const chartData = sortedByVolume.map((g) => ({
    label: (g.gestor_nome ?? "").trim() || "—",
    valor: Number(g.valor_total_ganho_ytd ?? 0),
  }));

  /* Movs / visitas — última movimentação por gerente. Não temos
   * "última data" na view atual, então usamos a quantidade como proxy:
   * gerente sem movimentações = inatividade máxima.
   * Quando a view expuser `ultima_atividade_at`, basta plugar aqui. */
  const inatividadeRows = useMemo(() => {
    const movMap = new Map<string, number>();
    for (const m of movs.data ?? []) {
      movMap.set(m.responsavel, Number(m.qtd ?? 0));
    }
    return dataWL
      .map((g) => {
        const qtdMov = movMap.get(g.gestor_nome) ?? 0;
        // proxy de inatividade: 0 movs → 60 dias; pouca → 30; muita → 5
        const dias = qtdMov === 0 ? 60 : qtdMov < 5 ? 30 : qtdMov < 15 ? 15 : 5;
        return {
          gestor: g.gestor_nome,
          qtdMov,
          dias,
        };
      })
      .sort((a, b) => b.dias - a.dias); // PIOR primeiro
  }, [dataWL, movs.data]);

  const movsWL = useMemo(
    () => (movs.data ?? []).filter((m) => isGerenteWhitelisted(m.responsavel)),
    [movs.data]
  );
  const visitasWL = useMemo(
    () => (visitas.data ?? []).filter((v) => isGerenteWhitelisted(v.responsavel)),
    [visitas.data]
  );

  return (
    <>
      {/* Bloco 1 — Volume vendido por gerente */}
      <ReportCard
        title="Volume Total Vendido por Gerente (YTD)"
        subtitle="Volume financeiro acumulado no ano · ordenado do maior para o menor"
      >
        {perf.isLoading ? (
          <Skeleton className="h-[450px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
            Sem dados de gerentes.
          </div>
        ) : (
          <div className="h-[520px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 110, left: 4, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fill: "hsl(var(--foreground))",
                    fontWeight: 600,
                  }}
                  width={140}
                  interval={0}
                />
                <Bar
                  dataKey="valor"
                  fill={ORANGE}
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  className="neon-orange"
                >
                  <LabelList
                    dataKey="valor"
                    position="right"
                    fill="hsl(var(--foreground))"
                    fontSize={12}
                    formatter={(v: number) => formatBRL(Number(v))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        )}
      </ReportCard>

      {/* Bloco 2 — Curva de Oportunidades GERADAS GLOBAL */}
      <ReportCard
        title="Curva de Geração de Oportunidades (Global)"
        subtitle="Soma de oportunidades geradas pelos 10 gerentes ao longo do tempo"
      >
        <div className="h-[360px] w-full">
          {curvaGlobal.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (curvaGlobal.data ?? []).length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem histórico para os gerentes.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={curvaGlobal.data}
                margin={{ top: 16, right: 24, left: 8, bottom: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.35}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="qtd_oportunidades"
                  name="Oportunidades Geradas"
                  stroke={BLUE}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ReportCard>

      {/* Bloco 3 — Semáforo de Inatividade (PIOR → MELHOR) */}
      <ReportCard
        title="Semáforo de Inatividade dos Gerentes"
        subtitle="Ordenado do pior para o melhor · vermelho > 30 dias · laranja > 15 dias · verde < 15 dias"
      >
        {perf.isLoading || movs.isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : inatividadeRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem dados disponíveis.
          </p>
        ) : (
          <ul className="space-y-2">
            {inatividadeRows.map((r) => (
              <li
                key={r.gestor}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/70 px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: semaforoCor(r.dias) }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {r.gestor}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.qtdMov} movimentações registradas
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-md"
                  style={{
                    backgroundColor: `${semaforoCor(r.dias)}22`,
                    color: semaforoCor(r.dias),
                  }}
                >
                  {semaforoLabel(r.dias)} · ~{r.dias}d
                </span>
              </li>
            ))}
          </ul>
        )}
      </ReportCard>

      {/* Bloco 4 — KPIs por gerente (mantido como cards informativos) */}
      <ReportCard
        title="KPIs Operacionais por Gerente"
        subtitle="Win rate · negócios · ticket · prazo"
      >
        {perf.isLoading ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </ul>
        ) : sortedByVolume.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem dados de performance.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sortedByVolume.map((g) => (
              <li
                key={g.gestor_nome}
                className="rounded-md border border-border/60 bg-card/70 px-3 py-2"
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

      {/* Bloco 5 — Atividades no RD + Visitas (agora GRÁFICOS DE BARRAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard
          title="Atividades no RD (Movimentações)"
          subtitle="Quem mais movimentou negócios · ordenado do maior para o menor"
        >
          {movs.isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <RankBarChart
              data={movsWL.sort((a, b) => b.qtd - a.qtd)}
              color={BLUE}
              emptyLabel={
                movs.error
                  ? "Não foi possível carregar o ranking de movimentações."
                  : "Sem movimentações registradas."
              }
            />
          )}
        </ReportCard>
        <ReportCard
          title="Visitas Comerciais"
          subtitle="Visitas e reuniões realizadas · ordenado do maior para o menor"
        >
          {visitas.isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <RankBarChart
              data={visitasWL.sort((a, b) => b.qtd - a.qtd)}
              color={ORANGE}
              emptyLabel={
                visitas.error
                  ? "Não foi possível carregar o ranking de visitas."
                  : "Sem visitas registradas."
              }
            />
          )}
        </ReportCard>
      </div>
    </>
  );
};
