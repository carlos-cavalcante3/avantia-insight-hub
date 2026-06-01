import { ReportCard } from "./ReportCard";

export const LicitacoesTab = () => (
  <ReportCard
    title="Licitações"
    subtitle="Painel integrado de oportunidades em licitação"
    className="p-0 overflow-hidden border-slate-800/60"
  >
    <iframe
      title="Licitações Avantia"
      src="/licitacoes.html"
      className="w-full h-[calc(100vh-120px)] border-none rounded-xl bg-slate-950"
    />
  </ReportCard>
);
