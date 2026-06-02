import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Tooltip as RTooltip,
  Legend,
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
  useVendasComposicaoMesAMes,
  type Sector,
  SECTOR_LABEL,
  METAS_ANUAIS,
  METAS_MENSAIS,
  METAS_MENSAIS_POR_MES,
  type VendaDetalhe,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PonderadoTooltipContent } from "./PonderadoTooltipContent";
import { kpiTileClass } from "@/lib/avantiaTheme";

interface VendasTabProps {
  sector: Sector;
  periodo: string;
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
          className={`${kpiTileClass} hover:-translate-y-0.5`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {it.label}
            </p>
            <it.icon className="h-4 w-4 text-blue-500" />
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
  <Card className="relative p-5 bg-slate-900 border-slate-800/60 shadow-lg">
    {infoTooltip && (
      <div className="absolute top-4 right-4">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Informação do cálculo"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              collisionPadding={{ left: 16, right: 20, top: 8, bottom: 8 }}
              avoidCollisions
              className="bg-popover text-popover-foreground border-border shadow-lg max-w-[280px] p-3"
            >
              {infoTooltip === "ponderado" ? (
                <PonderadoTooltipContent />
              ) : (
                <p className="text-xs leading-snug">{infoTooltip}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )}

    <div className="mb-4 pr-8">
      <h3 className="text-lg font-semibold text-foreground leading-none">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>

    <div className="flex flex-col">
      {isLoading ? (
        <Skeleton className="h-10 w-2/3" />
      ) : (
        <span className="text-3xl lg:text-4xl font-black text-white tracking-tight">{value}</span>
      )}
      {qtd != null && !isLoading && <p className="text-xs text-muted-foreground mt-1">{qtd} negócios em aberto</p>}
    </div>
  </Card>
);


/* ---------------- Metas banner ---------------- */

const SECTORS: Sector[] = ["avantia", "publico", "privado", "audio_video"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

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
    <div className="rounded-lg border border-slate-800/60 bg-slate-900/90 p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground truncate">{SECTOR_LABEL[sector]}</p>
      </div>
      {/* Thermometer */}
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full transition-all duration-700"
          style={{ width: widthPct }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold leading-none text-slate-200/90 tabular-nums">
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
            className="rounded-lg bg-gradient-to-br from-blue-600/10 to-orange-500/10 border border-blue-600/25 p-3 text-left"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {SECTOR_LABEL[s]}
            </p>
            {isLoading ? (
              <Skeleton className="h-6 w-40 mt-1.5" />
            ) : (
              <div className="w-full text-center my-2">
                <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                  Meta
                </p>
                <span className="text-xl lg:text-2xl font-black text-foreground block">
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
  detalhes?: VendaDetalhe[];
}

const DetailsPanel = ({ point }: { point: ValuePoint }) => {
  const detalhes = point.detalhes?.filter((d) => Number(d.valor) > 0) ?? [];
  return (
    <div className="w-72 text-xs">
      <p className="font-semibold text-slate-100">{point.label}</p>
      <p className="mt-0.5 text-slate-400">Total: {formatBRL(Number(point.valor ?? 0))}</p>
      <ScrollArea className="h-64 mt-2 pr-2">
        <div className="space-y-2">
          {detalhes.length ? (
            detalhes.map((item, index) => (
              <div
                key={`${item.nome}-${index}`}
                className="rounded-md border border-slate-800/60 bg-slate-950/80 p-2"
              >
                <p className="font-medium text-slate-100">{item.nome || item.cliente || "Negócio"}</p>
                <p className="text-slate-400">
                  {item.cliente || "Cliente não informado"} · {item.gerente || "—"}
                </p>
                <p className="font-semibold text-blue-400">{formatBRL(Number(item.valor ?? 0))}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400">Sem contratos detalhados para este total.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const DetailInfoTrigger = ({ point }: { point: ValuePoint }) => {
  const hasDetails = (point.detalhes?.length ?? 0) > 0;
  if (!hasDetails) return <span className="inline-block h-7 w-7" aria-hidden />;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Detalhes de ${point.label}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors"
        >
          <Info className="w-4 h-4 cursor-pointer text-slate-400 hover:text-blue-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        className="border-slate-800/60 bg-slate-900 p-3 shadow-xl"
      >
        <DetailsPanel point={point} />
      </PopoverContent>
    </Popover>
  );
};

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

const ROW_H = 44;

/** Lista flex com barras neon — alinhamento perfeito do ícone (i). */
const GerenteValueList = ({
  data,
  isLoading,
  emptyLabel,
}: {
  data: ValuePoint[];
  isLoading: boolean;
  emptyLabel: string;
}) => {
  if (isLoading) return <Skeleton className="h-[450px] w-full" />;
  if (!data.length) {
    return (
      <div className="h-[450px] flex items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }
  const maxValor = Math.max(...data.map((d) => d.valor), 1);
  return (
    <div className="space-y-1 py-1">
      {data.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 w-full"
          style={{ minHeight: ROW_H }}
        >
          <div
            className="w-[28%] min-w-[88px] shrink-0 text-xs font-semibold text-slate-200 truncate"
            title={row.label}
          >
            {row.label}
          </div>
          <div className="flex-1 min-w-[60px] h-[18px] rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-all"
              style={{ width: `${Math.max((row.valor / maxValor) * 100, 2)}%` }}
            />
          </div>
          <span className="w-[88px] shrink-0 text-right text-xs font-semibold tabular-nums text-slate-100">
            {formatBRL(row.valor)}
          </span>
          <div className="shrink-0 flex items-center justify-center w-7">
            <DetailInfoTrigger point={row} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ValueBarChart = ({
  data,
  isLoading,
  emptyLabel,
  detailsViaIcon = false,
  barNeon = false,
}: {
  data: ValuePoint[];
  isLoading: boolean;
  emptyLabel: string;
  detailsViaIcon?: boolean;
  /** Neon laranja apenas em barras horizontais (gerentes). */
  barNeon?: boolean;
}) => {
  if (detailsViaIcon) {
    return <GerenteValueList data={data} isLoading={isLoading} emptyLabel={emptyLabel} />;
  }
  if (isLoading) return <Skeleton className="h-[450px] w-full" />;
  if (!data.length)
    return (
      <div className="h-[450px] flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  const chartHeight = Math.max(420, data.length * ROW_H + 56);
  const maxLen = data.reduce((m, d) => Math.max(m, (d.label ?? "").length), 0);
  const yAxisWidth = Math.min(180, Math.max(96, maxLen * 6.5));
  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 96, left: 4, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            interval={0}
            tick={({ x, y, payload }) => {
              const full = String(payload.value ?? "");
              const lines = wrapAxisLabel(full, 22, 2);
              return (
                <g transform={`translate(${x},${y})`}>
                  <title>{full}</title>
                  {lines.map((line, index) => (
                    <text
                      key={`${line}-${index}`}
                      x={-6}
                      y={(index - (lines.length - 1) / 2) * 13}
                      dy={4}
                      textAnchor="end"
                      fill="hsl(var(--foreground))"
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
          <Bar
            dataKey="valor"
            fill={barNeon ? "#f97316" : "#3b82f6"}
            radius={[0, 6, 6, 0]}
            barSize={18}
            className={barNeon ? "drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : undefined}
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
  );
};


/* ---------------- Page ---------------- */

export const VendasTab = ({ sector, periodo }: VendasTabProps) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isYtd = periodo === "ytd";
  const selectedMonth = isYtd ? currentMonth : Number(periodo.replace("mes-", ""));
  const kpis = useKpisVendas(sector, selectedMonth);
  const kpisPorSetor = useKpisPorSetor(selectedMonth);
  const pipeline = usePipelinePonderado(sector);
  const clientes = useTopClientesPeriodo(sector, 15, selectedMonth);
  const gestores = useVendasGestorPeriodo(sector, selectedMonth);
  const refs2025 = useReferenciasVendasAno2025(sector, selectedMonth);

  /* Soma das Propostas Colocadas (universo completo — sem whitelist).
   * Este é o NOVO indicador primário do dashboard. */

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
    gestores.data?.ytd.map((g) => ({
      label: g.gestor_nome,
      valor: g.valor_ytd,
      detalhes: g.detalhes_vendas_ytd,
    })) ?? [];
  const gestoresMtdData: ValuePoint[] =
    gestores.data?.mtd.map((g) => ({
      label: g.gestor_nome,
      valor: g.valor_mtd,
      detalhes: g.detalhes_vendas_mtd,
    })) ?? [];

  const sectorLabel = SECTOR_LABEL[sector];
  const selectedPeriodLabel = isYtd
    ? "YTD (Acumulado)"
    : `${MONTH_NAMES[Math.max(0, selectedMonth - 1)]} ${currentYear}`;
  const isCurrentMonthBreakdown = selectedMonth === currentMonth;
  const metasYtd = useMemo((): Record<Sector, number> => {
    const acc: Record<Sector, number> = {
      avantia: 0,
      publico: 0,
      privado: 0,
      audio_video: 0,
    };
    for (let m = 1; m <= selectedMonth; m++) {
      const row = METAS_MENSAIS_POR_MES[m];
      if (!row) continue;
      for (const s of SECTORS) {
        acc[s] += row[s];
      }
    }
    return acc;
  }, [selectedMonth]);

  const metasMensaisSelecionadas = METAS_MENSAIS_POR_MES[selectedMonth] ?? METAS_MENSAIS;

  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-blue-950/50 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Vendas</h2>
          <p className="text-xs text-slate-400">
            {sectorLabel} · {selectedPeriodLabel}
          </p>
        </div>
      </div>

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
        subtitle={`${selectedPeriodLabel} · ${sectorLabel}`}
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

      {/* Bloco 5 - Metas Anuais (renomeado) */}
      <MetasBanner
        title="Metas Anuais"
        subtitle="Valor atingido por setor (acumulado YTD)"
        metas={METAS_ANUAIS}
        atingidos={atingidosYtd}
        isLoading={kpisPorSetor.isLoading}
      />

      {/* NOVO - Meta YTD (esperado acumulado até o momento) */}
      <MetasBanner
        title="Meta YTD"
        subtitle="Desempenho esperado acumulado até o momento (proporcional aos meses transcorridos)"
        metas={metasYtd}
        atingidos={atingidosYtd}
        isLoading={kpisPorSetor.isLoading}
      />

      {/* Bloco 6 - Metas Mensal */}
      <MetasBanner
        title="Metas Mensais (MTD)"
        subtitle={`Atingimento de ${selectedPeriodLabel} por setor`}
        metas={metasMensaisSelecionadas}
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
            detailsViaIcon
          />
        </ReportCard>
      </div>

      {/* Blocos 9 + 10 - MTD charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard title="Top 15 Clientes (MTD)" subtitle={`${selectedPeriodLabel} · ${sectorLabel}`}>
          <ValueBarChart
            data={isCurrentMonthBreakdown ? clientesMtdData : []}
            isLoading={clientes.isLoading}
            emptyLabel={
              isCurrentMonthBreakdown
                ? "Sem vendas no mês"
                : "Detalhamento por cliente disponível apenas para o mês corrente"
            }
          />
        </ReportCard>
        <ReportCard title="Vendas por Gerente (MTD)" subtitle={`${selectedPeriodLabel} · ${sectorLabel}`}>
          <ValueBarChart
            data={isCurrentMonthBreakdown ? gestoresMtdData : []}
            isLoading={gestores.isLoading}
            emptyLabel={
              isCurrentMonthBreakdown
                ? "Sem vendas no mês"
                : "Detalhamento por gerente disponível apenas para o mês corrente"
            }
            detailsViaIcon
          />
        </ReportCard>
      </div>
    </>
  );
};
