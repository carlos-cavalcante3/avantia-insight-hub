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
} from "recharts";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { Card } from "@/components/ui/card";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import {
  useKpisVendas,
  useKpisPorSetor,
  usePipelinePonderado,
  useTopClientesPeriodo,
  useVendasGestorPeriodo,
  useReferenciasVendasAno2025,
  type Sector,
  SECTOR_LABEL,
  METAS_ANUAIS,
  METAS_MENSAIS,
} from "@/hooks/useVendasData";
import {
  DollarSign,
  ListChecks,
  Receipt,
  Target,
  Layers,
  Calculator,
  ArrowDownRight,
  ArrowUpRight,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PonderadoTooltipContent } from "./PonderadoTooltipContent";

interface VendasTabProps {
  sector: Sector;
}

/* ---------------- KPI strip ---------------- */

type KpiPreviousKind = "brl" | "number" | "percent";

interface KpiItem {
  label: string;
  value: string;
  icon: LucideIcon;
  deltaPct: number;
  previousYear: number;
  previousAbsolute: number | null;
  previousKind: KpiPreviousKind;
}

const formatKpiPrevious = (kind: KpiPreviousKind, v: number | null): string => {
  if (v == null || Number.isNaN(Number(v))) return "—";
  if (kind === "brl") return formatBRL(Number(v));
  if (kind === "number") return formatNumber(Math.round(Number(v)));
  return formatPercent(Number(v));
};

const pctVs = (cur: number, prev: number) =>
  prev > 0 ? ((cur / prev) - 1) * 100 : cur > 0 ? 100 : 0;

const KpiStrip = ({
  title,
  subtitle,
  items,
  isLoading,
  compareLoading,
}: {
  title: string;
  subtitle: string;
  items: KpiItem[];
  isLoading: boolean;
  compareLoading: boolean;
}) => (
  <ReportCard title={title} subtitle={subtitle}>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-md border border-border/60 bg-gradient-to-br from-card to-muted/40 p-3 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {it.label}
            </p>
            <it.icon className="h-4 w-4 text-brand-blue" />
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-24 mt-2" />
          ) : (
            <>
              <p className="mt-1 text-xl lg:text-2xl font-bold text-foreground tabular-nums tracking-tight">
                {it.value}
              </p>
              {it.label === "Taxa de Conversão" ? null : compareLoading ? (
                <Skeleton className="h-4 w-40 mt-1" />
              ) : (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">
                    {it.previousYear}: {formatKpiPrevious(it.previousKind, it.previousAbsolute)}
                  </span>
                  <span
                    className={`text-xs font-bold flex items-center gap-0.5 ${
                      it.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {it.deltaPct >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 shrink-0" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 shrink-0" />
                    )}
                    {`${it.deltaPct >= 0 ? "+" : ""}${formatPercent(it.deltaPct)} vs ${it.previousYear}`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  </ReportCard>
);

/* ---------------- Pipeline cards ---------------- */

const BigValueCard = ({
  title,
  subtitle,
  value,
  qtd,
  isLoading,
  infoTooltip,
}: {
  title: string;
  subtitle: string;
  value: string;
  qtd?: number;
  isLoading: boolean;
  infoTooltip?: "ponderado" | string;
}) => (
  <Card className="relative p-5">
    {infoTooltip && (
      <div className="absolute top-4 right-4">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Informação do cálculo"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <Info className="h-4 w-4 text-slate-500 hover:text-slate-700" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              collisionPadding={{ left: 16, right: 20, top: 8, bottom: 8 }}
              avoidCollisions
              className="bg-slate-900 text-white border-slate-900 shadow-lg max-w-[280px] p-3"
            >
              {infoTooltip === "ponderado" ? (
                <PonderadoTooltipContent />
              ) : (
                <p className="text-xs leading-snug text-white">{infoTooltip}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )}

    <div className="mb-4 pr-8">
      <h3 className="text-lg font-semibold text-slate-800 leading-none">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>

    <div className="flex flex-col">
      {isLoading ? (
        <Skeleton className="h-10 w-2/3" />
      ) : (
        <span className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">{value}</span>
      )}
      {qtd != null && !isLoading && <p className="text-xs text-slate-500 mt-1">{qtd} negócios em aberto</p>}
    </div>
  </Card>
);

/* ---------------- Metas banner ---------------- */

const SECTORS: Sector[] = ["avantia", "publico", "privado", "audio_video"];

const MetaSectorThermo = ({
  sector,
  atingido,
  meta,
}: {
  sector: Sector;
  atingido: number;
  meta: number;
}) => {
  const pct = meta > 0 ? Math.min(Math.max(atingido / meta, 0), 1) : 0;
  const falta = Math.max(meta - atingido, 0);
  const widthPct = `${(pct * 100).toFixed(1)}%`;
  const pctLabel = formatPercent(pct * 100);
  return (
    <div className="rounded-md border border-border/60 bg-card p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground truncate">{SECTOR_LABEL[sector]}</p>
      </div>
      {/* Thermometer */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden border border-border/40">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-blue/70 to-brand-blue rounded-full transition-all duration-700"
          style={{ width: widthPct }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold leading-none text-slate-600/80 tabular-nums">
          {pctLabel}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Falta <strong className="text-foreground">{formatBRL(falta)}</strong> para atingir a meta
      </p>
    </div>
  );
};

const MetasBanner = ({
  title,
  subtitle,
  metas,
  atingidos,
  isLoading,
}: {
  title: string;
  subtitle: string;
  metas: Record<Sector, number>;
  atingidos: Record<Sector, number> | null;
  isLoading: boolean;
}) => (
  <ReportCard title={title} subtitle={subtitle}>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      {SECTORS.map((s) => {
        return (
          <div
            key={`hdr-${s}`}
            className="rounded-md bg-gradient-to-br from-brand-blue/5 to-brand-blue/15 border border-brand-blue/20 p-3 text-left"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {SECTOR_LABEL[s]}
            </p>
            {isLoading ? (
              <Skeleton className="h-6 w-40 mt-1.5" />
            ) : (
              <div className="w-full text-center my-2">
                <p className="text-[10px] uppercase tracking-wider text-brand-blue/80 font-semibold">
                  Meta
                </p>
                <span className="text-xl lg:text-2xl font-black text-slate-800 block">
                  {formatBRL(metas[s])}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {SECTORS.map((s) =>
        isLoading ? (
          <Skeleton key={`thermo-${s}`} className="h-20 w-full" />
        ) : (
          <MetaSectorThermo
            key={`thermo-${s}`}
            sector={s}
            atingido={atingidos?.[s] ?? 0}
            meta={metas[s]}
          />
        )
      )}
    </div>
  </ReportCard>
);

/* ---------------- Charts ---------------- */

interface ValuePoint {
  label: string;
  valor: number;
}

const wrapAxisLabel = (value: string, maxLineLength = 24, maxLines = 2) => {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];

  for (const word of words) {
    if (!lines.length) {
      lines.push(word);
      continue;
    }
    const current = lines[lines.length - 1] ?? "";
    const next = current ? `${current} ${word}` : word;
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

  return lines.length ? lines.slice(0, maxLines) : ["-"];
};

const ValueBarChart = ({
  data,
  isLoading,
  emptyLabel,
}: {
  data: ValuePoint[];
  isLoading: boolean;
  emptyLabel: string;
}) => {
  if (isLoading) return <Skeleton className="h-[450px] w-full" />;
  if (!data.length)
    return (
      <div className="h-[450px] flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  const chartHeight = Math.max(420, data.length * 48 + 64);
  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <div className="flex h-full w-full items-start justify-start overflow-x-auto">
        <div className="h-full w-full min-w-[560px] max-w-[820px] text-left">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 132, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={210}
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
                cursor={false}
                content={() => null}
                wrapperStyle={{ display: "none" }}
              />
              <Bar
                dataKey="valor"
                fill="hsl(var(--primary))"
                radius={[0, 6, 6, 0]}
                barSize={18}
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
      </div>
    </div>
  );
};

/* ---------------- Page ---------------- */

export const VendasTab = ({ sector }: VendasTabProps) => {
  const kpis = useKpisVendas(sector);
  const kpisPorSetor = useKpisPorSetor();
  const pipeline = usePipelinePonderado(sector);
  const clientes = useTopClientesPeriodo(sector, 15);
  const gestores = useVendasGestorPeriodo(sector);
  const refs2025 = useReferenciasVendasAno2025(sector);

  if (kpis.error) return <ErrorState message={(kpis.error as Error).message} />;

  const ytdItems: KpiItem[] = useMemo(() => {
    const k = kpis.data;
    const ref = refs2025.data;
    const refYear = ref?.refYear ?? 2025;
    if (!k) {
      return [
        { label: "Valor Fechado", value: "—", icon: DollarSign, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "brl" as const },
        { label: "Qtd. de Negócios", value: "—", icon: ListChecks, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "number" as const },
        { label: "Ticket Médio", value: "—", icon: Receipt, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "brl" as const },
        { label: "Taxa de Conversão", value: "—", icon: Target, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "percent" as const },
      ];
    }
    const deltaFromRef = (cur: number, prev: number | null | undefined) => {
      if (!ref) return 0;
      if (prev != null && prev > 0) return pctVs(cur, prev);
      if (prev === 0 && cur > 0) return 100;
      return 0;
    };
    const prevValor = ref?.receitaYtd2025;
    const prevQtd = ref?.qtdYtd2025;
    const prevTicket = ref?.ticketYtd2025;
    const prevWin = k.win_rate_ytd_ano_anterior;
    return [
      {
        label: "Valor Fechado",
        value: formatBRL(k.valor_ytd),
        icon: DollarSign,
        deltaPct: deltaFromRef(k.valor_ytd, prevValor),
        previousYear: refYear,
        previousAbsolute: prevValor ?? null,
        previousKind: "brl",
      },
      {
        label: "Qtd. de Negócios",
        value: formatNumber(k.qtd_ytd),
        icon: ListChecks,
        deltaPct: deltaFromRef(k.qtd_ytd, prevQtd),
        previousYear: refYear,
        previousAbsolute: prevQtd ?? null,
        previousKind: "number",
      },
      {
        label: "Ticket Médio",
        value: formatBRL(k.ticket_ytd),
        icon: Receipt,
        deltaPct: deltaFromRef(k.ticket_ytd, prevTicket),
        previousYear: refYear,
        previousAbsolute: prevTicket ?? null,
        previousKind: "brl",
      },
      {
        label: "Taxa de Conversão",
        value: formatPercent(k.win_rate_ytd),
        icon: Target,
        deltaPct:
          prevWin != null && prevWin > 0 ? pctVs(k.win_rate_ytd, prevWin) : 0,
        previousYear: refYear,
        previousAbsolute: prevWin,
        previousKind: "percent",
      },
    ];
  }, [kpis.data, refs2025.data]);

  const mtdItems: KpiItem[] = useMemo(() => {
    const k = kpis.data;
    const ref = refs2025.data;
    const refYear = ref?.refYear ?? 2025;
    if (!k) {
      return [
        { label: "Valor Fechado", value: "—", icon: DollarSign, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "brl" as const },
        { label: "Qtd. de Negócios", value: "—", icon: ListChecks, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "number" as const },
        { label: "Ticket Médio", value: "—", icon: Receipt, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "brl" as const },
        { label: "Taxa de Conversão", value: "—", icon: Target, deltaPct: 0, previousYear: refYear, previousAbsolute: null, previousKind: "percent" as const },
      ];
    }
    const deltaMtd = (cur: number, prev: number | null | undefined) => {
      if (!ref) return 0;
      if (prev != null && prev > 0) return pctVs(cur, prev);
      if (prev === 0 && cur > 0) return 100;
      return 0;
    };
    const prevValor = ref?.receitaMtd2025;
    const prevQtd = ref?.qtdMtd2025;
    const prevTicket = ref?.ticketMtd2025;
    const prevWin = k.win_rate_mtd_ano_anterior;
    return [
      {
        label: "Valor Fechado",
        value: formatBRL(k.valor_mtd),
        icon: DollarSign,
        deltaPct: deltaMtd(k.valor_mtd, prevValor),
        previousYear: refYear,
        previousAbsolute: prevValor ?? null,
        previousKind: "brl",
      },
      {
        label: "Qtd. de Negócios",
        value: formatNumber(k.qtd_mtd),
        icon: ListChecks,
        deltaPct: deltaMtd(k.qtd_mtd, prevQtd),
        previousYear: refYear,
        previousAbsolute: prevQtd ?? null,
        previousKind: "number",
      },
      {
        label: "Ticket Médio",
        value: formatBRL(k.ticket_mtd),
        icon: Receipt,
        deltaPct: deltaMtd(k.ticket_mtd, prevTicket),
        previousYear: refYear,
        previousAbsolute: prevTicket ?? null,
        previousKind: "brl",
      },
      {
        label: "Taxa de Conversão",
        value: formatPercent(k.win_rate_mtd),
        icon: Target,
        deltaPct:
          prevWin != null && prevWin > 0 ? pctVs(k.win_rate_mtd, prevWin) : 0,
        previousYear: refYear,
        previousAbsolute: prevWin,
        previousKind: "percent",
      },
    ];
  }, [kpis.data, refs2025.data]);

  const atingidosYtd = kpisPorSetor.data
    ? {
        avantia: kpisPorSetor.data.avantia.valor_ytd,
        publico: kpisPorSetor.data.publico.valor_ytd,
        privado: kpisPorSetor.data.privado.valor_ytd,
        audio_video: kpisPorSetor.data.audio_video.valor_ytd,
      }
    : null;

  const atingidosMtd = kpisPorSetor.data
    ? {
        avantia: kpisPorSetor.data.avantia.valor_mtd,
        publico: kpisPorSetor.data.publico.valor_mtd,
        privado: kpisPorSetor.data.privado.valor_mtd,
        audio_video: kpisPorSetor.data.audio_video.valor_mtd,
      }
    : null;

  const clientesYtdData: ValuePoint[] =
    clientes.data?.ytd.map((c) => ({
      label: c.empresa_nome,
      valor: c.valor_ytd,
    })) ?? [];
  const clientesMtdData: ValuePoint[] =
    clientes.data?.mtd.map((c) => ({
      label: c.empresa_nome,
      valor: c.valor_mtd,
    })) ?? [];
  const gestoresYtdData: ValuePoint[] =
    gestores.data?.ytd.map((g) => ({ label: g.gestor_nome, valor: g.valor_ytd })) ?? [];
  const gestoresMtdData: ValuePoint[] =
    gestores.data?.mtd.map((g) => ({ label: g.gestor_nome, valor: g.valor_mtd })) ?? [];

  const sectorLabel = SECTOR_LABEL[sector];

  return (
    <>
      {/* Bloco 1 - YTD */}
      <KpiStrip
        title="Vendas do Ano (YTD)"
        subtitle={`Acumulado ${new Date().getFullYear()} · ${sectorLabel}`}
        items={ytdItems}
        isLoading={kpis.isLoading}
        compareLoading={kpis.isLoading || refs2025.isLoading}
      />

      {/* Bloco 2 - MTD */}
      <KpiStrip
        title="Vendas do Mês (MTD)"
        subtitle={`Mês corrente · ${sectorLabel}`}
        items={mtdItems}
        isLoading={kpis.isLoading}
        compareLoading={kpis.isLoading || refs2025.isLoading}
      />

      {/* Blocos 3 + 4 - Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BigValueCard
          title="Valor Total do Pipeline"
          subtitle={`Negócios em aberto · ${sectorLabel}`}
          value={pipeline.data ? formatBRL(pipeline.data.valor_pipeline_bruto) : "—"}
          qtd={pipeline.data?.qtd_aberto}
          isLoading={pipeline.isLoading}
        />
        <BigValueCard
          title="Pipeline Ponderado"
          subtitle={`Valor × probabilidade · ${sectorLabel}`}
          value={pipeline.data ? formatBRL(pipeline.data.valor_pipeline_ponderado) : "—"}
          isLoading={pipeline.isLoading}
          infoTooltip="ponderado"
        />
      </div>

      {/* Bloco 5 - Metas Anual */}
      <MetasBanner
        title="Metas Anuais (YTD)"
        subtitle="Valor atingido por setor"
        metas={METAS_ANUAIS}
        atingidos={atingidosYtd}
        isLoading={kpisPorSetor.isLoading}
      />

      {/* Bloco 6 - Metas Mensal */}
      <MetasBanner
        title="Metas Mensais (MTD)"
        subtitle="Atingimento do mês corrente por setor"
        metas={METAS_MENSAIS}
        atingidos={atingidosMtd}
        isLoading={kpisPorSetor.isLoading}
      />

      {/* Blocos 7 + 8 - YTD charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard title="Top 15 Clientes (YTD)" subtitle={`Por valor vendido · ${sectorLabel}`}>
          <ValueBarChart
            data={clientesYtdData}
            isLoading={clientes.isLoading}
            emptyLabel="Sem vendas no período"
          />
        </ReportCard>
        <ReportCard title="Vendas por Gerente (YTD)" subtitle={`Por valor vendido · ${sectorLabel}`}>
          <ValueBarChart
            data={gestoresYtdData}
            isLoading={gestores.isLoading}
            emptyLabel="Sem vendas no período"
          />
        </ReportCard>
      </div>

      {/* Blocos 9 + 10 - MTD charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard title="Top 15 Clientes (MTD)" subtitle={`Mês corrente · ${sectorLabel}`}>
          <ValueBarChart
            data={clientesMtdData}
            isLoading={clientes.isLoading}
            emptyLabel="Sem vendas no mês"
          />
        </ReportCard>
        <ReportCard title="Vendas por Gerente (MTD)" subtitle={`Mês corrente · ${sectorLabel}`}>
          <ValueBarChart
            data={gestoresMtdData}
            isLoading={gestores.isLoading}
            emptyLabel="Sem vendas no mês"
          />
        </ReportCard>
      </div>
    </>
  );
};
