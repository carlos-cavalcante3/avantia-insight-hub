import { Info } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatNumber } from "@/lib/format";
import type { FunilEtapa } from "@/hooks/useDashboardData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ETAPAS_FIXAS = [
  { nome: "Validação", cor: "#2563eb" },
  { nome: "Pré-Vendas", cor: "#ea580c" },
  { nome: "Proposta", cor: "#0891b2" },
  { nome: "Análise", cor: "#4f46e5" },
  { nome: "On-Hold", cor: "#059669" },
  { nome: "Negociação", cor: "#06b6d4" },
  { nome: "Pedido", cor: "#7c3aed" },
] as const;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const formatCurrency = (value: number) => formatBRL(value);

const ON_HOLD_PRIVADO_TOOLTIP =
  "Oportunidades retidas no On-Hold Privado possuem alto risco de cancelamento. O montante é exibido para auditoria operacional, mas é ignorado no totalizador financeiro superior e nas previsões globais de faturamento.";

interface Props {
  data?: FunilEtapa[];
  isLoading: boolean;
  error: Error | null;
  title?: string;
  subtitle?: string;
  heightClassName?: string;
  headerValueMillions?: number;
  /** Destaque de compliance: On-Hold no funil Privado. */
  compliancePrivadoOnHold?: boolean;
}

export const PipelineFaseChart = ({
  data,
  isLoading,
  error,
  title = "Pipeline",
  subtitle,
  heightClassName = "min-h-[500px] h-[500px]",
  headerValueMillions = 0,
  compliancePrivadoOnHold = false,
}: Props) => {
  const dadosPipeline = data ?? [];
  const totalNegociosFunil = dadosPipeline.reduce(
    (s, d) => s + Number(d.quantidade ?? 0),
    0
  );
  const etapas = ETAPAS_FIXAS.map((etapa) => {
    const existente = dadosPipeline.find((item) =>
      normalize(String(item.fase ?? "")).includes(normalize(etapa.nome))
    );
    const valorExibicao = Number(
      existente?.valor_total ?? existente?.valor_exibicao ?? existente?.valor ?? 0
    );
    return {
      nome: etapa.nome,
      cor: etapa.cor,
      valor_total: valorExibicao,
      total_negocios: Number(existente?.quantidade ?? 0),
    };
  });
  return (
    <ReportCard
      id="pipeline-fase"
      title={title}
      subtitle={
        subtitle ??
        (isLoading
          ? "Carregando pipeline…"
          : `${formatNumber(totalNegociosFunil)} negócios em aberto (posição atual) · pipelines consolidados`)
      }
      action={
        !isLoading ? (
          <span className="text-blue-600 font-bold text-lg tabular-nums">
            {Math.round(headerValueMillions)}M
          </span>
        ) : undefined
      }
    >
      <div className={heightClassName}>
        {isLoading ? (
          <div className="h-full flex items-end gap-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${30 + i * 12}%` }} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} />
        ) : (
          <TooltipProvider delayDuration={200}>
            <div
              className="min-h-[500px] flex flex-col w-full max-w-md shadow-lg rounded-sm"
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 75% 100%, 25% 100%)",
              }}
            >
              {etapas.map((etapa) => {
                const isPrivadoOnHold =
                  compliancePrivadoOnHold && normalize(etapa.nome).includes("on-hold");
                const bg = isPrivadoOnHold ? "#ef4444" : etapa.cor;
                return (
                <div
                    key={etapa.nome}
                    className="flex-1 flex flex-col flex-wrap justify-center items-center w-full px-2 py-2"
                    style={{ backgroundColor: bg, minHeight: "72px" }}
                  >
                    <span className="text-base md:text-lg font-bold text-white w-full text-center leading-tight break-words">
                      {formatCurrency(etapa.valor_total || 0)}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 w-full text-xs text-white/95 leading-tight text-center">
                      <span className="whitespace-normal break-words">
                        {etapa.total_negocios || 0} negócios · {etapa.nome}
                      </span>
                      {isPrivadoOnHold && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex shrink-0 rounded-sm opacity-95 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 transition-opacity"
                              aria-label="Informação sobre On-Hold Privado"
                            >
                              <Info className="h-3.5 w-3.5 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            avoidCollisions
                            collisionPadding={{ left: 10, right: 10 }}
                            className="bg-slate-900 text-white border-slate-900 max-w-[280px] text-xs leading-snug"
                          >
                            {ON_HOLD_PRIVADO_TOOLTIP}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </div>
    </ReportCard>
  );
};
