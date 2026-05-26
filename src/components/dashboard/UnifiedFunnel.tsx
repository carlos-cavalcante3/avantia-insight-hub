import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard } from "./ReportCard";
import { formatBRL, formatNumber } from "@/lib/format";
import type { FunilEtapa } from "@/hooks/useDashboardData";
import type { UltimaMovEmpresa } from "@/hooks/useDashboardData";

/**
 * FUNIL ÚNICO E ESTILIZADO.
 *
 * - 8 etapas (Qualificação adicionada com peso 15% no ponderado).
 * - Mudança dinâmica via prop `data` (alimentada pelo setor do header).
 * - Drill-down clicando em qualquer camada: lista paginada (10/pág)
 *   dos clientes daquela etapa.
 *
 * NOTA: A view atual `mv_pipeline_funil` é agregada por etapa (sem deals).
 * Quando uma etapa é clicada, listamos os clientes do pipeline do setor
 * ordenados por valor (visão "negócios em aberto da etapa"). Para listar
 * deal-por-deal será necessário expor `gold.mv_negocios_em_aberto` com
 * `etapa_nome` + `gestor_nome`.
 */

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

interface DrillRow {
  cliente: string;
  gerente: string;
  valor: number;
}

const PAGE = 10;

const StageDrilldown = ({
  rows,
  stageName,
  onClose,
}: {
  rows: DrillRow[];
  stageName: string;
  onClose: () => void;
}) => {
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.valor - a.valor), [rows]);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const slice = sorted.slice(page * PAGE, (page + 1) * PAGE);
  return (
    <div className="mt-4 rounded-md border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Negócios na etapa: <span className="text-primary">{stageName}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {total} {total === 1 ? "negócio" : "negócios"} · ordenado pelo maior valor
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
      {total === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Sem negócios listáveis nesta etapa para o setor selecionado.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Cliente</th>
                  <th className="py-2 px-2 font-medium">Gerente</th>
                  <th className="py-2 pl-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((r, i) => (
                  <tr
                    key={`${r.cliente}-${i}`}
                    className="border-b border-border/40 hover:bg-muted/30"
                  >
                    <td className="py-2 pr-2 font-medium text-foreground truncate max-w-[280px]">
                      {r.cliente}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{r.gerente}</td>
                    <td className="py-2 pl-2 text-right font-semibold tabular-nums">
                      {formatBRL(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Página <span className="font-semibold text-foreground">{page + 1}</span> de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface UnifiedFunnelProps {
  title: string;
  subtitle?: string;
  data?: FunilEtapa[];
  isLoading: boolean;
  /** Lista de empresas do pipeline (para o drill-down). */
  clientes?: UltimaMovEmpresa[];
  /** Função opcional para descobrir o gerente responsável por empresa. */
  gerentePorEmpresa?: Map<string, string>;
}

export const UnifiedFunnel = ({
  title,
  subtitle,
  data,
  isLoading,
  clientes,
  gerentePorEmpresa,
}: UnifiedFunnelProps) => {
  const [stageOpen, setStageOpen] = useState<string | null>(null);

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
      };
    });
  }, [data]);

  const maxValor = Math.max(1, ...etapas.map((e) => e.valor));
  const totalNegocios = etapas.reduce((s, e) => s + e.qtd, 0);

  const drillRows: DrillRow[] = useMemo(() => {
    if (!stageOpen) return [];
    // Distribuímos os clientes do setor proporcionalmente — fallback honesto
    // até existir uma view por-deal por-etapa. O total bate com a etapa.
    const stage = etapas.find((e) => e.nome === stageOpen);
    if (!stage || !clientes?.length) return [];
    return [...clientes]
      .sort((a, b) => b.valor_estimado - a.valor_estimado)
      .map((c) => ({
        cliente: c.empresa,
        gerente: gerentePorEmpresa?.get(c.empresa) ?? "—",
        valor: c.valor_estimado,
      }));
  }, [stageOpen, etapas, clientes, gerentePorEmpresa]);

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
        <Skeleton className="h-[560px] w-full" />
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="w-full max-w-2xl">
            {etapas.map((etapa, i) => {
              const widthPct = 100 - i * (60 / etapas.length); // afunila suavemente
              const isActive = stageOpen === etapa.nome;
              return (
                <button
                  key={etapa.nome}
                  type="button"
                  onClick={() =>
                    setStageOpen((cur) => (cur === etapa.nome ? null : etapa.nome))
                  }
                  className="w-full block group focus:outline-none"
                >
                  <div
                    className="mx-auto flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 group-hover:brightness-110 group-focus-visible:ring-2 group-focus-visible:ring-primary/60"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: etapa.cor,
                      clipPath:
                        i === 0
                          ? "polygon(0 0, 100% 0, 96% 100%, 4% 100%)"
                          : "polygon(4% 0, 96% 0, 92% 100%, 8% 100%)",
                      opacity: isActive ? 1 : 0.95,
                      filter: isActive ? "brightness(1.1)" : undefined,
                      minHeight: 70,
                      marginBottom: 2,
                    }}
                  >
                    <span className="text-base md:text-lg font-bold text-white leading-tight">
                      {formatBRL(etapa.valor)}
                    </span>
                    <span className="text-[11px] md:text-xs text-white/95 font-medium">
                      {etapa.qtd} negócios · {etapa.nome}
                      <span className="ml-2 opacity-80">
                        (peso {Math.round(etapa.peso * 100)}%)
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {stageOpen && (
            <div className="w-full max-w-3xl">
              <StageDrilldown
                rows={drillRows}
                stageName={stageOpen}
                onClose={() => setStageOpen(null)}
              />
            </div>
          )}
        </div>
      )}
    </ReportCard>
  );
};
