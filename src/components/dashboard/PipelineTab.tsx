import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { UnifiedFunnel, ETAPAS_FUNIL } from "./UnifiedFunnel";
import { PipelineClientesUltimaMov } from "./PipelineClientesUltimaMov";
import { PonderadoTooltipContent } from "./PonderadoTooltipContent";
import {
  usePipelinePonderado,
  type Sector,
  SECTOR_LABEL,
} from "@/hooks/useVendasData";
import {
  usePipelineFunil,
  usePipelineClientesUltimaMov,
  type PipelineScope,
} from "@/hooks/useDashboardData";

const sectorToScope = (s: Sector): PipelineScope => {
  if (s === "publico") return "setor_publico";
  if (s === "privado") return "setor_privado";
  return "avantia";
};

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
      <div className="absolute top-5 right-5">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Informação"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <Info className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              className="bg-popover text-popover-foreground p-3 text-xs shadow-xl border border-border max-w-[280px]"
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
        <span className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
          {value}
        </span>
      )}
      {qtd != null && !isLoading && (
        <p className="text-xs text-muted-foreground mt-1">{qtd} negócios em aberto</p>
      )}
    </div>
  </Card>
);

interface PipelineTabProps {
  sector: Sector;
}

export const PipelineTab = ({ sector }: PipelineTabProps) => {
  const scope = sectorToScope(sector);
  const pipelineFilter = sector === "audio_video" ? "Áudio e Vídeo" : undefined;
  const pipelineCards = usePipelinePonderado(sector);
  const funil = usePipelineFunil(scope, pipelineFilter);
  const clientes = usePipelineClientesUltimaMov(5000, scope);

  /* Pipeline Ponderado RECALCULADO no front com os pesos da nova lista de etapas
   * (inclui Qualificação com peso 15%). Mantém o valor da view como fallback. */
  const ponderadoCalc = useMemo(() => {
    const etapas = funil.data?.etapas ?? [];
    if (!etapas.length) return null;
    const normalize = (v: string) =>
      v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    let total = 0;
    for (const cfg of ETAPAS_FUNIL) {
      const match = etapas.find((e) =>
        normalize(String(e.fase ?? "")).includes(normalize(cfg.nome))
      );
      total += Number(match?.valor_total ?? 0) * cfg.peso;
    }
    return total;
  }, [funil.data]);

  const sectorLabel = SECTOR_LABEL[sector];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BigValueCard
          title="Valor Total do Pipeline"
          subtitle={`Negócios em aberto · ${sectorLabel}`}
          value={pipelineCards.data ? formatBRL(pipelineCards.data.valor_pipeline_bruto) : "—"}
          qtd={pipelineCards.data?.qtd_aberto}
          isLoading={pipelineCards.isLoading}
        />
        <BigValueCard
          title="Pipeline Ponderado"
          subtitle={`Valor × probabilidade (inclui Qualificação 15%) · ${sectorLabel}`}
          value={
            ponderadoCalc != null
              ? formatBRL(ponderadoCalc)
              : pipelineCards.data
              ? formatBRL(pipelineCards.data.valor_pipeline_ponderado)
              : "—"
          }
          isLoading={pipelineCards.isLoading || funil.isLoading}
          infoTooltip="ponderado"
        />
      </div>

      {/* FUNIL ÚNICO E ESTILIZADO — muda dinamicamente conforme setor do header */}
      <UnifiedFunnel
        title={`Funil de Vendas · ${sectorLabel}`}
        subtitle="Distribuição financeira por etapa do pipeline"
        data={funil.data?.etapas}
        isLoading={funil.isLoading}
        clientes={clientes.data}
      />

      <PipelineClientesUltimaMov
        title={`Pipeline por Cliente · ${sectorLabel}`}
        sectorLabel={sectorLabel}
        data={clientes.data}
        isLoading={clientes.isLoading}
        error={clientes.error as Error | null}
      />
    </>
  );
};
