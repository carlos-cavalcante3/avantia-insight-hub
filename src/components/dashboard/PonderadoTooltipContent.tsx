/**
 * Conteúdo estruturado do tooltip do "Pipeline Ponderado".
 * Cores devem espelhar exatamente o funil em PipelineFaseChart.tsx.
 */
const ETAPAS_PONDERADO = [
  { nome: "Pré-Venda", pct: "5%", cor: "#ea580c" },
  { nome: "Proposta", pct: "10%", cor: "#0891b2" },
  { nome: "Análise", pct: "20%", cor: "#4f46e5" },
  { nome: "On-hold", pct: "10%", cor: "#059669" },
  { nome: "Negociação", pct: "33%", cor: "#06b6d4" },
  { nome: "Pedido", pct: "90%", cor: "#7c3aed" },
] as const;

export const PonderadoTooltipContent = () => (
  <div className="p-1 min-w-[220px]">
    <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold mb-2">
      Probabilidade por etapa
    </p>
    <ul className="space-y-1.5">
      {ETAPAS_PONDERADO.map((e) => (
        <li
          key={e.nome}
          className="flex items-center gap-2.5 text-xs text-white"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0 ring-1 ring-white/20"
            style={{ backgroundColor: e.cor }}
            aria-hidden
          />
          <span className="font-bold tabular-nums w-9 text-right">{e.pct}</span>
          <span className="text-white/85">— {e.nome}</span>
        </li>
      ))}
    </ul>
  </div>
);
