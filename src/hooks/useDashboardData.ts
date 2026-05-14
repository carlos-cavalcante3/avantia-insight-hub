import { useQuery } from "@tanstack/react-query";
import { supabaseGold, isGoldConfigured } from "@/lib/supabaseGold";
import { isPipelineNomeAvantiaGeral } from "@/lib/pipelineAvantiaGeral";
import type {
  DesempenhoGestor,
  PipelineCliente,
  PipelineFase,
  VendaCliente,
} from "@/data/mockData";

/* ============================================================
 * Tipos das views REAIS no schema `gold`
 * Views disponíveis:
 *   mv_kpis_gerais, mv_top_empresas, mv_pipeline_funil,
 *   mv_motivos_perda, mv_vendas_mensais_yoy, mv_ciclo_vendas,
 *   mv_negocios_estagnados
 * ============================================================ */

export interface KPIExec {
  receita_ganha_ytd: number;
  pipeline_aberto: number;
  ticket_medio_ytd: number;
  win_rate_ytd: number;
  total_vendas_ytd: number;
  /** Valor fechado no mês atual (vendas ganhas) */
  valor_ganho_mes: number;
  valor_recorrente_mes: number;
  valor_unico_mes: number;
}

export interface OportunidadeGerada {
  pipeline_nome?: string;
  ano: number;
  mes: number;
  mes_label: string;
  qtd_gerada: number;
  valor_gerado: number;
}

export interface VendaMesCliente {
  pipeline_nome?: string;
  empresa_nome: string;
  qtd_negocios: number;
  valor_ganho: number;
}

export interface PropostaGestor {
  pipeline_nome?: string;
  gestor_nome: string;
  total_propostas_ano: number;
  valor_propostas_ano: number;
}

export interface NegocioEstagnado {
  pipeline_nome?: string;
  id: string;
  negocio: string;
  empresa: string;
  gestor: string;
  dias_parado: number;
  valor: number;
  fase: string;
  updated_at: string | null;
}

export interface VendaAno {
  pipeline_nome?: string;
  ano: number;
  total_vendas: number;
  valor_total_vendido: number;
  valor_one_time: number;
  valor_recorrente: number;
  ticket_medio: number;
}

export interface MotivoPerda {
  pipeline_nome?: string;
  motivo: string;
  qtd_negocios: number;
  valor_perdido: number;
  /** alias retro-compatível para componentes existentes */
  total_perdidos: number;
  label: string;
}

/** Série mensal YTD (ano corrente) para evolução de vendas — mv_vendas_mensais_yoy agregada por mês. */
export interface VendaMes {
  mes: number; // 1..12
  mes_label: string;
  ano: number;
  receita_total: number;
  receita_recorrente: number;
  receita_unica: number;
  qtd_negocios: number;
}

export interface FunilStage {
  stage_id: string;
  stage_label: string;
  pipeline_id: string;
  pipeline_nome?: string;
  total: number;
  ganhos: number;
  perdidos: number;
  abertos: number;
  conversao: number;
  /** valor total da etapa (para card de conversão) */
  valor_total: number;
}

export interface UltimaMovEmpresa {
  pipeline_nome?: string;
  empresa: string;
  total_abertos: number;
  valor_estimado: number;
  ultima_movimentacao: string | null;
}

export interface VendaAnoSamePeriod {
  pipeline_nome?: string;
  ano_atual: number;
  ano_anterior: number;
  mes_corte: number; // 1..12
  receita_atual: number;
  receita_anterior: number;
  qtd_atual: number;
  qtd_anterior: number;
  ticket_atual: number;
  ticket_anterior: number;
  crescimento_pct: number;
}

/* ============================================================
 * Helpers
 * ============================================================ */

const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (!isGoldConfigured) {
    throw new Error(
      "Configuração ausente: defina VITE_GOLD_SUPABASE_URL e VITE_GOLD_SUPABASE_ANON_KEY."
    );
  }
  return fn();
};

const MES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Colunas solicitadas para mv_vendas_mensais_yoy (evolução mensal + agregações). */
const MV_VENDAS_MENSAIS_SELECT =
  "pipeline_nome, ano, mes, receita_total, receita_recorrente, receita_unica, qtd_negocios";

export type PipelineScope = "avantia" | "setor_publico" | "setor_privado";

/** Linha bruta de `gold.mv_pipeline_funil` (select *). */
export interface RowFunil {
  pipeline_nome: string | null;
  etapa_nome: string | null;
  ordem: number | null;
  total_negocios: number | null;
  valor_total: number | null;
  valor_exibicao?: number | null;
  valor_soma_ativa?: number | null;
}

export interface FunilEtapa extends PipelineFase {
  pipeline_nome: string;
  ordem: number;
  valor_total: number;
  valor_exibicao: number;
  valor_soma_ativa: number;
}

/** Resultado de `usePipelineFunil`: etapas agregadas + total executivo (M) no cabeçalho. */
export interface PipelineFunilResult {
  etapas: FunilEtapa[];
  /** Soma em R$ / 1e6 conforme regra de compliance do cabeçalho. */
  headerMillions: number;
}

const applyPipelineScope = <T>(query: T, scope: PipelineScope): T => {
  if (scope === "setor_publico") {
    return (query as { ilike: (column: string, pattern: string) => T }).ilike(
      "pipeline_nome",
      "%Público%"
    );
  }
  if (scope === "setor_privado") {
    return (query as { ilike: (column: string, pattern: string) => T }).ilike(
      "pipeline_nome",
      "%Privado%"
    );
  }
  return query;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const pipelineNomeNorm = (row: { pipeline_nome?: string | null }) =>
  normalize(String(row?.pipeline_nome ?? ""));

/** Exclui o financeiro da etapa On-Hold do pipeline Privado no total do cabeçalho (Privado e Avantia Geral). */
const excludeOnHoldPrivadoFromHeaderValor = (
  r: RowFunil,
  pipelineScope: PipelineScope,
  pipelineFilter?: string | null
): boolean => {
  const onHold = String(r.etapa_nome ?? "").toLowerCase().includes("on-hold");
  if (!onHold) return false;
  const privPipe = pipelineNomeNorm(r).includes("privado");
  const pf = normalize(String(pipelineFilter ?? ""));
  const isAudioFocus = pf.includes("audio") || pf.includes("video");
  if (pipelineScope === "setor_privado") return true;
  if (pipelineScope === "avantia" && !isAudioFocus) return privPipe;
  return false;
};

/** Filtro em memória (sem PostgREST) para linhas de `mv_pipeline_funil` por setor. */
export const filterFunilRowsByPipelineScope = (
  rows: RowFunil[],
  scope: PipelineScope,
  pipelineFilter?: string | null
): RowFunil[] => {
  const pf = normalize(String(pipelineFilter ?? ""));
  const isAudioFocus = pf.includes("audio") || pf.includes("video");

  if (isAudioFocus) {
    return rows.filter((row) => {
      const n = pipelineNomeNorm(row);
      return n.includes("audio") || n.includes("video");
    });
  }
  if (scope === "setor_privado") {
    return rows.filter((row) => pipelineNomeNorm(row).includes("privado"));
  }
  if (scope === "setor_publico") {
    return rows.filter((row) => {
      const n = pipelineNomeNorm(row);
      return (
        n.includes("publico") ||
        n.includes("public") ||
        n.includes("eletrico") ||
        n.includes("eletric")
      );
    });
  }
  return rows.filter((row) => isPipelineNomeAvantiaGeral(row.pipeline_nome));
};

/* ============================================================
 * 1) KPIs Executivos (mv_kpis_gerais)
 *    Colunas reais: total_negocios_ganhos, valor_total_ganho, ticket_medio
 *    Pipeline aberto e win-rate são derivados de mv_pipeline_funil.
 * ============================================================ */

export const useKPIsGerais = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "kpis_gerais_v4", pipelineScope],
    queryFn: async (): Promise<KPIExec> =>
      guard(async () => {
        const [{ data: kpiRows, error: e1 }, { data: funilAll, error: e2 }] = await Promise.all([
          applyPipelineScope(
            supabaseGold
              .from("mv_kpis_gerais")
              .select(
                "pipeline_nome, total_negocios_ganhos, valor_total_ganho, ticket_medio, total_negocios_ganhos_ytd, valor_total_ganho_ytd, ticket_medio_ytd, valor_ganho_mes, valor_unico_mes, valor_recorrente_mes"
              ),
            pipelineScope
          ),
          supabaseGold.from("mv_pipeline_funil").select("*"),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        const kpiList = (kpiRows ?? []) as Record<string, unknown>[];
        const r = kpiList.reduce<Record<string, number>>(
          (acc, row) => {
            acc.valor_total_ganho_ytd += Number(row.valor_total_ganho_ytd ?? row.valor_total_ganho ?? 0);
            acc.total_negocios_ganhos_ytd += Number(
              row.total_negocios_ganhos_ytd ?? row.total_negocios_ganhos ?? 0
            );
            acc.valor_ganho_mes += Number(row.valor_ganho_mes ?? 0);
            acc.valor_recorrente_mes += Number(row.valor_recorrente_mes ?? 0);
            acc.valor_unico_mes += Number(row.valor_unico_mes ?? 0);
            return acc;
          },
          {
            valor_total_ganho_ytd: 0,
            total_negocios_ganhos_ytd: 0,
            valor_ganho_mes: 0,
            valor_recorrente_mes: 0,
            valor_unico_mes: 0,
          }
        );
        const ticketMedio = r.total_negocios_ganhos_ytd
          ? r.valor_total_ganho_ytd / r.total_negocios_ganhos_ytd
          : 0;

        let pipeline_aberto = 0;
        let ganhos = 0;
        let perdidos = 0;
        let abertos = 0;
        const funilRows = filterFunilRowsByPipelineScope(
          (funilAll ?? []) as RowFunil[],
          pipelineScope,
          null
        );
        for (const row of funilRows as unknown as Record<string, unknown>[]) {
          abertos += Number(row.total_negocios ?? 0);
          pipeline_aberto += Number(row.valor_total ?? 0);
          ganhos += Number(row.ganhos ?? 0);
          perdidos += Number(row.perdidos ?? 0);
        }
        const universo = ganhos + perdidos;
        const win_rate_ytd = universo ? (ganhos / universo) * 100 : 0;

        return {
          receita_ganha_ytd: Number(r.valor_total_ganho_ytd ?? r.valor_total_ganho ?? 0),
          pipeline_aberto,
          ticket_medio_ytd: ticketMedio,
          win_rate_ytd,
          total_vendas_ytd: Number(r.total_negocios_ganhos_ytd ?? r.total_negocios_ganhos ?? 0),
          valor_ganho_mes: Number(r.valor_ganho_mes ?? 0),
          valor_recorrente_mes: Number(r.valor_recorrente_mes ?? 0),
          valor_unico_mes: Number(r.valor_unico_mes ?? 0),
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 2) Negócios Estagnados (mv_negocios_estagnados)
 *    Colunas: id, negocio_nome, empresa_nome, valor, expected_close_date, dias_sem_interacao
 *    Não há gestor na view → exibimos "—".
 * ============================================================ */

export const useNegociosEstagnados = (
  minDias = 15,
  limit = 50,
  pipelineScope: PipelineScope = "avantia"
) =>
  useQuery({
    queryKey: ["gold", "estagnados_v4", minDias, limit, pipelineScope],
    queryFn: async (): Promise<NegocioEstagnado[]> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold
            .from("mv_negocios_estagnados")
            .select("*")
            .order("dias_sem_interacao", { ascending: false })
            .limit(500),
          pipelineScope
        );
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[])
          .map((r) => ({
            id: String(r.id ?? ""),
            pipeline_nome: String(r.pipeline_nome ?? ""),
            negocio: String(r.negocio_nome ?? "—"),
            empresa: String(r.empresa_nome ?? ""),
            gestor: "—",
            dias_parado: Number(r.dias_sem_interacao ?? 0),
            valor: Number(r.valor ?? 0),
            fase: "",
            updated_at: null,
          }))
          .filter((r) => r.dias_parado >= minDias)
          .slice(0, limit);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 3) Desempenho de Gestores
 *    Fontes: mv_vendas_gestor_periodo (valor YTD/MTD por gestor)
 *            + mv_ciclo_vendas (dias_medios_fechamento por gestor)
 *    Ticket médio e win-rate não existem na view; mantemos 0 para compatibilidade visual.
 * ============================================================ */

type MapaGestorAgg = {
  gestor_nome: string;
  valor_total_ganho: number;
  negocios_ganhos: number;
  total_propostas_ano: number;
  valor_propostas_ano: number;
  diasPond: number;
  diasN: number;
};

const chaveGestor = (nome: string) =>
  (nome.trim() || "—").toLocaleLowerCase("pt-BR");

export interface GestorDetalhado extends DesempenhoGestor {
  dias_medios_fechamento: number;
  ticket_medio: number;
}

export const useGestores = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "gestores_performance_ciclo_v5", pipelineScope],
    queryFn: async (): Promise<GestorDetalhado[]> =>
      guard(async () => {
        const [{ data: performance, error: e1 }, { data: ciclo, error: e2 }] = await Promise.all([
          applyPipelineScope(
            supabaseGold
              .from("mv_vendas_gestor_periodo")
              .select("pipeline_nome, gestor_nome, valor_ytd, valor_mtd"),
            pipelineScope
          ),
          applyPipelineScope(
            supabaseGold.from("mv_ciclo_vendas").select("pipeline_nome, gestor, dias_medios_fechamento"),
            pipelineScope
          ),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const mapaGestores: Record<string, MapaGestorAgg> = {};

        for (const r of (performance ?? []) as Record<string, unknown>[]) {
          const nome = String(r.gestor_nome ?? "—").trim() || "—";
          const key = chaveGestor(nome);
          if (!mapaGestores[key]) {
            mapaGestores[key] = {
              gestor_nome: nome,
              valor_total_ganho: 0,
              negocios_ganhos: 0,
              total_propostas_ano: 0,
              valor_propostas_ano: 0,
              diasPond: 0,
              diasN: 0,
            };
          }
          const g = mapaGestores[key];
          g.valor_total_ganho += Number(r.valor_ytd ?? 0);
          g.negocios_ganhos += 0;
          g.total_propostas_ano += 0;
          g.valor_propostas_ano += Number(r.valor_mtd ?? 0);
        }

        for (const r of (ciclo ?? []) as Record<string, unknown>[]) {
          const nome = String(r.gestor ?? "—").trim() || "—";
          const key = chaveGestor(nome);
          if (!mapaGestores[key]) {
            mapaGestores[key] = {
              gestor_nome: nome,
              valor_total_ganho: 0,
              negocios_ganhos: 0,
              total_propostas_ano: 0,
              valor_propostas_ano: 0,
              diasPond: 0,
              diasN: 0,
            };
          }
          const diasRaw = Number(r.dias_medios_fechamento ?? 0);
          const dias =
            Number.isFinite(diasRaw) && Math.abs(diasRaw) <= 1500 ? Math.abs(diasRaw) : 0;
          const g = mapaGestores[key];
          g.diasPond += dias;
          g.diasN += 1;
        }

        const lista = Object.values(mapaGestores);
        const totalGanhosEquipe = lista.reduce((s, g) => s + g.negocios_ganhos, 0);

        return lista
          .map((g) => {
            const ticket_medio =
              g.negocios_ganhos > 0 ? g.valor_total_ganho / g.negocios_ganhos : 0;
            const dias_medios_fechamento = g.diasN ? g.diasPond / g.diasN : 0;
            return {
              gestor: g.gestor_nome,
              volume: g.valor_total_ganho,
              win_rate: totalGanhosEquipe ? (g.negocios_ganhos / totalGanhosEquipe) * 100 : 0,
              qtd_negocios: g.negocios_ganhos,
              dias_medios_fechamento,
              ticket_medio,
            };
          })
          .filter((row) => row.qtd_negocios > 0 || row.volume > 0 || row.dias_medios_fechamento > 0)
          .sort((a, b) => b.volume - a.volume);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 4) Top Empresas (mv_top_empresas)
 *    Colunas: empresa_nome, total_negocios, valor_total, valor_ganho
 * ============================================================ */

interface RowEmpresa {
  pipeline_nome?: string;
  empresa_nome: string;
  total_negocios: number;
  valor_total: number;
  valor_ganho: number;
}

const fetchEmpresas = async (pipelineScope: PipelineScope): Promise<RowEmpresa[]> =>
  guard(async () => {
    const { data, error } = await applyPipelineScope(
      supabaseGold
        .from("mv_top_empresas")
        .select("pipeline_nome, empresa_nome, total_negocios, valor_ganho")
        .order("valor_ganho", { ascending: false }),
      pipelineScope
    );
    if (error) throw error;
    return (data ?? []) as RowEmpresa[];
  });

export const useTopClientesYTD = (limit = 10, pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "top_empresas_v4", limit, pipelineScope],
    queryFn: async (): Promise<VendaCliente[]> => {
      const rows = await fetchEmpresas(pipelineScope);
      if (pipelineScope !== "avantia") {
        return rows
          .map((r) => ({
            empresa: String(r.empresa_nome ?? "—"),
            receita: Number(r.valor_ganho ?? 0),
            negocios: Number(r.total_negocios ?? 0),
          }))
          .filter((r) => r.receita > 0)
          .sort((a, b) => b.receita - a.receita)
          .slice(0, limit);
      }
      const agg = new Map<string, { receita: number; negocios: number }>();
      for (const r of rows) {
        const empresa = String(r.empresa_nome ?? "—").trim() || "—";
        const cur = agg.get(empresa) ?? { receita: 0, negocios: 0 };
        cur.receita += Number(r.valor_ganho ?? 0);
        cur.negocios += Number(r.total_negocios ?? 0);
        agg.set(empresa, cur);
      }
      return Array.from(agg.entries())
        .map(([empresa, v]) => ({ empresa, receita: v.receita, negocios: v.negocios }))
        .filter((r) => r.receita > 0)
        .sort((a, b) => b.receita - a.receita)
        .slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 5) Pipeline por Cliente — Última Movimentação
 *    Fonte: mv_negocios_estagnados (tem empresa_nome, valor, dias_sem_interacao)
 *    Última movimentação = hoje - dias_sem_interacao.
 * ============================================================ */

export const usePipelineClientesUltimaMov = (
  limit = 60,
  pipelineScope: PipelineScope = "avantia"
) =>
  useQuery({
    queryKey: ["gold", "pipeline_clientes_ultima_mov_v4", limit, pipelineScope],
    queryFn: async (): Promise<UltimaMovEmpresa[]> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold
            .from("mv_negocios_estagnados")
            .select("pipeline_nome,empresa_nome,valor,dias_sem_interacao")
            .limit(5000),
          pipelineScope
        );
        if (error) throw error;

        const agg = new Map<
          string,
          { abertos: number; valor: number; minDias: number; pipelines: Set<string> }
        >();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const empresa = String(r.empresa_nome ?? "Empresa não classificada");
          const valor = Number(r.valor ?? 0);
          const dias = Number(r.dias_sem_interacao ?? 9999);
          const pipelineNome = String(r.pipeline_nome ?? "");
          const cur = agg.get(empresa) ?? {
            abertos: 0,
            valor: 0,
            minDias: Infinity,
            pipelines: new Set<string>(),
          };
          cur.abertos += 1;
          cur.valor += valor;
          if (dias < cur.minDias) cur.minDias = dias;
          if (pipelineNome) cur.pipelines.add(pipelineNome);
          agg.set(empresa, cur);
        }

        const now = Date.now();
        return Array.from(agg.entries())
          .map(([empresa, v]) => ({
            empresa,
            pipeline_nome: Array.from(v.pipelines).join(" | "),
            total_abertos: v.abertos,
            valor_estimado: v.valor,
            ultima_movimentacao:
              v.minDias === Infinity
                ? null
                : new Date(now - v.minDias * 86400000).toISOString(),
          }))
          .sort((a, b) => b.valor_estimado - a.valor_estimado)
          .slice(0, limit);
      }),
    staleTime: 5 * 60 * 1000,
  });

// Compat
export const usePipelineClientes = () =>
  useQuery({
    queryKey: ["gold", "top_empresas_pipeline_v3"],
    queryFn: async (): Promise<PipelineCliente[]> => {
      const rows = await fetchEmpresas("avantia");
      return rows.map((r) => ({
        empresa: r.empresa_nome,
        total_abertos: r.total_negocios ?? 0,
        valor_estimado: Math.max(0, (r.valor_total ?? 0) - (r.valor_ganho ?? 0)),
        fechamento_esperado: "",
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 6) Pipeline de Vendas (mv_pipeline_funil)
 *    Colunas reais: pipeline_nome, etapa_nome, ordem,
 *                   total_negocios, valor_total
 *    Mostrar etapa_nome ordenado por `ordem`.
 *    Filtra ao pipeline mais ativo (maior soma de total_negocios).
 * ============================================================ */

/**
 * Funil consolidado por padrão (todos os pipelines).
 * Passe `pipelineFilter` no futuro para análise individual por pipeline.
 * Etapas agrupadas por (etapa_nome + ordem) e ordenadas pela ordem do funil.
 */
export const usePipelineFunil = (
  pipelineScope: PipelineScope = "avantia",
  pipelineFilter?: string | null
) =>
  useQuery({
    queryKey: ["gold", "pipeline_funil_consolidado_v8", pipelineScope, pipelineFilter ?? "ALL"],
    queryFn: async (): Promise<PipelineFunilResult> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_pipeline_funil").select("*");
        if (error) throw error;
        const allRows = (data ?? []) as RowFunil[];
        let rows = filterFunilRowsByPipelineScope(allRows, pipelineScope, pipelineFilter);
        const pf = normalize(String(pipelineFilter ?? ""));
        const isAudioFocus = pf.includes("audio") || pf.includes("video");
        if (pipelineFilter && !isAudioFocus) {
          rows = rows.filter((r) =>
            pipelineNomeNorm(r).includes(normalize(String(pipelineFilter)))
          );
        }
        const filtered = rows;

        const headerSomaBruta = filtered
          .filter((r) => !excludeOnHoldPrivadoFromHeaderValor(r, pipelineScope, pipelineFilter))
          .reduce((acc, curr) => acc + Number(curr.valor_total ?? 0), 0);

        // Consolida por (ordem + etapa_nome) somando todos os pipelines (`valor_total` Gold).
        const agg = new Map<
          string,
          {
            etapa: string;
            ordem: number;
            qtd: number;
            valorTotal: number;
          }
        >();
        for (const r of filtered) {
          const etapa = (r.etapa_nome ?? "—").trim();
          if (etapa.toLowerCase() === "qualificação técnica" || etapa.toLowerCase() === "qualificacao tecnica") {
            continue;
          }
          const ordem = Number(r.ordem ?? 0);
          const key = `${ordem}::${etapa.toLowerCase()}`;
          const cur = agg.get(key) ?? {
            etapa,
            ordem,
            qtd: 0,
            valorTotal: 0,
          };
          cur.qtd += Number(r.total_negocios ?? 0);
          cur.valorTotal += Number(r.valor_total ?? 0);
          agg.set(key, cur);
        }

        const label = pipelineFilter ?? "Todos os pipelines";
        const etapas = Array.from(agg.values())
          .filter((r) => r.qtd > 0 || r.valorTotal > 0)
          .sort((a, b) => a.ordem - b.ordem)
          .map((r) => {
            const v = r.valorTotal;
            return {
              fase: r.etapa as unknown as PipelineFase["fase"],
              valor: v,
              quantidade: r.qtd,
              pipeline_nome: label,
              ordem: r.ordem,
              valor_total: v,
              valor_exibicao: v,
              valor_soma_ativa: v,
            };
          });
        return {
          etapas,
          headerMillions: headerSomaBruta / 1e6,
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Lista de pipelines disponíveis (para futuro filtro por pipeline). */
export const usePipelinesDisponiveis = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "pipelines_disponiveis_v3", pipelineScope],
    queryFn: async (): Promise<string[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_pipeline_funil").select("*");
        if (error) throw error;
        const scoped = filterFunilRowsByPipelineScope(
          (data ?? []) as RowFunil[],
          pipelineScope,
          null
        );
        const set = new Map<string, number>();
        for (const r of scoped) {
          const p = (r.pipeline_nome ?? "").trim();
          if (!p) continue;
          set.set(p, (set.get(p) ?? 0) + Number(r.total_negocios ?? 0));
        }
        return Array.from(set.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([p]) => p);
      }),
    staleTime: 10 * 60 * 1000,
  });

/* ============================================================
 * 7) Vendas por Ano — derivado de mv_vendas_mensais_yoy
 *    Sem coluna recorrente/one-time na origem → preenche zerados.
 * ============================================================ */

export const useVendasPorAno = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "vendas_por_ano_v4", pipelineScope],
    queryFn: async (): Promise<VendaAno[]> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold.from("mv_vendas_mensais_yoy").select(MV_VENDAS_MENSAIS_SELECT),
          pipelineScope
        );
        if (error) throw error;
        const agg = new Map<number, { qtd: number; receita: number }>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const ano = Number(r.ano);
          const cur = agg.get(ano) ?? { qtd: 0, receita: 0 };
          cur.qtd += Number(r.qtd_negocios ?? 0);
          cur.receita += Number(r.receita_total ?? 0);
          agg.set(ano, cur);
        }
        return Array.from(agg.entries())
          .map(([ano, v]) => ({
            ano,
            total_vendas: v.qtd,
            valor_total_vendido: v.receita,
            valor_one_time: v.receita,
            valor_recorrente: 0,
            ticket_medio: v.qtd ? v.receita / v.qtd : 0,
          }))
          .sort((a, b) => b.ano - a.ano);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 8) Motivos de Perda (mv_motivos_perda)
 *    Colunas reais: motivo, qtd_negocios, valor_perdido
 * ============================================================ */

export const useMotivosPerda = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "motivos_perda_v5", pipelineScope],
    queryFn: async (): Promise<MotivoPerda[]> =>
      guard(async () => {
        // Defensive: fetch the entire view and filter in memory to tolerate
        // accent / parenthesis / casing drift between the front-end label
        // ("Avantia (Geral)") and the values stored in the database.
        const { data, error } = await supabaseGold
          .from("mv_motivos_perda")
          .select("pipeline_nome,motivo,qtd_negocios,valor_perdido")
          .order("qtd_negocios", { ascending: false })
          .limit(5000);
        if (error) throw error;
        const allRows = (data ?? []) as Record<string, unknown>[];
        const filtered = allRows.filter((r) => {
          const pipe = normalize(String(r.pipeline_nome ?? ""));
          if (pipelineScope === "setor_privado") return pipe.includes("privado");
          if (pipelineScope === "setor_publico")
            return pipe.includes("publico") || pipe.includes("public") || pipe.includes("eletric");
          // avantia / consolidado: aceita qualquer linha (geral, avantia, ou pipelines individuais).
          return true;
        });
        const agg = new Map<string, { qtd: number; valor: number }>();
        for (const r of filtered) {
          const motivo = String(r.motivo ?? "Não Informado");
          const cur = agg.get(motivo) ?? { qtd: 0, valor: 0 };
          cur.qtd += Number(r.qtd_negocios ?? 0);
          cur.valor += Number(r.valor_perdido ?? 0);
          agg.set(motivo, cur);
        }
        return Array.from(agg.entries())
          .map(([motivo, v]) => ({
            pipeline_nome: undefined,
            motivo,
            qtd_negocios: v.qtd,
            valor_perdido: v.valor,
            total_perdidos: v.qtd,
            label: motivo,
          }))
          .sort((a, b) => b.qtd_negocios - a.qtd_negocios);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 9) Evolução mensal de vendas fechadas — mv_vendas_mensais_yoy
 *    Gráfico: ano corrente, Jan → mês atual (YTD). Colunas = receita_total.
 *    fetchYoY também alimenta comparativo same-period (9b).
 * ============================================================ */

interface RowYoY {
  pipeline_nome?: string;
  ano: number;
  mes: number;
  qtd_negocios: number;
  receita_total: number;
  receita_recorrente: number;
  receita_unica: number;
}

const fetchYoY = async (pipelineScope: PipelineScope): Promise<RowYoY[]> =>
  guard(async () => {
    const { data, error } = await applyPipelineScope(
      supabaseGold.from("mv_vendas_mensais_yoy").select(MV_VENDAS_MENSAIS_SELECT),
      pipelineScope
    );
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      pipeline_nome: String(r.pipeline_nome ?? ""),
      ano: Number(r.ano),
      mes: Number(r.mes),
      qtd_negocios: Number(r.qtd_negocios ?? 0),
      receita_total: Number(r.receita_total ?? 0),
      receita_recorrente: Number(r.receita_recorrente ?? 0),
      receita_unica: Number(r.receita_unica ?? 0),
    }));
  });

export const useVendasPorMes = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "vendas_por_mes_ytd_v5", pipelineScope],
    queryFn: async (): Promise<VendaMes[]> =>
      guard(async () => {
        const rows = await fetchYoY(pipelineScope);
        const now = new Date();
        const yAtual = now.getUTCFullYear();
        const mesCorte = now.getUTCMonth() + 1; // 1..12
        const out: VendaMes[] = [];
        for (let m = 1; m <= mesCorte; m++) {
          out.push({
            mes: m,
            mes_label: MES_LABEL[m - 1],
            ano: yAtual,
            receita_total: 0,
            receita_recorrente: 0,
            receita_unica: 0,
            qtd_negocios: 0,
          });
        }
        for (const r of rows) {
          if (r.ano !== yAtual || r.mes < 1 || r.mes > mesCorte) continue;
          const idx = r.mes - 1;
          out[idx].receita_total += r.receita_total;
          out[idx].receita_recorrente += r.receita_recorrente;
          out[idx].receita_unica += r.receita_unica;
          out[idx].qtd_negocios += r.qtd_negocios;
        }
        return out;
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Receita do mês corrente vs mesmo mês no ano anterior (mv_vendas_mensais_yoy). */
export interface MesAtualYoY {
  receita_mes_atual: number;
  receita_mes_ano_anterior: number;
  variacao_pct: number;
  qtd_mes_atual: number;
  qtd_mes_ano_anterior: number;
  variacao_qtd_pct: number;
  ticket_mes_atual: number;
  ticket_mes_anterior: number;
  variacao_ticket_pct: number;
  mes: number;
  ano_atual: number;
  ano_anterior: number;
}

export const useMesAtualYoY = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "mes_atual_yoy_v2", pipelineScope],
    queryFn: async (): Promise<MesAtualYoY> =>
      guard(async () => {
        const rows = await fetchYoY(pipelineScope);
        const now = new Date();
        const mes = now.getUTCMonth() + 1;
        const ano_atual = now.getUTCFullYear();
        const ano_anterior = ano_atual - 1;
        let receita_mes_atual = 0;
        let receita_mes_ano_anterior = 0;
        let qtd_mes_atual = 0;
        let qtd_mes_ano_anterior = 0;
        for (const r of rows) {
          if (r.mes !== mes) continue;
          if (r.ano === ano_atual) {
            receita_mes_atual += r.receita_total;
            qtd_mes_atual += r.qtd_negocios;
          }
          if (r.ano === ano_anterior) {
            receita_mes_ano_anterior += r.receita_total;
            qtd_mes_ano_anterior += r.qtd_negocios;
          }
        }
        const variacao_pct = receita_mes_ano_anterior
          ? (receita_mes_atual / receita_mes_ano_anterior - 1) * 100
          : receita_mes_atual > 0
            ? 100
            : 0;
        const variacao_qtd_pct = qtd_mes_ano_anterior
          ? (qtd_mes_atual / qtd_mes_ano_anterior - 1) * 100
          : qtd_mes_atual > 0
            ? 100
            : 0;
        const ticket_mes_atual = qtd_mes_atual ? receita_mes_atual / qtd_mes_atual : 0;
        const ticket_mes_anterior = qtd_mes_ano_anterior ? receita_mes_ano_anterior / qtd_mes_ano_anterior : 0;
        const variacao_ticket_pct = ticket_mes_anterior
          ? (ticket_mes_atual / ticket_mes_anterior - 1) * 100
          : ticket_mes_atual > 0
            ? 100
            : 0;
        return {
          receita_mes_atual,
          receita_mes_ano_anterior,
          variacao_pct,
          qtd_mes_atual,
          qtd_mes_ano_anterior,
          variacao_qtd_pct,
          ticket_mes_atual,
          ticket_mes_anterior,
          variacao_ticket_pct,
          mes,
          ano_atual,
          ano_anterior,
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 9b) Same-period YoY agregado (KPIs comparativos)
 * ============================================================ */

export const useVendasAnoSamePeriod = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "vendas_same_period_yoy_v4", pipelineScope],
    queryFn: async (): Promise<VendaAnoSamePeriod> =>
      guard(async () => {
        const rows = await fetchYoY(pipelineScope);
        const now = new Date();
        const yAtual = now.getUTCFullYear();
        const yAnt = yAtual - 1;
        const mesCorte = now.getUTCMonth() + 1; // 1..12
        let receita_atual = 0,
          receita_anterior = 0,
          qtd_atual = 0,
          qtd_anterior = 0;
        for (const r of rows) {
          if (r.mes > mesCorte) continue;
          if (r.ano === yAtual) {
            receita_atual += r.receita_total;
            qtd_atual += r.qtd_negocios;
          } else if (r.ano === yAnt) {
            receita_anterior += r.receita_total;
            qtd_anterior += r.qtd_negocios;
          }
        }
        const crescimento_pct = receita_anterior
          ? (receita_atual / receita_anterior - 1) * 100
          : 0;
        return {
          ano_atual: yAtual,
          ano_anterior: yAnt,
          mes_corte: mesCorte,
          receita_atual,
          receita_anterior,
          qtd_atual,
          qtd_anterior,
          ticket_atual: qtd_atual ? receita_atual / qtd_atual : 0,
          ticket_anterior: qtd_anterior ? receita_anterior / qtd_anterior : 0,
          crescimento_pct,
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 10) Funil por Etapa / Conversão — usa mv_pipeline_funil
 *     Mostra etapa_nome real + ordem + valor.
 * ============================================================ */

/**
 * Conversão por etapa — consolidada de TODOS os pipelines por padrão.
 * Ordenação SEMPRE pelo fluxo do funil (campo `ordem`), nunca por valor.
 */
export const useFunilStages = (
  pipelineScope: PipelineScope = "avantia",
  pipelineFilter?: string | null
) =>
  useQuery({
    queryKey: ["gold", "funil_stages_consolidado_v8", pipelineScope, pipelineFilter ?? "ALL"],
    queryFn: async (): Promise<FunilStage[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_pipeline_funil").select("*");
        if (error) throw error;
        const allRows = (data ?? []) as RowFunil[];
        let rows = filterFunilRowsByPipelineScope(allRows, pipelineScope, pipelineFilter);
        const pf = normalize(String(pipelineFilter ?? ""));
        const isAudioFocus = pf.includes("audio") || pf.includes("video");
        if (pipelineFilter && !isAudioFocus) {
          rows = rows.filter((r) =>
            pipelineNomeNorm(r).includes(normalize(String(pipelineFilter)))
          );
        }
        const base = rows;

        // Consolida etapas por (ordem + etapa_nome) somando pipelines
        const agg = new Map<
          string,
          {
            etapa: string;
            ordem: number;
            qtd: number;
            valorTotal: number;
          }
        >();
        for (const r of base) {
          const etapa = (r.etapa_nome ?? "—").trim();
          const ordem = Number(r.ordem ?? 0);
          const key = `${ordem}::${etapa.toLowerCase()}`;
          const cur = agg.get(key) ?? {
            etapa,
            ordem,
            qtd: 0,
            valorTotal: 0,
          };
          cur.qtd += Number(r.total_negocios ?? 0);
          cur.valorTotal += Number(r.valor_total ?? 0);
          agg.set(key, cur);
        }

        const consolidated = Array.from(agg.values())
          .filter((r) => r.qtd > 0 || r.valorTotal > 0)
          .sort((a, b) => a.ordem - b.ordem); // SEMPRE pela ordem do funil

        const label = pipelineFilter ?? "Todos os pipelines";
        const totalEntradas = consolidated.reduce((s, r) => s + r.qtd, 0);

        return consolidated.map((r) => ({
          stage_id: `consol-${r.ordem}-${r.etapa}`,
          stage_label: r.etapa,
          pipeline_id: label,
          pipeline_nome: label,
          total: r.qtd,
          ganhos: 0,
          perdidos: 0,
          abertos: r.qtd,
          conversao: totalEntradas ? (r.qtd / totalEntradas) * 100 : 0,
          valor_total: r.valorTotal,
        }));
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 11) Tempo Médio de Fechamento — derivado de mv_ciclo_vendas
 * ============================================================ */

export interface TempoFechamento {
  media_dias: number;
  mediana_dias: number;
  total_amostras: number;
  bucket: { label: string; count: number }[];
}

export const useTempoFechamento = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "tempo_fechamento_v4", pipelineScope],
    queryFn: async (): Promise<TempoFechamento> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold.from("mv_ciclo_vendas").select("pipeline_nome, gestor, dias_medios_fechamento"),
          pipelineScope
        );
        if (error) throw error;

        // Cada gestor traz uma média ponderada por nº de ganhos
        let somaPond = 0;
        let pesos = 0;
        const valoresAbs: number[] = [];
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const dias = Math.abs(Number(r.dias_medios_fechamento ?? 0));
          const peso = Number(r.negocios_ganhos ?? 1);
          if (!peso || !Number.isFinite(dias) || dias > 1500) continue;
          somaPond += dias * peso;
          pesos += peso;
          valoresAbs.push(dias);
        }
        const media = pesos ? somaPond / pesos : 0;
        const sorted = [...valoresAbs].sort((a, b) => a - b);
        const mediana = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

        const buckets = [
          { label: "0–30 d", min: 0, max: 30 },
          { label: "31–60 d", min: 31, max: 60 },
          { label: "61–90 d", min: 61, max: 90 },
          { label: "91–180 d", min: 91, max: 180 },
          { label: ">180 d", min: 181, max: 9999 },
        ];
        return {
          media_dias: media,
          mediana_dias: mediana,
          total_amostras: pesos,
          bucket: buckets.map((b) => ({
            label: b.label,
            count: valoresAbs.filter((d) => d >= b.min && d <= b.max).length,
          })),
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 12) Oportunidades Geradas Mês a Mês (mv_oportunidades_geradas_mes)
 *     Colunas: ano, mes, qtd_gerada, valor_gerado
 * ============================================================ */

export const useOportunidadesGeradas = (
  limitMeses = 12,
  pipelineScope: PipelineScope = "avantia"
) =>
  useQuery({
    queryKey: ["gold", "oportunidades_geradas_v2", limitMeses, pipelineScope],
    queryFn: async (): Promise<OportunidadeGerada[]> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold
            .from("mv_oportunidades_geradas_mes")
            .select("pipeline_nome, ano, mes, qtd_gerada, valor_gerado")
            .order("ano", { ascending: false })
            .order("mes", { ascending: false })
            .limit(limitMeses),
          pipelineScope
        );
        if (error) throw error;
        if (pipelineScope !== "avantia") {
          return ((data ?? []) as Record<string, unknown>[])
            .map((r) => {
              const mes = Number(r.mes);
              const ano = Number(r.ano);
              return {
                pipeline_nome: String(r.pipeline_nome ?? ""),
                ano,
                mes,
                mes_label: `${MES_LABEL[Math.max(0, Math.min(11, mes - 1))]}/${String(ano).slice(2)}`,
                qtd_gerada: Number(r.qtd_gerada ?? 0),
                valor_gerado: Number(r.valor_gerado ?? 0),
              };
            })
            .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
        }
        const agg = new Map<string, { ano: number; mes: number; qtd: number; valor: number }>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const ano = Number(r.ano);
          const mes = Number(r.mes);
          const key = `${ano}-${mes}`;
          const cur = agg.get(key) ?? { ano, mes, qtd: 0, valor: 0 };
          cur.qtd += Number(r.qtd_gerada ?? 0);
          cur.valor += Number(r.valor_gerado ?? 0);
          agg.set(key, cur);
        }
        return Array.from(agg.values())
          .map((r) => ({
            pipeline_nome: undefined,
            ano: r.ano,
            mes: r.mes,
            mes_label: `${MES_LABEL[Math.max(0, Math.min(11, r.mes - 1))]}/${String(r.ano).slice(2)}`,
            qtd_gerada: r.qtd,
            valor_gerado: r.valor,
          }))
          .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 13) Vendas do Mês por Cliente (mv_vendas_mes_atual_clientes)
 *     Colunas: empresa_nome, qtd_negocios, valor_ganho
 * ============================================================ */

export const useVendasMesPorCliente = (limit = 30, pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "vendas_mes_por_cliente_v2", limit, pipelineScope],
    queryFn: async (): Promise<VendaMesCliente[]> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold
            .from("mv_vendas_mes_atual_clientes")
            .select("pipeline_nome, empresa_nome, qtd_negocios, valor_ganho")
            .order("valor_ganho", { ascending: false })
            .limit(limit),
          pipelineScope
        );
        if (error) throw error;
        if (pipelineScope !== "avantia") {
          return ((data ?? []) as Record<string, unknown>[])
            .map((r) => ({
              pipeline_nome: String(r.pipeline_nome ?? ""),
              empresa_nome: String(r.empresa_nome ?? "—"),
              qtd_negocios: Number(r.qtd_negocios ?? 0),
              valor_ganho: Number(r.valor_ganho ?? 0),
            }))
            .sort((a, b) => b.valor_ganho - a.valor_ganho)
            .slice(0, limit);
        }
        const agg = new Map<string, { qtd: number; valor: number }>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const empresa = String(r.empresa_nome ?? "—").trim() || "—";
          const cur = agg.get(empresa) ?? { qtd: 0, valor: 0 };
          cur.qtd += Number(r.qtd_negocios ?? 0);
          cur.valor += Number(r.valor_ganho ?? 0);
          agg.set(empresa, cur);
        }
        return Array.from(agg.entries())
          .map(([empresa_nome, v]) => ({
            pipeline_nome: undefined,
            empresa_nome,
            qtd_negocios: v.qtd,
            valor_ganho: v.valor,
          }))
          .sort((a, b) => b.valor_ganho - a.valor_ganho)
          .slice(0, limit);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ============================================================
 * 14) Performance por Gestor — Propostas Colocadas
 *     mv_vendas_gestor_periodo: gestor_nome, valor_ytd, valor_mtd
 *     Regra: agrega por gestor para evitar duplicidade entre pipelines.
 * ============================================================ */

export const usePropostasPorGestor = (pipelineScope: PipelineScope = "avantia") =>
  useQuery({
    queryKey: ["gold", "propostas_por_gestor_v2", pipelineScope],
    queryFn: async (): Promise<PropostaGestor[]> =>
      guard(async () => {
        const { data, error } = await applyPipelineScope(
          supabaseGold
            .from("mv_vendas_gestor_periodo")
            .select("pipeline_nome, gestor_nome, valor_ytd, valor_mtd")
            .order("valor_ytd", { ascending: false }),
          pipelineScope
        );
        if (error) throw error;
        const agg = new Map<
          string,
          { gestor_nome: string; pipeline_nome?: string; total: number; valor: number }
        >();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const gestorNome = String(r.gestor_nome ?? "—").trim() || "—";
          const key = gestorNome.toLocaleLowerCase("pt-BR");
          const cur = agg.get(key) ?? {
            gestor_nome: gestorNome,
            pipeline_nome: pipelineScope !== "avantia" ? String(r.pipeline_nome ?? "") : undefined,
            total: 0,
            valor: 0,
          };
          cur.total += Number(r.valor_mtd ?? 0) > 0 ? 1 : 0;
          cur.valor += Number(r.valor_ytd ?? 0);
          agg.set(key, cur);
        }
        return Array.from(agg.values())
          .map((v) => ({
            pipeline_nome: v.pipeline_nome,
            gestor_nome: v.gestor_nome,
            total_propostas_ano: v.total,
            valor_propostas_ano: v.valor,
          }))
          .sort((a, b) => b.valor_propostas_ano - a.valor_propostas_ano);
      }),
    staleTime: 5 * 60 * 1000,
  });
