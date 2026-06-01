import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard } from "./ReportCard";
import { formatBRL, formatNumber } from "@/lib/format";
import type { FunilEtapa, UltimaMovEmpresa } from "@/hooks/useDashboardData";
import {
  extractNegociosValidos,
  negocioFunilCliente,
  negocioFunilDisplayName,
  negocioFunilGerente,
  negocioFunilValor,
  type NegocioFunilRaw,
  type SelectedFunnelStage,
} from "@/lib/funnelNegocios";

export const ETAPAS_FUNIL = [
  { nome: "Qualificação", cor: "#3b82f6", peso: 0.15 },
  { nome: "Validação", cor: "#2563eb", peso: 0.25 },
  { nome: "Pré-Vendas", cor: "#ea580c", peso: 0.35 },
  { nome: "Proposta", cor: "#0891b2", peso: 0.5 },
  { nome: "Análise", cor: "#4f46e5", peso: 0.6 },
  { nome: "On-Hold", cor: "#059669", peso: 0.2 },
  { nome: "Negociação", cor: "#06b6d4", peso: 0.8 },
  { nome: "Pedido", cor: "#F1842A", peso: 0.95 },
] as const;

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const FUNNEL_WIDTHS_PCT = [100, 92, 84, 76, 68, 60, 52, 44];

const PAGE = 10;

const StageDrilldown = ({
  negocios,
  stageName,
  onClose,
}: {
  negocios: NegocioFunilRaw[];
  stageName: string;
  onClose: () => void;
}) => {
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () => [...negocios].sort((a, b) => negocioFunilValor(b) - negocioFunilValor(a)),
    [negocios]
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const slice = sorted.slice(page * PAGE, (page + 1) * PAGE);

  return (
    <div className="mt-4 rounded-lg border border-slate-800/60 bg-slate-900/90 p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            Negócios na etapa: <span className="text-orange-500">{stageName}</span>
          </p>
          <p className="text-[11px] text-slate-400">
            {total} {total === 1 ? "negócio" : "negócios"} · ordenado pelo maior valor
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="border-slate-700">
          Fechar
        </Button>
      </div>
      {total === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Sem negócios listáveis nesta etapa para o setor selecionado.
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {slice.map((n, i) => (
              <div
                key={`${n.id}-${i}`}
                className="rounded-md border border-slate-800/60 bg-slate-950/60 p-3"
              >
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  {negocioFunilDisplayName(n)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{negocioFunilCliente(n)}</p>
                <p className="text-xs text-slate-300 mt-1">{negocioFunilGerente(n)}</p>
                <p className="text-sm font-bold text-blue-400 mt-1 tabular-nums">
                  {formatBRL(negocioFunilValor(n))}
                </p>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
              <p className="text-[11px] text-slate-400">
                Página <span className="font-semibold text-slate-200">{page + 1}</span> de{" "}
                {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const stagePath = (
  cx: number,
  y: number,
  h: number,
  wTop: number,
  wBottom: number
): string => {
  const tl = cx - wTop / 2;
  const tr = cx + wTop / 2;
  const bl = cx - wBottom / 2;
  const br = cx + wBottom / 2;
  const yb = y + h;
  const curve = Math.min(wTop, wBottom) * 0.12;
  return [
    `M ${tl} ${y}`,
    `L ${tr} ${y}`,
    `C ${tr + curve} ${y + h * 0.45} ${br + curve} ${y + h * 0.55} ${br} ${yb}`,
    `L ${bl} ${yb}`,
    `C ${bl - curve} ${y + h * 0.55} ${tl - curve} ${y + h * 0.45} ${tl} ${y}`,
    "Z",
  ].join(" ");
};

interface SmoothFunnelProps {
  etapas: Array<{ nome: string; cor: string; valor: number; qtd: number }>;
  activeStage: string | null;
  onStageClick: (nome: string) => void;
}

const SmoothFunnelSvg = ({ etapas, activeStage, onStageClick }: SmoothFunnelProps) => {
  const SVG_W = 520;
  const STAGE_H = 58;
  const PAD_TOP = 12;
  const cx = SVG_W / 2;
  const maxWidth = SVG_W * 0.88;
  const widths = etapas.map((_, i) => (FUNNEL_WIDTHS_PCT[i] ?? 40) * (maxWidth / 100));
  const totalH = PAD_TOP + etapas.length * STAGE_H + 8;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${totalH}`}
      className="w-full max-w-xl mx-auto drop-shadow-lg"
      role="img"
      aria-label="Funil de vendas"
    >
      <defs>
        {etapas.map((e) => (
          <linearGradient
            key={`grad-${e.nome}`}
            id={`funnel-grad-${e.nome}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={e.cor} stopOpacity={0.95} />
            <stop offset="100%" stopColor={e.cor} stopOpacity={0.72} />
          </linearGradient>
        ))}
      </defs>
      {etapas.map((etapa, i) => {
        const y = PAD_TOP + i * STAGE_H;
        const wTop = widths[i];
        const wBottom = i < etapas.length - 1 ? widths[i + 1] : widths[i] * 0.92;
        const isActive = activeStage === etapa.nome;
        return (
          <g
            key={etapa.nome}
            className="cursor-pointer transition-opacity"
            opacity={activeStage && !isActive ? 0.55 : 1}
            onClick={() => onStageClick(etapa.nome)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onStageClick(etapa.nome);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
          >
            <path
              d={stagePath(cx, y, STAGE_H - 4, wTop, wBottom)}
              fill={`url(#funnel-grad-${etapa.nome})`}
              stroke={isActive ? "#f97316" : "rgba(255,255,255,0.15)"}
              strokeWidth={isActive ? 2.5 : 1}
              className="transition-all duration-200 hover:brightness-110"
            />
            <text
              x={cx}
              y={y + STAGE_H / 2 - 6}
              textAnchor="middle"
              fill="#fff"
              fontSize={15}
              fontWeight={700}
            >
              {formatBRL(etapa.valor)}
            </text>
            <text
              x={cx}
              y={y + STAGE_H / 2 + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.92)"
              fontSize={11}
              fontWeight={500}
            >
              {etapa.qtd} negócios · {etapa.nome}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface UnifiedFunnelProps {
  title: string;
  subtitle?: string;
  data?: FunilEtapa[];
  isLoading: boolean;
  clientes?: UltimaMovEmpresa[];
}

export const UnifiedFunnel = ({
  title,
  subtitle,
  data,
  isLoading,
}: UnifiedFunnelProps) => {
  const [selectedStage, setSelectedStage] = useState<SelectedFunnelStage | null>(null);

  const etapas = useMemo(() => {
    const src = data ?? [];
    return ETAPAS_FUNIL.map((etapa) => {
      const found = src.find((row) =>
        normalize(String(row.fase ?? "")).includes(normalize(etapa.nome))
      );
      return {
        ...etapa,
        valor: Number(found?.valor_total ?? 0),
        qtd: Number(found?.quantidade ?? 0),
        funilRow: found,
      };
    });
  }, [data]);

  const totalNegocios = etapas.reduce((s, e) => s + e.qtd, 0);

  const negociosValidos = useMemo(
    () => extractNegociosValidos(selectedStage),
    [selectedStage]
  );

  const handleStageClick = (nome: string) => {
    if (selectedStage?.nome === nome) {
      setSelectedStage(null);
      return;
    }
    const match = etapas.find((e) => e.nome === nome);
    const funilRow = match?.funilRow;
    setSelectedStage({
      nome,
      negocios_detalhados: funilRow?.negocios_detalhados,
      payload: funilRow
        ? { negocios_detalhados: funilRow.negocios_detalhados }
        : undefined,
    });
  };

  return (
    <ReportCard
      title={title}
      subtitle={
        subtitle ??
        (isLoading
          ? "Carregando funil…"
          : `${formatNumber(totalNegocios)} negócios em aberto · clique em uma etapa para detalhar`)
      }
    >
      {isLoading ? (
        <Skeleton className="h-[560px] w-full bg-slate-800" />
      ) : (
        <div className="w-full overflow-x-hidden">
          <div
            className={`flex w-full transition-all duration-300 ${
              selectedStage ? "items-start justify-between gap-8" : "flex-col items-center"
            }`}
          >
            <div className={selectedStage ? "w-5/12 min-w-[240px]" : "w-full"}>
              <SmoothFunnelSvg
                etapas={etapas}
                activeStage={selectedStage?.nome ?? null}
                onStageClick={handleStageClick}
              />
            </div>

            {selectedStage && (
              <div className="w-7/12 min-w-0 flex-1">
                <StageDrilldown
                  negocios={negociosValidos}
                  stageName={selectedStage.nome}
                  onClose={() => setSelectedStage(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </ReportCard>
  );
};
