import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber, formatDateBR } from "@/lib/format";
import {
  DollarSign,
  Activity,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  usePerformanceGestor,
  useTopClientesGestor,
  useCurvaEvolucaoGestor,
  useCarteiraClientes,
  useRankingMovimentacoesDeals,
  useRankingVisitas,
  useOportunidadesGeradasMes,
} from "@/hooks/useGerentesData";
import { useVendasGestorPeriodo } from "@/hooks/useVendasData";
import { filterCurvaValid } from "@/lib/dateFilters";

interface AnaliseGerentesTabProps {
  gestor: string | null;
  periodo: string;
}

const normalizeNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const diasDesde = (iso: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
};

const wrapAxisLabel = (value: string, maxLineLength = 14, maxLines = 2) => {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    if (!lines.length) {
      lines.push(word);
      continue;
    }
    const current = lines[lines.length - 1] ?? "";
    const next = `${current} ${word}`;
    if (next.length <= maxLineLength) {
      lines[lines.length - 1] = next;
    } else if (lines.length < maxLines) {
      lines.push(word);
    } else {
      break;
    }
  }
  const normalized = lines.join(" ");
  if (normalized.length < value.trim().length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, maxLineLength - 3).trimEnd()}...`;
  }
  return lines.length ? lines.slice(0, maxLines) : ["Cliente"];
};

const OportunidadesTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      qtd_geradas?: number;
      qtd_oportunidades?: number;
      detalhes_oportunidades?: Array<{ cliente_nome?: string; valor?: number | null }>;
    };
  }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const detalhes = (row?.detalhes_oportunidades ?? []).slice(0, 12);

  return (
    <div className="max-w-sm rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-xl">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-slate-300">
        {formatNumber(Number(row?.qtd_geradas ?? row?.qtd_oportunidades ?? payload[0]?.value ?? 0))} oportunidades
      </p>
      {detalhes.length > 0 && (
        <div className="mt-2 space-y-1">
          {detalhes.map((item, index) => {
            const valor = Number(item.valor ?? 0);
            return (
              <div key={`${item.cliente_nome}-${index}`} className="flex items-center justify-between gap-4 border-b border-slate-800/50 py-1.5 last:border-0">
                <span className="max-w-[180px] truncate font-medium text-slate-200">
                  {item.cliente_nome ?? "Negócio Confidencial"}
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-slate-400">
                  {valor > 0 ? formatBRL(valor) : "Sem valor"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AnaliseGerentesTab = ({ gestor, periodo }: AnaliseGerentesTabProps) => {
  const currentMonth = new Date().getMonth() + 1;
  const selectedMonth = periodo === "ytd" ? currentMonth : Number(periodo.replace("mes-", ""));
  const perf = usePerformanceGestor(selectedMonth);
  const vendasGestor = useVendasGestorPeriodo("avantia", selectedMonth);
  const topClientes = useTopClientesGestor(gestor, selectedMonth);
  const curva = useCurvaEvolucaoGestor(gestor);
  const oportunidadesMes = useOportunidadesGeradasMes(gestor);
  const carteira = useCarteiraClientes(gestor);
  const movs = useRankingMovimentacoesDeals(200);
  const visitas = useRankingVisitas(200);

  if (perf.error) return <ErrorState message={(perf.error as Error).message} />;

  const gestorPerf = perf.data?.find((g) => g?.gestor_nome === gestor);
  const gestorVendas = vendasGestor.data?.ytd?.find?.(
    (g) => g?.gestor_nome === gestor
  );

  const isLoadingTop = perf.isLoading || vendasGestor.isLoading;

  const top5ClientesMes = useMemo(
    () =>
      [...(topClientes.data ?? [])]
        .filter((c) => Number(c.valor_mtd ?? 0) > 0)
        .sort((a, b) => b.valor_mtd - a.valor_mtd || b.valor_ytd - a.valor_ytd)
        .slice(0, 5),
    [topClientes.data]
  );

  const curvaFiltrada = useMemo(
    () => filterCurvaValid(curva.data ?? []),
    [curva.data]
  );

  const oportunidadesData = useMemo(
    () => oportunidadesMes.data ?? [],
    [oportunidadesMes.data]
  );

  const movsGestor = useMemo(() => {
    const alvo = gestor ? normalizeNome(gestor) : "";
    return (movs.data ?? []).find(
      (m) => normalizeNome(m.responsavel) === alvo
    );
  }, [movs.data, gestor]);

  const visitasGestor = useMemo(() => {
    const alvo = gestor ? normalizeNome(gestor) : "";
    return (visitas.data ?? []).find(
      (v) => normalizeNome(v.responsavel) === alvo
    );
  }, [visitas.data, gestor]);

  const vendasYtdValor =
    gestorVendas?.valor_ytd != null ? Number(gestorVendas.valor_ytd) : 0;

  return (
    <div className="space-y-4">
      {/* Linha superior — 3 KPIs alinhados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard title="Vendas YTD" subtitle="Volume financeiro acumulado">
          <div className="h-[140px] flex flex-col items-center justify-center text-center">
            {isLoadingTop ? (
              <Skeleton className="h-10 w-40 bg-slate-800" />
            ) : (
              <>
                <DollarSign className="h-8 w-8 text-blue-500 mb-2" />
                <p className="text-2xl lg:text-3xl font-black text-slate-50 tabular-nums tracking-tight">
                  {formatBRL(vendasYtdValor)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {gestorVendas?.qtd_ytd != null
                    ? `${formatNumber(gestorVendas.qtd_ytd)} negócios fechados`
                    : "—"}
                </p>
              </>
            )}
          </div>
        </ReportCard>

        <ReportCard title="Movimentações no CRM" subtitle="Interações registradas">
          <div className="h-[140px] flex items-center justify-center gap-4">
            <Activity className="h-10 w-10 text-blue-500 shrink-0" />
            <div>
              {movs.isLoading ? (
                <Skeleton className="h-10 w-24 bg-slate-800" />
              ) : (
                <>
                  <p className="text-3xl font-black tabular-nums text-slate-50">
                    {formatNumber(Number(movsGestor?.qtd ?? 0))}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">movimentações</p>
                </>
              )}
            </div>
          </div>
        </ReportCard>

        <ReportCard title="Visitas Comerciais" subtitle="Visitas e reuniões realizadas">
          <div className="h-[140px] flex items-center justify-center gap-4">
            <CalendarCheck className="h-10 w-10 text-orange-500 shrink-0" />
            <div>
              {visitas.isLoading ? (
                <Skeleton className="h-10 w-24 bg-slate-800" />
              ) : (
                <>
                  <p className="text-3xl font-black tabular-nums text-slate-50">
                    {formatNumber(Number(visitasGestor?.qtd ?? 0))}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">visitas</p>
                </>
              )}
            </div>
          </div>
        </ReportCard>
      </div>

      {/* Grid assimétrico — Top 5 compacto + Oportunidades mês a mês */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportCard
          title="Top 5 Clientes do Mês"
          subtitle="Maiores faturamentos MTD"
          className="lg:col-span-1"
        >
          <div className="h-[300px] w-full">
            {topClientes.isLoading ? (
              <Skeleton className="h-full w-full bg-slate-800" />
            ) : top5ClientesMes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Sem clientes no mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5ClientesMes}
                  layout="vertical"
                  margin={{ top: 4, right: 72, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    opacity={0.35}
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="empresa_nome"
                    width={96}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const full = String(payload.value ?? "");
                      const lines = wrapAxisLabel(full, 12, 2);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <title>{full}</title>
                          {lines.map((line, index) => (
                            <text
                              key={`${line}-${index}`}
                              x={-4}
                              y={(index - (lines.length - 1) / 2) * 11}
                              dy={3}
                              textAnchor="end"
                              fill="#94a3b8"
                              fontSize={10}
                              fontWeight={600}
                            >
                              {line}
                            </text>
                          ))}
                        </g>
                      );
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [formatBRL(Number(value)), "Valor Investido"]}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 11,
                      color: "#e2e8f0",
                    }}
                  />
                  <Bar
                    dataKey="valor_mtd"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    <LabelList
                      dataKey="valor_mtd"
                      position="right"
                      fill="#e2e8f0"
                      fontSize={10}
                      formatter={(v: number) => formatBRL(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ReportCard>

        <ReportCard
          title="Oportunidades Geradas Mês a Mês"
          subtitle="Quantidade de oportunidades geradas por mês"
          className="lg:col-span-2"
        >
          <div className="h-[300px] w-full">
            {oportunidadesMes.isLoading ? (
              <Skeleton className="h-full w-full bg-slate-800" />
            ) : oportunidadesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Sem oportunidades registradas no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={oportunidadesData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    allowDecimals={false}
                    domain={[0, (max: number) => Math.max(Math.ceil(max * 1.2), 1)]}
                  />
                  <RechartsTooltip content={<OportunidadesTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#e2e8f0" }}
                    formatter={(v) => <span style={{ color: "#e2e8f0" }}>{v}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="qtd_oportunidades"
                    name="Oportunidades"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#3b82f6" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ReportCard>
      </div>

      {/* Curva de evolução — largura total */}
      <ReportCard
        title="Curva de Geração de Oportunidades"
        subtitle="Evolução mensal do funil do gerente"
      >
        <div className="h-[420px] w-full">
          {curva.isLoading ? (
            <Skeleton className="h-full w-full bg-slate-800" />
          ) : curvaFiltrada.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Sem histórico para este gerente.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={curvaFiltrada}
                margin={{ top: 16, right: 24, left: 8, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
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
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="top"
                  iconType="line"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 12, color: "#e2e8f0" }}
                  formatter={(value) => <span style={{ color: "#e2e8f0" }}>{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="qtd_geradas"
                  name="Oportunidades Geradas"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="qtd_propostas"
                  name="Propostas Colocadas"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="qtd_fechados"
                  name="Negócios Fechados"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="qtd_perdidas"
                  name="Negócios Perdidos"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ReportCard>

      {/* Carteira detalhada */}
      <ReportCard
        title="Carteira Detalhada de Clientes"
        subtitle="Comparativo histórico, pipeline e atividade"
      >
        {carteira.isLoading ? (
          <Skeleton className="h-[400px] w-full bg-slate-800" />
        ) : (carteira.data ?? []).length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Sem clientes na carteira deste gerente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Oport. 2025</TableHead>
                  <TableHead className="text-right">Prop. 2025</TableHead>
                  <TableHead className="text-right">Oport. Atuais</TableHead>
                  <TableHead className="text-right">Prop. Atuais</TableHead>
                  <TableHead className="text-right">Pipeline do Cliente</TableHead>
                  <TableHead>Última Visita</TableHead>
                  <TableHead className="text-right">Contatos</TableHead>
                  <TableHead>Última Movimentação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...(carteira.data ?? [])]
                  .sort((a, b) => {
                    const va = Number(a?.valor_pipeline ?? 0);
                    const vb = Number(b?.valor_pipeline ?? 0);
                    if (va > 0 || vb > 0) {
                      if (va !== vb) return vb - va;
                    }
                    const da = a?.ultima_movimentacao
                      ? new Date(a.ultima_movimentacao).getTime()
                      : -Infinity;
                    const db = b?.ultima_movimentacao
                      ? new Date(b.ultima_movimentacao).getTime()
                      : -Infinity;
                    if (da !== db) return db - da;
                    return 0;
                  })
                  .map((row, idx) => {
                    const valorPipe = Number(row?.valor_pipeline ?? 0);
                    const pipeOk = valorPipe > 0;
                    const dias = diasDesde(row?.ultima_movimentacao ?? null);
                    const movAlerta = dias != null && dias > 30;
                    const semVisita = !row?.ultima_visita;
                    return (
                      <TableRow key={`${row?.cliente_nome ?? "row"}-${idx}`}>
                        <TableCell className="font-medium">{row?.cliente_nome ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{row?.conta_nome ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(Number(row?.oportunidades_2025 ?? 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(Number(row?.propostas_2025 ?? 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(Number(row?.oportunidades_atuais ?? 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(Number(row?.propostas_atuais ?? 0))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-medium",
                            pipeOk
                              ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
                              : "bg-red-500/10 text-red-400"
                          )}
                        >
                          {formatBRL(valorPipe)}
                        </TableCell>
                        <TableCell className={cn(semVisita && "text-red-400 font-bold")}>
                          {row?.ultima_visita ? formatDateBR(row.ultima_visita) : "Sem visita"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(Number(row?.contatos_cadastrados ?? 0))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap",
                            movAlerta && "text-red-400 font-bold"
                          )}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {movAlerta && <AlertTriangle className="h-3.5 w-3.5" />}
                            <span>
                              {row?.ultima_movimentacao
                                ? formatDateBR(row.ultima_movimentacao)
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportCard>
    </div>
  );
};
