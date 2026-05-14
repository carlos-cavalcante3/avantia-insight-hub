import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineFaseChart } from "./PipelineFaseChart";
import { PipelineClientesUltimaMov } from "./PipelineClientesUltimaMov";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { usePipelinePonderado, type Sector } from "@/hooks/useVendasData";
import {
  usePipelineFunil,
  usePipelineClientesUltimaMov,
  type PipelineScope,
} from "@/hooks/useDashboardData";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PonderadoTooltipContent } from "./PonderadoTooltipContent";

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

const scopeToVendasSector = (scope: PipelineScope): Sector => {
  if (scope === "setor_privado") return "privado";
  if (scope === "setor_publico") return "publico";
  return "avantia";
};

export const PipelineTab = () => {
  const scopeAvantia: PipelineScope = "avantia";
  const scopePrivado: PipelineScope = "setor_privado";
  const scopePublicoEletrico: PipelineScope = "setor_publico";
  const scopeAudioVideo: PipelineScope = "avantia";

  const pipelineCards = usePipelinePonderado(scopeToVendasSector(scopeAvantia));

  const funilAvantia = usePipelineFunil(scopeAvantia);
  const funilPrivado = usePipelineFunil(scopePrivado);
  const funilPublicoEletrico = usePipelineFunil(scopePublicoEletrico);
  const funilAudioVideo = usePipelineFunil(scopeAudioVideo, "Áudio e Vídeo");

  const clientesAvantia = usePipelineClientesUltimaMov(5000, scopeAvantia);
  const clientesPrivado = usePipelineClientesUltimaMov(5000, scopePrivado);
  const clientesPublicoEletrico = usePipelineClientesUltimaMov(5000, scopePublicoEletrico);
  const clientesAudioVideo = usePipelineClientesUltimaMov(5000, scopeAudioVideo);
  const totalFunilAvantiaM = funilAvantia.data?.headerMillions ?? 0;
  const totalFunilPrivadoM = funilPrivado.data?.headerMillions ?? 0;
  const totalFunilPublicoM = funilPublicoEletrico.data?.headerMillions ?? 0;
  const totalFunilAudioVideoM = funilAudioVideo.data?.headerMillions ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BigValueCard
          title="Valor Total do Pipeline"
          subtitle="Negócios em aberto · Avantia (Geral)"
          value={pipelineCards.data ? formatBRL(pipelineCards.data.valor_pipeline_bruto) : "—"}
          qtd={pipelineCards.data?.qtd_aberto}
          isLoading={pipelineCards.isLoading}
        />
        <BigValueCard
          title="Pipeline Ponderado"
          subtitle="Valor × probabilidade · Avantia (Geral)"
          value={pipelineCards.data ? formatBRL(pipelineCards.data.valor_pipeline_ponderado) : "—"}
          isLoading={pipelineCards.isLoading}
          infoTooltip="ponderado"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
        <PipelineFaseChart
          title="Avantia (Geral)"
          subtitle="Funil consolidado por etapa"
          data={funilAvantia.data?.etapas}
          isLoading={funilAvantia.isLoading}
          error={funilAvantia.error as Error | null}
          heightClassName="min-h-[600px] flex flex-col"
          headerValueMillions={totalFunilAvantiaM}
        />
        <PipelineFaseChart
          title="Privado"
          subtitle="Funil consolidado por etapa"
          data={funilPrivado.data?.etapas}
          isLoading={funilPrivado.isLoading}
          error={funilPrivado.error as Error | null}
          heightClassName="min-h-[600px] flex flex-col"
          headerValueMillions={totalFunilPrivadoM}
          compliancePrivadoOnHold
        />
        <PipelineFaseChart
          title="Público/Elétrico"
          subtitle="Funil consolidado por etapa"
          data={funilPublicoEletrico.data?.etapas}
          isLoading={funilPublicoEletrico.isLoading}
          error={funilPublicoEletrico.error as Error | null}
          heightClassName="min-h-[600px] flex flex-col"
          headerValueMillions={totalFunilPublicoM}
        />
        <PipelineFaseChart
          title="Áudio e Vídeo"
          subtitle="Funil consolidado por etapa"
          data={funilAudioVideo.data?.etapas}
          isLoading={funilAudioVideo.isLoading}
          error={funilAudioVideo.error as Error | null}
          heightClassName="min-h-[600px] flex flex-col"
          headerValueMillions={totalFunilAudioVideoM}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PipelineClientesUltimaMov
          title="Pipeline por Cliente · Avantia (Geral)"
          sectorLabel="Avantia (Geral)"
          setorSelecionado=""
          data={clientesAvantia.data}
          isLoading={clientesAvantia.isLoading}
          error={clientesAvantia.error as Error | null}
        />
        <PipelineClientesUltimaMov
          title="Pipeline por Cliente · Privado"
          sectorLabel="Privado"
          setorSelecionado="privado"
          data={clientesPrivado.data}
          isLoading={clientesPrivado.isLoading}
          error={clientesPrivado.error as Error | null}
        />
        <PipelineClientesUltimaMov
          title="Pipeline por Cliente · Público/Elétrico"
          sectorLabel="Público/Elétrico"
          setorSelecionado="público"
          data={clientesPublicoEletrico.data}
          isLoading={clientesPublicoEletrico.isLoading}
          error={clientesPublicoEletrico.error as Error | null}
        />
        <PipelineClientesUltimaMov
          title="Pipeline por Cliente · Áudio e Vídeo"
          sectorLabel="Áudio e Vídeo"
          setorSelecionado="áudio"
          data={clientesAudioVideo.data}
          isLoading={clientesAudioVideo.isLoading}
          error={clientesAudioVideo.error as Error | null}
        />
      </div>
    </>
  );
};
