import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sidebar, type DashboardTab } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { VendasTab } from "@/components/dashboard/VendasTab";
import { PipelineTab } from "@/components/dashboard/PipelineTab";
import { GerentesTab } from "@/components/dashboard/GerentesTab";
import { AnaliseGerentesTab } from "@/components/dashboard/AnaliseGerentesTab";
import { EvolucaoOportunidadeTab } from "@/components/dashboard/EvolucaoOportunidadeTab";
import { EstagnadosTable } from "@/components/dashboard/EstagnadosTable";
import { MotivosPerdaChart } from "@/components/dashboard/MotivosPerdaChart";
import { LicitacoesTab } from "@/components/dashboard/LicitacoesTab";
import { isGoldConfigured } from "@/lib/supabaseGold";
import {
  type PipelineScope,
  useNegociosEstagnados,
  useMotivosPerda,
} from "@/hooks/useDashboardData";
import type { Sector } from "@/hooks/useVendasData";

const sectorToScope = (s: Sector): PipelineScope => {
  if (s === "publico") return "setor_publico";
  if (s === "privado") return "setor_privado";
  return "avantia";
};

const Index = () => {
  const [tab, setTab] = useState<DashboardTab>("vendas");
  const [sector, setSector] = useState<Sector>("avantia");
  const [periodo, setPeriodo] = useState("ytd");
  const pipelineScope = sectorToScope(sector);

  const estagnados = useNegociosEstagnados(15, 50, pipelineScope);
  const motivos = useMotivosPerda(pipelineScope);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar active={tab} onChange={setTab} />

      <div className="lg:pl-56">
        <Header
          sector={sector}
          onSectorChange={setSector}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          hideSectorSelector={tab === "gerentes" || tab === "analise_gerentes"}
        />

        <main className="px-3 sm:px-5 py-4 space-y-4 max-w-[1600px] mx-auto">
          {!isGoldConfigured && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-foreground">
                Conexão com o banco não configurada. Defina{" "}
                <code className="font-mono bg-muted px-1 rounded">VITE_GOLD_SUPABASE_URL</code> e{" "}
                <code className="font-mono bg-muted px-1 rounded">VITE_GOLD_SUPABASE_ANON_KEY</code>.
              </p>
            </div>
          )}

          {tab === "vendas" && <VendasTab sector={sector} periodo={periodo} />}

          {tab === "pipeline" && <PipelineTab sector={sector} />}

          {tab === "gerentes" && <GerentesTab periodo={periodo} />}

          {tab === "analise_gerentes" && <AnaliseGerentesTab periodo={periodo} />}

          {tab === "evolucao_oportunidade" && <EvolucaoOportunidadeTab />}

          {tab === "licitacoes" && <LicitacoesTab />}

          {tab === "alertas" && (
            <>
              <MotivosPerdaChart
                data={motivos.data}
                isLoading={motivos.isLoading}
                error={motivos.error as Error | null}
              />
              <EstagnadosTable
                data={estagnados.data}
                isLoading={estagnados.isLoading}
                error={estagnados.error as Error | null}
                maxRows={50}
                title="Negócios Estagnados (> 15 dias)"
              />
            </>
          )}

          <footer className="pt-3 pb-2 text-center text-[11px] text-muted-foreground">
            Avantia · Dashboard executivo · Read-only
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
