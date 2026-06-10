import { useMemo, useState } from "react";
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
  Legend,
  Cell,
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
  usePipelineAbertoTodosGestores,
  usePrevisaoVendasMensal,
} from "@/hooks/useGerentesData";
import { useVendasGestorPeriodo } from "@/hooks/useVendasData";
import { isGerenteWhitelisted, EQUIPE_PUBLICO, EQUIPE_PRIVADO, matchNomeInList } from "@/lib/gerentes";
import { getManagerColor } from "@/lib/managerColors";
import { filterCurvaValid } from "@/lib/dateFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ============================================================
 * Helpers
 * ========================================================== */

const ORANGE = "hsl(var(--primary))";
const BLUE = "hsl(var(--secondary))";
const META_INDIVIDUAL_GERENTE = 5_000_000;

interface RankItem {
  responsavel: string;
  qtd: number;
}

const VendasGerenteTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      label: string;
      valor: number;
      detalhes_vendas_ytd?: Array<{ cliente_nome?: string; valor?: number }>;
    };
  }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const detalhes = (row?.detalhes_vendas_ytd ?? [])
    .filter((item) => item?.cliente_nome)
    .slice()
    .sort((a, b) => Number(b?.valor ?? 0) - Number(a?.valor ?? 0));

  return (
    <div className="w-96 max-w-[calc(100vw-2rem)] rounded-md border border-blue-950/50 bg-card px-3 py-2 text-xs text-slate-100 shadow-xl">
      <p className="font-semibold">{label ?? row?.label}</p>
      <p className="mt-1 text-slate-300">Total: {formatBRL(Number(row?.valor ?? payload[0]?.value ?? 0))}</p>
      {detalhes.length > 0 && (
        <div className="mt-2">
          {detalhes.map((item, index) => (
            <div
              key={`${item.cliente_nome}-${index}`}
              className="flex items-center justify-between gap-4 border-b border-blue-950/50 py-1.5 last:border-0"
            >
              <span className="max-w-[180px] truncate font-medium text-slate-200">
                {item.cliente_nome}
              </span>
              <span className="shrink-0 text-right font-semibold tabular-nums text-slate-400">
                {formatBRL(Number(item.valor ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
          <Bar dataKey="qtd" fill={color} radius={[0, 6, 6, 0]} barSize={16}>
            {limpos.map((entry) => (
              <Cell key={entry.responsavel} fill={getManagerColor(entry.responsavel)} />
            ))}
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

const semaforoNeonDot = (dias: number) => {
  if (dias > 30) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]";
  if (dias > 15) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]";
  return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]";
};

const semaforoTextClass = (dias: number) => {
  if (dias > 30) return "text-red-500 bg-red-500/15";
  if (dias > 15) return "text-amber-500 bg-amber-500/15";
  return "text-emerald-500 bg-emerald-500/15";
};

const semaforoLabel = (dias: number) => {
  if (dias > 30) return "Crítico";
  if (dias > 15) return "Atenção";
  return "Ativo";
};

/* ============================================================
 * Page
 * ========================================================== */

interface GerentesTabProps {
  periodo: string;
}

export const GerentesTab = ({ periodo }: GerentesTabProps) => {
  const currentMonth = new Date().getMonth() + 1;
  const selectedMonth = periodo === "ytd" ? currentMonth : Number(periodo.replace("mes-", ""));
  const perf = usePerformanceGestor(selectedMonth);
  const vendasGestor = useVendasGestorPeriodo("avantia", selectedMonth);
  const movs = useRankingMovimentacoesDeals(200);
  const visitas = useRankingVisitas(200);
  const curvaGlobal = useCurvaEvolucaoGlobal();
  const pipelineAberto = usePipelineAbertoTodosGestores();
  const previsao = usePrevisaoVendasMensal(selectedMonth);
  const pipelineMap = useMemo(() => {
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const m = new Map<string, number>();
    for (const r of pipelineAberto.data ?? []) {
      m.set(norm(r.gestor_nome), Number(r.valor_total_aberto ?? 0));
    }
    return m;
  }, [pipelineAberto.data]);
  const pipelineDoGerente = (nome: string) => {
    const norm = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return pipelineMap.get(norm) ?? 0;
  };
  const previsaoDoGerente = (nome: string) => {
    const norm = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return previsao.data?.get(norm) ?? 0;
  };
  const [equipeFiltro, setEquipeFiltro] = useState<"global" | "publico" | "privado">("global");
  const [hiddenManagers, setHiddenManagers] = useState<Set<string>>(() => new Set());

  if (perf.error) return <ErrorState message={(perf.error as Error).message} />;

  // Whitelist absoluta + filtro de equipe escolhido no topo.
  const equipeList =
    equipeFiltro === "publico" ? EQUIPE_PUBLICO : equipeFiltro === "privado" ? EQUIPE_PRIVADO : null;
  const passaEquipe = (nome: string) =>
    !equipeList || matchNomeInList(nome, equipeList);

  const dataWL = useMemo(
    () =>
      (perf.data ?? [])
        .filter((g) => isGerenteWhitelisted(g.gestor_nome))
        .filter((g) => passaEquipe(g.gestor_nome)),
    [perf.data, equipeFiltro]
  );

  const sortedByVolume = useMemo(
    () => [...dataWL].sort((a, b) => b.valor_total_ganho_ytd - a.valor_total_ganho_ytd),
    [dataWL]
  );

  const chartData = useMemo(
    () =>
      (vendasGestor.data?.ytd ?? [])
        .filter((g) => isGerenteWhitelisted(g.gestor_nome))
        .filter((g) => passaEquipe(g.gestor_nome))
        .map((g) => ({
          label: (g.gestor_nome ?? "").trim() || "—",
          valor: Number(g.valor_ytd ?? 0),
          detalhes_vendas_ytd: (g.detalhes_vendas_ytd ?? []).map((d) => ({
            cliente_nome: d.cliente,
            valor: d.valor,
          })),
        }))
        .sort((a, b) => b.valor - a.valor),
    [vendasGestor.data, equipeFiltro]
  );


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
    () =>
      (movs.data ?? [])
        .filter((m) => isGerenteWhitelisted(m.responsavel))
        .filter((m) => passaEquipe(m.responsavel)),
    [movs.data, equipeFiltro]
  );
  const visitasWL = useMemo(
    () =>
      (visitas.data ?? [])
        .filter((v) => isGerenteWhitelisted(v.responsavel))
        .filter((v) => passaEquipe(v.responsavel)),
    [visitas.data, equipeFiltro]
  );

  const curvaData = useMemo(
    () => filterCurvaValid(curvaGlobal.data ?? []),
    [curvaGlobal.data]
  );

  const curvaManagers = useMemo(() => {
    const reserved = new Set(["ano", "mes", "label", "qtd_oportunidades"]);
    const names = new Set<string>();
    for (const row of curvaData) {
      Object.keys(row).forEach((key) => {
        if (!reserved.has(key) && passaEquipe(key)) names.add(key);
      });
    }
    return Array.from(names);
  }, [curvaData, equipeFiltro]);

  const toggleManagerLine = (value: unknown) => {
    const manager = String(value ?? "");
    if (!manager) return;
    setHiddenManagers((current) => {
      const next = new Set(current);
      if (next.has(manager)) next.delete(manager);
      else next.add(manager);
      return next;
    });
  };

  return (
    <>
      {/* Seletor de Equipe */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Equipe
        </span>
        <Select value={equipeFiltro} onValueChange={(v) => setEquipeFiltro(v as "global" | "publico" | "privado")}>
          <SelectTrigger className="h-9 w-[220px] bg-slate-900 border-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Visão Global</SelectItem>
            <SelectItem value="publico">Equipe Público</SelectItem>
            <SelectItem value="privado">Equipe Privado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bloco 1 — Volume vendido por gerente */}

      <ReportCard
        title="Volume Total Vendido por Gerente (YTD)"
        subtitle="Volume financeiro acumulado no ano · ordenado do maior para o menor"
      >
        {vendasGestor.isLoading ? (
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
                <RechartsTooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={<VendasGerenteTooltip />}
                />
                <Bar
                  dataKey="valor"
                  fill={ORANGE}
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={getManagerColor(entry.label)} />
                  ))}
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
        subtitle="Linhas por gerente para comparar oportunidades geradas ao longo do tempo"
      >
        <div className="h-[360px] w-full">
          {curvaGlobal.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : curvaData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem histórico para os gerentes.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={curvaData}
                margin={{ top: 16, right: 24, left: 8, bottom: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.35}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.2), 1)]}
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
                <Legend
                  wrapperStyle={{ fontSize: 12, cursor: "pointer", color: "#e2e8f0" }}
                  formatter={(value) => (
                    <span style={{ color: "#e2e8f0" }}>{value}</span>
                  )}
                  onClick={(payload) => toggleManagerLine(payload?.dataKey ?? payload?.value)}
                />
                {curvaManagers.map((manager) => (
                  <Line
                    key={manager}
                    type="monotone"
                    dataKey={manager}
                    name={manager}
                    hide={hiddenManagers.has(manager)}
                    stroke={getManagerColor(manager)}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
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
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inatividadeRows.map((r) => (
              <li
                key={r.gestor}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/80 p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${semaforoNeonDot(r.dias)}`}
                    aria-hidden
                  />
                  <p className="text-sm font-semibold text-foreground truncate">{r.gestor}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.qtdMov} movimentações registradas
                </p>
                <span
                  className={`self-start text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${semaforoTextClass(r.dias)}`}
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
        subtitle="Conversão · negócios · ticket · prazo · meta YTD"
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
                    Taxa Conversão:{" "}
                    <span className="font-semibold text-foreground">
                      {formatPercent(
                        g.total_oportunidades_ytd > 0
                          ? (g.negocios_ganhos_ytd / g.total_oportunidades_ytd) * 100
                          : 0
                      )}
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
                      {Math.round(g.prazo_medio_dias || g.dias_medios_fechamento || 0)} dias
                    </span>
                  </span>
                  <span className="text-muted-foreground col-span-2">
                    Pipeline:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatBRL(pipelineDoGerente(g.gestor_nome))}
                    </span>
                  </span>
                  <span className="text-muted-foreground col-span-2">
                    Previsão de Vendas MTD:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatBRL(previsaoDoGerente(g.gestor_nome))}
                    </span>
                  </span>
                  <span className="col-span-2 mt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Meta YTD: {formatBRL(META_INDIVIDUAL_GERENTE)}</span>
                      <span className="font-semibold text-foreground">
                        {formatPercent(Math.min((g.valor_total_ganho_ytd / META_INDIVIDUAL_GERENTE) * 100, 100))}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800 border border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-orange-500 transition-all duration-700"
                        style={{
                          width: `${Math.min((g.valor_total_ganho_ytd / META_INDIVIDUAL_GERENTE) * 100, 100)}%`,
                        }}
                      />
                    </div>
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
