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
  Legend,
} from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber, formatDateBR } from "@/lib/format";
import {
  DollarSign,
  Layers,
  FileCheck,
  Activity,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  usePipelineAbertoPorGestor,
  useTopClientesGestor,
  useCurvaEvolucaoGestor,
  useCarteiraClientes,
  useRankingMovimentacoesDeals,
  useRankingVisitas,
} from "@/hooks/useGerentesData";
import { useVendasGestorPeriodo } from "@/hooks/useVendasData";

interface AnaliseGerentesTabProps {
  gestor: string | null;
}

const KpiBlock = ({
  label,
  value,
  icon: Icon,
  isLoading,
  highlight,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  isLoading: boolean;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      "rounded-lg border p-4 transition-shadow",
      highlight
        ? "border-brand-blue/30 bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 shadow-md"
        : "border-border/60 bg-gradient-to-br from-card to-muted/40"
    )}
  >
    <div className="flex items-center justify-between">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <Icon className="h-4 w-4 text-brand-blue" />
    </div>
    {isLoading ? (
      <Skeleton className="h-9 w-32 mt-2" />
    ) : (
      <p className="mt-2 text-2xl lg:text-3xl font-bold text-foreground tabular-nums tracking-tight">
        {value}
      </p>
    )}
  </div>
);

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

const wrapAxisLabel = (value: string, maxLineLength = 20, maxLines = 2) => {
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

  return lines.length ? lines.slice(0, maxLines) : ["Cliente não informado"];
};

export const AnaliseGerentesTab = ({ gestor }: AnaliseGerentesTabProps) => {
  const perf = usePerformanceGestor();
  const vendasGestor = useVendasGestorPeriodo("avantia");
  const pipelineAberto = usePipelineAbertoPorGestor(gestor);
  const topClientes = useTopClientesGestor(gestor);
  const curva = useCurvaEvolucaoGestor(gestor);
  const carteira = useCarteiraClientes(gestor);
  const movs = useRankingMovimentacoesDeals(200);
  const visitas = useRankingVisitas(200);

  if (perf.error) return <ErrorState message={(perf.error as Error).message} />;

  const gestorPerf = perf.data?.find((g) => g?.gestor_nome === gestor);
  const gestorVendas = vendasGestor.data?.ytd?.find?.(
    (g) => g?.gestor_nome === gestor
  );

  const isLoadingTop = perf.isLoading || vendasGestor.isLoading;

  const totalPropostasPipeline = useMemo(
    () =>
      (carteira.data ?? []).reduce(
        (s, r) => s + Number(r?.propostas_atuais ?? 0),
        0
      ),
    [carteira.data]
  );

  const top5Clientes = useMemo(
    () => (topClientes.data ?? []).slice(0, 5),
    [topClientes.data]
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
  const pipelineQtdNegocios =
    pipelineAberto?.data != null ? Number(pipelineAberto.data) : 0;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <ReportCard
        title={`Análise do Gerente · ${gestor ?? "—"}`}
        subtitle="Indicadores consolidados do gerente selecionado"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiBlock
            label="Vendas YTD"
            value={formatBRL(vendasYtdValor)}
            icon={DollarSign}
            isLoading={isLoadingTop}
            highlight
          />
          <KpiBlock
            label="Pipeline · Qtd Negócios"
            value={formatNumber(pipelineQtdNegocios)}
            icon={Layers}
            isLoading={pipelineAberto.isLoading}
            highlight
          />
          <KpiBlock
            label="Pipeline · Qtd Propostas"
            value={formatNumber(totalPropostasPipeline)}
            icon={FileCheck}
            isLoading={carteira.isLoading}
            highlight
          />
        </div>
      </ReportCard>

      {/* Seção 1 — 3 cards lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard title="Vendas YTD" subtitle="Volume financeiro acumulado">
          <div className="h-[320px] flex flex-col items-center justify-center text-center">
            {isLoadingTop ? (
              <Skeleton className="h-12 w-48" />
            ) : (
              <>
                <DollarSign className="h-10 w-10 text-brand-blue mb-3" />
                <p className="text-3xl lg:text-4xl font-black text-foreground tabular-nums tracking-tight">
                  {formatBRL(vendasYtdValor)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {gestorPerf?.negocios_ganhos_ytd != null
                    ? `${formatNumber(gestorPerf.negocios_ganhos_ytd)} negócios fechados`
                    : "—"}
                </p>
              </>
            )}
          </div>
        </ReportCard>

        <ReportCard
          title="Top 5 Clientes (YTD)"
          subtitle="Maiores faturamentos do gerente"
        >
          <div className="h-[320px] w-full">
            {topClientes.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : top5Clientes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem clientes no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5Clientes}
                  layout="vertical"
                  margin={{ top: 8, right: 90, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.35}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="empresa_nome"
                    width={150}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const full = String(payload.value ?? "");
                      const lines = wrapAxisLabel(full);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <title>{full}</title>
                          {lines.map((line, index) => (
                            <text
                              key={`${line}-${index}`}
                              x={-8}
                              y={(index - (lines.length - 1) / 2) * 13}
                              dy={4}
                              textAnchor="end"
                              fill="#0f172a"
                              fontSize={11}
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
                    formatter={(v: number) => formatBRL(Number(v))}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="valor_ytd" fill="#f97316" radius={[0, 6, 6, 0]} barSize={16}>
                    <LabelList
                      dataKey="valor_ytd"
                      position="right"
                      fill="#0f172a"
                      fontSize={11}
                      formatter={(v: number) => formatBRL(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ReportCard>

        <ReportCard title="Pipeline Consolidado" subtitle="Negócios e propostas em aberto">
          <div className="h-[320px] flex flex-col justify-center gap-4">
            <div className="rounded-md border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Pipeline · Negócios
                </p>
                <Layers className="h-4 w-4 text-brand-blue" />
              </div>
              {pipelineAberto.isLoading ? (
                <Skeleton className="h-9 w-24 mt-2" />
              ) : (
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {formatNumber(pipelineQtdNegocios)}
                </p>
              )}
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Pipeline · Propostas
                </p>
                <FileCheck className="h-4 w-4 text-brand-blue" />
              </div>
              {carteira.isLoading ? (
                <Skeleton className="h-9 w-24 mt-2" />
              ) : (
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {formatNumber(totalPropostasPipeline)}
                </p>
              )}
            </div>
          </div>
        </ReportCard>
      </div>

      {/* Seção 2 — Curva temporal */}
      <ReportCard
        title="Curva de Geração de Oportunidades"
        subtitle="Evolução mensal do funil do gerente"
      >
        <div className="h-[420px] w-full">
          {curva.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (curva.data ?? []).length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem histórico para este gerente.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={curva.data}
                margin={{ top: 16, right: 24, left: 8, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#0f172a" }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: "#0f172a" }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingBottom: 12 }} verticalAlign="top" />
                <Line
                  type="monotone"
                  dataKey="qtd_oportunidades"
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
                  dataKey="qtd_perdidos"
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

      {/* Seção 3 — Movimentações vs Visitas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard
          title="Movimentações no CRM"
          subtitle="Total de interações registradas pelo gerente"
        >
          <div className="h-[160px] flex items-center justify-center gap-4">
            <Activity className="h-12 w-12 text-brand-blue" />
            <div>
              {movs.isLoading ? (
                <Skeleton className="h-12 w-32" />
              ) : (
                <>
                  <p className="text-4xl font-black tabular-nums tracking-tight">
                    {formatNumber(Number(movsGestor?.qtd ?? 0))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">movimentações</p>
                </>
              )}
            </div>
          </div>
        </ReportCard>
        <ReportCard
          title="Visitas Comerciais"
          subtitle="Visitas e reuniões realizadas pelo gerente"
        >
          <div className="h-[160px] flex items-center justify-center gap-4">
            <CalendarCheck className="h-12 w-12 text-brand-blue" />
            <div>
              {visitas.isLoading ? (
                <Skeleton className="h-12 w-32" />
              ) : (
                <>
                  <p className="text-4xl font-black tabular-nums tracking-tight">
                    {formatNumber(Number(visitasGestor?.qtd ?? 0))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">visitas</p>
                </>
              )}
            </div>
          </div>
        </ReportCard>
      </div>

      {/* Seção 4 — Tabela de Carteira */}
      <ReportCard
        title="Carteira Detalhada de Clientes"
        subtitle="Comparativo histórico, pipeline e atividade"
      >
        {carteira.isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (carteira.data ?? []).length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
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
                    // 1) Maior pipeline financeiro primeiro
                    if (va > 0 || vb > 0) {
                      if (va !== vb) return vb - va;
                    }
                    // 2) Entre zerados: data de movimentação mais recente
                    const da = a?.ultima_movimentacao
                      ? new Date(a.ultima_movimentacao).getTime()
                      : -Infinity;
                    const db = b?.ultima_movimentacao
                      ? new Date(b.ultima_movimentacao).getTime()
                      : -Infinity;
                    if (da !== db) return db - da;
                    // 3) Zerados sem movimentação por último: já encaixa pela regra acima
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
                          pipeOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        )}
                      >
                        {formatBRL(valorPipe)}
                      </TableCell>
                      <TableCell
                        className={cn(semVisita && "text-red-600 font-bold")}
                      >
                        {row?.ultima_visita
                          ? formatDateBR(row.ultima_visita)
                          : "Sem visita"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(Number(row?.contatos_cadastrados ?? 0))}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap",
                          movAlerta && "text-red-600 font-bold"
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
