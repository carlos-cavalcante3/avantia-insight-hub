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

/** Metas reais inline por setor (anual e mensal MTD). */
const METAS = {
  publico: { anual: 10_000_000, mtd: 800_000 },
  privado: { anual: 5_000_000, mtd: 400_000 },
  av: { anual: 3_000_000, mtd: 250_000 },
} as const;

type SectorMetaKey = keyof typeof METAS;
const SECTOR_META_LABEL: Record<SectorMetaKey, string> = {
  publico: "Público",
  privado: "Privado",
  av: "Áudio e Vídeo",
};

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

const ProgressBar = ({ pct, label }: { pct: number; label: string }) => {
  const clamped = Math.min(Math.max(pct, 0), 1);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-slate-300">{formatPercent(clamped * 100)}</span>
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full transition-all duration-700"
          style={{ width: `${(clamped * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
};

const SECTOR_DISPLAY: { key: Sector; label: string }[] = [
  { key: "avantia", label: "Avantia (Geral)" },
  { key: "publico", label: "Público" },
  { key: "privado", label: "Privado" },
  { key: "audio_video", label: "Áudio e Vídeo" },
];

const BareBar = ({ pct, label }: { pct: number; label: string }) => {
  const clamped = Math.min(Math.max(pct, 0), 1);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-slate-200">{formatPercent(clamped * 100)}</span>
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full transition-all duration-700"
          style={{ width: `${(clamped * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
};

const MetaCard = ({
  label,
  valor,
  metaAnual,
  metaPeriodo,
  metaPeriodoLabel,
  bars,
  compareSlot,
}: {
  label: string;
  valor: number;
  metaAnual: number;
  metaPeriodo: number;
  metaPeriodoLabel: string;
  bars: { pct: number; label: string }[];
  compareSlot?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3">
    <div className="rounded-lg border border-slate-800/60 bg-slate-900 p-4 min-h-[110px] flex flex-col justify-between shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-[10px] font-bold text-blue-400 whitespace-nowrap">
          META ANUAL <span className="text-slate-100 ml-1 tabular-nums">{formatBRL(metaAnual)}</span>
        </p>
      </div>
      <h3 className="text-3xl font-black text-slate-50 tabular-nums my-1">{formatBRL(valor)}</h3>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[11px] text-slate-400 min-h-[14px] truncate">{compareSlot}</div>
        <p className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
          {metaPeriodoLabel}: <span className="text-slate-200 tabular-nums">{formatBRL(metaPeriodo)}</span>
        </p>
      </div>
    </div>
    <div className="flex flex-col gap-2 px-1">
      {bars.map((b) => (
        <BareBar key={b.label} pct={b.pct} label={b.label} />
      ))}
    </div>
  </div>
);


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
  const detalhes = (point.detalhes?.filter((d) => Number(d.valor) > 0) ?? [])
    .slice()
    .sort((a, b) => Number(b.valor) - Number(a.valor));
  return (
    <div className="w-72 bg-slate-900 border border-slate-700 p-3 rounded-md shadow-2xl">
      <div className="border-b border-slate-800 pb-2 mb-2">
        <p className="text-sm font-bold text-slate-100 truncate" title={point.label}>
          {point.label}
        </p>
        <p className="text-xs text-slate-400">Total: {formatBRL(Number(point.valor ?? 0))}</p>
      </div>
      <ScrollArea className="h-64 pr-2">
        <div>
          {detalhes.length ? (
            detalhes.map((item, index) => (
              <div
                key={`${item.nome}-${index}`}
                className="flex justify-between items-center py-1 gap-4"
              >
                <span
                  className="text-xs font-medium text-slate-200 truncate max-w-[180px]"
                  title={item.cliente || item.nome}
                >
                  {item.cliente || item.nome || "Cliente não informado"}
                </span>
                <span className="text-xs font-bold text-blue-400 tabular-nums shrink-0">
                  {formatBRL(Number(item.valor ?? 0))}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">Sem contratos detalhados para este total.</p>
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
        className="p-0 border-0 bg-transparent shadow-none"
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
          <div className="flex-1 min-w-[60px] h-[18px]">
            <div
              className="h-full rounded-r-md bg-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-all"
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
  // pipeline ponderado removido desta aba — agora exclusivo da aba Pipeline
  const clientes = useTopClientesPeriodo(sector, 15, selectedMonth);
  const gestores = useVendasGestorPeriodo(sector, selectedMonth);
  const refs2025 = useReferenciasVendasAno2025(sector, selectedMonth);
  const composicao = useVendasComposicaoMesAMes(sector, selectedMonth);
  const composicaoPublico = useVendasComposicaoMesAMes("publico", selectedMonth);
  const composicaoPrivado = useVendasComposicaoMesAMes("privado", selectedMonth);
  const composicaoAV = useVendasComposicaoMesAMes("audio_video", selectedMonth);


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

  const ytdQtd = ytdItems[1];
  const ytdTicket = ytdItems[2];
  const ytdTaxa = ytdItems[3];

  const composicaoData = (composicao.data ?? []).map((d) => ({
    ...d,
    receita_total: d.unica + d.recorrente,
  }));

  // Composição por SETOR: combina os 3 setores num único array (Público / Privado / Áudio e Vídeo).
  const composicaoSetorData = useMemo(() => {
    const pub = composicaoPublico.data ?? [];
    const pri = composicaoPrivado.data ?? [];
    const av = composicaoAV.data ?? [];
    const len = Math.max(pub.length, pri.length, av.length);
    const out: Array<{ label: string; publico: number; privado: number; audio_video: number }> = [];
    for (let i = 0; i < len; i++) {
      out.push({
        label: pub[i]?.label ?? pri[i]?.label ?? av[i]?.label ?? "",
        publico: (pub[i]?.unica ?? 0) + (pub[i]?.recorrente ?? 0),
        privado: (pri[i]?.unica ?? 0) + (pri[i]?.recorrente ?? 0),
        audio_video: (av[i]?.unica ?? 0) + (av[i]?.recorrente ?? 0),
      });
    }
    return out;
  }, [composicaoPublico.data, composicaoPrivado.data, composicaoAV.data]);

  const renderCompare2025 = (cur: number, prev: number | null | undefined, kind: "brl" | "number") => {
    if (prev == null) return null;
    const delta = prev > 0 ? ((cur / prev) - 1) * 100 : cur > 0 ? 100 : 0;
    const pos = delta >= 0;
    const prevTxt = kind === "brl" ? formatBRL(prev) : formatNumber(Math.round(prev));
    return (
      <p className="mt-1 text-xs text-slate-400">
        2025: <span className="text-slate-200 tabular-nums">{prevTxt}</span>{" "}
        <span className={`inline-flex items-center gap-0.5 font-semibold ${pos ? "text-emerald-400" : "text-red-400"}`}>
          {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {formatPercent(Math.abs(delta))} vs 2025
        </span>
      </p>
    );
  };

  return (
    <>
      {/* Bloco 1 - YTD: 4 setores incluindo Avantia (Geral) */}
      <ReportCard
        title="Vendas do Ano (YTD)"
        subtitle={`Acumulado ${currentYear} · ${sectorLabel}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {SECTOR_DISPLAY.map(({ key, label }) => {
            const valor = kpisPorSetor.data?.[key].valor_ytd ?? 0;
            const metaAnual = METAS_ANUAIS[key];
            const metaYtd = metasYtd[key] ?? 0;
            let compareSlot: React.ReactNode = null;
            if (key === "avantia" && refs2025.data) {
              const prev = refs2025.data.receitaYtd2025;
              const delta = prev > 0 ? ((valor / prev) - 1) * 100 : valor > 0 ? 100 : 0;
              const pos = delta >= 0;
              compareSlot = (
                <span className="inline-flex items-center gap-1">
                  2025: <span className="text-slate-200 tabular-nums">{formatBRL(prev)}</span>
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${pos ? "text-emerald-400" : "text-red-400"}`}>
                    {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {formatPercent(Math.abs(delta))}
                  </span>
                </span>
              );
            }
            return (
              <MetaCard
                key={`ytd-${key}`}
                label={label}
                valor={valor}
                metaAnual={metaAnual}
                metaPeriodo={metaYtd}
                metaPeriodoLabel="Meta YTD"
                bars={[
                  { pct: metaAnual > 0 ? valor / metaAnual : 0, label: "vs Meta Anual" },
                  { pct: metaYtd > 0 ? valor / metaYtd : 0, label: "vs Meta YTD" },
                ]}
                compareSlot={compareSlot}
              />
            );
          })}
        </div>
      </ReportCard>

      {/* Bloco 2 - MTD: 4 setores incluindo Avantia (Geral) */}
      <ReportCard
        title="Vendas do Mês (MTD)"
        subtitle={`${selectedPeriodLabel} · ${sectorLabel}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {SECTOR_DISPLAY.map(({ key, label }) => {
            const valor = kpisPorSetor.data?.[key].valor_mtd ?? 0;
            const metaMensal = metasMensaisSelecionadas[key] ?? 0;
            return (
              <MetaCard
                key={`mtd-${key}`}
                label={label}
                valor={valor}
                metaAnual={METAS_ANUAIS[key]}
                metaPeriodo={metaMensal}
                metaPeriodoLabel="Meta Mensal"
                bars={[
                  { pct: metaMensal > 0 ? valor / metaMensal : 0, label: "vs Meta Mensal" },
                ]}
              />
            );
          })}
        </div>
      </ReportCard>

      {/* Nova linha - Qtd Negócios, Ticket Médio, Taxa de Conversão (YTD) */}
      <ReportCard title="Indicadores YTD" subtitle={`Qtd · Ticket · Conversão · ${sectorLabel}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={kpiTileClass}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{ytdQtd.label}</p>
              <ListChecks className="h-4 w-4 text-blue-500" />
            </div>
            {kpis.isLoading ? (
              <Skeleton className="h-7 w-24 mt-2" />
            ) : (
              <>
                <p className="mt-1 text-xl lg:text-2xl font-bold text-foreground tabular-nums tracking-tight">{ytdQtd.value}</p>
                {!refs2025.isLoading && renderCompare2025(kpis.data?.qtd_ytd ?? 0, refs2025.data?.qtdYtd2025, "number")}
              </>
            )}
          </div>
          <div className={kpiTileClass}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{ytdTicket.label}</p>
              <Receipt className="h-4 w-4 text-blue-500" />
            </div>
            {kpis.isLoading ? (
              <Skeleton className="h-7 w-24 mt-2" />
            ) : (
              <>
                <p className="mt-1 text-xl lg:text-2xl font-bold text-foreground tabular-nums tracking-tight">{ytdTicket.value}</p>
                {!refs2025.isLoading && renderCompare2025(kpis.data?.ticket_ytd ?? 0, refs2025.data?.ticketYtd2025, "brl")}
              </>
            )}
          </div>
          <div className={kpiTileClass}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{ytdTaxa.label}</p>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            {kpis.isLoading ? (
              <Skeleton className="h-7 w-24 mt-2" />
            ) : (
              <>
                <p className="mt-1 text-xl lg:text-2xl font-bold text-foreground tabular-nums tracking-tight">{ytdTaxa.value}</p>
                <div className="mt-1 flex flex-col text-xs text-muted-foreground tabular-nums">
                  <span>Propostas Enviadas: <strong className="text-slate-200">{formatNumber(kpis.data?.oport_ytd ?? 0)}</strong></span>
                  <span>Vendas: <strong className="text-slate-200">{formatNumber(kpis.data?.qtd_ytd ?? 0)}</strong></span>
                </div>
              </>
            )}
          </div>
        </div>
      </ReportCard>

      {/* Composição de Vendas Mês a Mês */}
      <ReportCard
        title="Composição de Vendas Mês a Mês"
        subtitle={`Valor único × recorrente · ${sectorLabel}`}
      >
        {composicao.isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={composicaoData} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v: number) => formatBRL(Number(v))}
                width={56}
              />
              <RTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [formatBRL(Number(value)), name]}
              />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="unica" name="Valor Único" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} maxBarSize={40} />
              <Bar dataKey="recorrente" name="Recorrente" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40}>
                <LabelList
                  dataKey="receita_total"
                  position="top"
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                  formatter={(v: number) => formatBRL(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ReportCard>

      {/* Composição de Vendas por Setor */}
      <ReportCard
        title="Composição de Vendas por Setor"
        subtitle="Receita total mês a mês — Público × Privado × Áudio e Vídeo"
      >
        {composicaoPublico.isLoading || composicaoPrivado.isLoading || composicaoAV.isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={composicaoSetorData} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v: number) => formatBRL(Number(v))}
                width={56}
              />
              <RTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [formatBRL(Number(value)), name]}
              />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="publico" name="Público" stackId="setor" fill="#3b82f6" maxBarSize={40} />
              <Bar dataKey="privado" name="Privado" stackId="setor" fill="#f97316" maxBarSize={40} />
              <Bar dataKey="audio_video" name="Áudio e Vídeo" stackId="setor" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ReportCard>








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
            data={clientesMtdData}
            isLoading={clientes.isLoading}
            emptyLabel="Sem vendas no período"
          />
        </ReportCard>
        <ReportCard title="Vendas por Gerente (MTD)" subtitle={`${selectedPeriodLabel} · ${sectorLabel}`}>
          <ValueBarChart
            data={gestoresMtdData}
            isLoading={gestores.isLoading}
            emptyLabel="Sem vendas no período"
            detailsViaIcon
            barNeon
          />
        </ReportCard>
      </div>
    </>
  );
};
