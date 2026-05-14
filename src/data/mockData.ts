/**
 * Mock data simulando as views/tabelas do Supabase.
 * Estruturas espelham retornos esperados de:
 *   - vw_dashboard_kpis
 *   - vw_dashboard_vendas_ytd
 *   - vw_dashboard_pipeline_fase
 *   - vw_dashboard_pipeline_cliente
 *   - vw_dashboard_desempenho_gestores
 *   - vw_dashboard_propostas_estagnadas
 *
 * Substituir por: supabase.from('vw_dashboard_xxx').select('*')
 */

export type DealStatus = "won" | "lost" | "open";
export type PipelineStage = "Prospecção" | "Qualificação" | "Proposta" | "Negociação";

export interface KPISummary {
  receita_total_ganha: number;
  win_rate: number;          // 0..100
  ticket_medio: number;
  total_negocios_abertos: number;
  delta_receita: number;     // % vs período anterior
  delta_winrate: number;
  delta_ticket: number;
  delta_abertos: number;
}

export interface VendaCliente {
  empresa: string;
  receita: number;
  negocios: number;
}

export interface PipelineFase {
  fase: PipelineStage;
  valor: number;
  quantidade: number;
}

export interface PipelineCliente {
  empresa: string;
  total_abertos: number;
  valor_estimado: number;
  fechamento_esperado: string; // ISO
}

export interface DesempenhoGestor {
  gestor: string;
  volume: number;
  win_rate: number;
  qtd_negocios: number;
}

export interface PropostaEstagnada {
  id: string;
  negocio: string;
  gestor: string;
  empresa: string;
  dias_sem_interacao: number;
  valor: number;
  fase: PipelineStage;
}

/* -------------------- KPIs -------------------- */
export const mockKPIs: KPISummary = {
  receita_total_ganha: 8_745_320.5,
  win_rate: 34.7,
  ticket_medio: 142_380.25,
  total_negocios_abertos: 87,
  delta_receita: 12.4,
  delta_winrate: 2.1,
  delta_ticket: -3.6,
  delta_abertos: 8.2,
};

/* -------------------- Top 10 Clientes YTD -------------------- */
export const mockVendasYTD: VendaCliente[] = [
  { empresa: "Construtora Vértice", receita: 1_240_500, negocios: 4 },
  { empresa: "Grupo Helena", receita: 980_320, negocios: 3 },
  { empresa: "Logística Andorra", receita: 870_000, negocios: 5 },
  { empresa: "Banco Norte SA", receita: 745_900, negocios: 2 },
  { empresa: "Petro Sul Energia", receita: 690_400, negocios: 3 },
  { empresa: "Indústrias Caravelas", receita: 612_750, negocios: 4 },
  { empresa: "Saúde Plena", receita: 560_120, negocios: 6 },
  { empresa: "Varejo Aurora", receita: 498_300, negocios: 3 },
  { empresa: "Tech Mosaico", receita: 432_700, negocios: 2 },
  { empresa: "Agro Boreal", receita: 389_950, negocios: 3 },
];

/* -------------------- Pipeline por Fase -------------------- */
export const mockPipelineFase: PipelineFase[] = [
  { fase: "Prospecção", valor: 2_450_000, quantidade: 38 },
  { fase: "Qualificação", valor: 1_820_000, quantidade: 24 },
  { fase: "Proposta", valor: 1_350_000, quantidade: 15 },
  { fase: "Negociação", valor: 920_000, quantidade: 10 },
];

/* -------------------- Pipeline por Cliente -------------------- */
export const mockPipelineClientes: PipelineCliente[] = [
  { empresa: "Construtora Vértice", total_abertos: 3, valor_estimado: 540_000, fechamento_esperado: "2026-05-15" },
  { empresa: "Grupo Helena", total_abertos: 2, valor_estimado: 320_500, fechamento_esperado: "2026-04-30" },
  { empresa: "Logística Andorra", total_abertos: 4, valor_estimado: 612_300, fechamento_esperado: "2026-06-10" },
  { empresa: "Banco Norte SA", total_abertos: 1, valor_estimado: 185_000, fechamento_esperado: "2026-05-22" },
  { empresa: "Petro Sul Energia", total_abertos: 5, valor_estimado: 870_400, fechamento_esperado: "2026-07-08" },
  { empresa: "Indústrias Caravelas", total_abertos: 2, valor_estimado: 295_750, fechamento_esperado: "2026-05-02" },
  { empresa: "Saúde Plena", total_abertos: 3, valor_estimado: 410_120, fechamento_esperado: "2026-06-25" },
  { empresa: "Varejo Aurora", total_abertos: 1, valor_estimado: 128_300, fechamento_esperado: "2026-04-28" },
  { empresa: "Tech Mosaico", total_abertos: 2, valor_estimado: 232_700, fechamento_esperado: "2026-05-30" },
  { empresa: "Agro Boreal", total_abertos: 4, valor_estimado: 489_950, fechamento_esperado: "2026-06-15" },
  { empresa: "Mineradora Crisol", total_abertos: 2, valor_estimado: 350_000, fechamento_esperado: "2026-07-19" },
  { empresa: "Editora Marés", total_abertos: 1, valor_estimado: 92_400, fechamento_esperado: "2026-05-12" },
  { empresa: "Cosmética Iara", total_abertos: 3, valor_estimado: 268_900, fechamento_esperado: "2026-06-03" },
  { empresa: "TransBrasil Cargas", total_abertos: 2, valor_estimado: 415_600, fechamento_esperado: "2026-07-22" },
  { empresa: "Solar Atlas", total_abertos: 4, valor_estimado: 720_000, fechamento_esperado: "2026-08-05" },
];

/* -------------------- Desempenho de Gestores -------------------- */
export const mockGestores: DesempenhoGestor[] = [
  { gestor: "Marina Castro", volume: 2_340_500, win_rate: 41.2, qtd_negocios: 22 },
  { gestor: "Rafael Lemos", volume: 1_870_300, win_rate: 38.9, qtd_negocios: 18 },
  { gestor: "Júlia Bertran", volume: 1_650_000, win_rate: 35.4, qtd_negocios: 19 },
  { gestor: "André Pacheco", volume: 1_420_750, win_rate: 32.1, qtd_negocios: 16 },
  { gestor: "Carolina Mendes", volume: 1_180_900, win_rate: 29.7, qtd_negocios: 14 },
  { gestor: "Diogo Vargas", volume: 980_400, win_rate: 27.3, qtd_negocios: 12 },
];

/* -------------------- Propostas Estagnadas -------------------- */
export const mockPropostasEstagnadas: PropostaEstagnada[] = [
  { id: "D-1042", negocio: "Renovação contrato Cloud", empresa: "Banco Norte SA", gestor: "Rafael Lemos", dias_sem_interacao: 47, valor: 320_000, fase: "Negociação" },
  { id: "D-1058", negocio: "Implantação ERP", empresa: "Indústrias Caravelas", gestor: "Marina Castro", dias_sem_interacao: 39, valor: 412_500, fase: "Proposta" },
  { id: "D-1071", negocio: "Consultoria Cybersec", empresa: "Petro Sul Energia", gestor: "Júlia Bertran", dias_sem_interacao: 35, valor: 198_700, fase: "Proposta" },
  { id: "D-1083", negocio: "Migração Datacenter", empresa: "Logística Andorra", gestor: "André Pacheco", dias_sem_interacao: 31, valor: 540_000, fase: "Negociação" },
  { id: "D-1090", negocio: "Plataforma BI", empresa: "Varejo Aurora", gestor: "Carolina Mendes", dias_sem_interacao: 28, valor: 156_400, fase: "Qualificação" },
  { id: "D-1099", negocio: "Suporte 24x7", empresa: "Saúde Plena", gestor: "Diogo Vargas", dias_sem_interacao: 24, valor: 89_900, fase: "Proposta" },
  { id: "D-1104", negocio: "App Mobile", empresa: "Tech Mosaico", gestor: "Marina Castro", dias_sem_interacao: 22, valor: 215_300, fase: "Negociação" },
];
