import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sidebar, type DashboardTab } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { VendasTab } from "@/components/dashboard/VendasTab";
import { PipelineTab } from "@/components/dashboard/PipelineTab";
import { GerentesTab } from "@/components/dashboard/GerentesTab";
import { AnaliseGerentesTab } from "@/components/dashboard/AnaliseGerentesTab";
import { EstagnadosTable } from "@/components/dashboard/EstagnadosTable";
import { MotivosPerdaChart } from "@/components/dashboard/MotivosPerdaChart";
import { ReportCard } from "@/components/dashboard/ReportCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isGoldConfigured } from "@/lib/supabaseGold";
import {
  type PipelineScope,
  useNegociosEstagnados,
  useMotivosPerda,
} from "@/hooks/useDashboardData";
import type { Sector } from "@/hooks/useVendasData";
import { usePerformanceGestor } from "@/hooks/useGerentesData";

const sectorToScope = (s: Sector): PipelineScope => {
  if (s === "publico") return "setor_publico";
  if (s === "privado") return "setor_privado";
  return "avantia";
};

const Index = () => {
  const [tab, setTab] = useState<DashboardTab>("vendas");
  const [sector, setSector] = useState<Sector>("avantia");
  const [gestorSelecionado, setGestorSelecionado] = useState<string | null>(null);
  const pipelineScope = sectorToScope(sector);

  const estagnados = useNegociosEstagnados(15, 50, pipelineScope);
  const motivos = useMotivosPerda(pipelineScope);
  const perfGestores = usePerformanceGestor();

  const gestoresList = useMemo(
    () =>
      Array.from(
        new Set((perfGestores.data ?? []).map((g) => g.gestor_nome).filter(Boolean))
      ).sort(),
    [perfGestores.data]
  );

  useEffect(() => {
    if (!gestorSelecionado && gestoresList.length > 0) {
      setGestorSelecionado(gestoresList[0]);
    }
  }, [gestoresList, gestorSelecionado]);

  const headerOverride =
    tab === "analise_gerentes" ? (
      <Select
        value={gestorSelecionado ?? ""}
        onValueChange={(v) => setGestorSelecionado(v)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Selecione um gerente" />
        </SelectTrigger>
        <SelectContent>
          {gestoresList.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={tab} onChange={setTab} />

      <div className="lg:pl-56">
        <Header
          sector={sector}
          onSectorChange={setSector}
          selectorOverride={headerOverride}
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

          {tab === "vendas" && <VendasTab sector={sector} />}

          {tab === "pipeline" && <PipelineTab />}

          {tab === "gerentes" && <GerentesTab />}

          {tab === "analise_gerentes" && (
            <AnaliseGerentesTab gestor={gestorSelecionado} />
          )}

          {tab === "licitacoes" && (
            <ReportCard title="Licitações" subtitle="Em desenvolvimento">
              <div className="py-12 text-center text-sm text-muted-foreground">
                Esta seção será conectada às views de licitações em breve.
              </div>
            </ReportCard>
          )}

          {tab === "alertas" && (
            <>
              <EstagnadosTable
                data={estagnados.data}
                isLoading={estagnados.isLoading}
                error={estagnados.error as Error | null}
                maxRows={50}
                title="Negócios Estagnados (> 15 dias)"
              />
              <MotivosPerdaChart
                data={motivos.data}
                isLoading={motivos.isLoading}
                error={motivos.error as Error | null}
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
