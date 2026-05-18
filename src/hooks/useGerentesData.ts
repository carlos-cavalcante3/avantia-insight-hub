import { useQuery } from "@tanstack/react-query";
import { supabaseGold, isGoldConfigured } from "@/lib/supabaseGold";

const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (!isGoldConfigured) throw new Error("Gold não configurado.");
  return fn();
};

/* ---------- mv_performance_gestor ---------- */

export interface PerformanceGestor {
  gestor_nome: string;
  total_oportunidades_ytd: number;
  valor_propostas_ytd: number;
  negocios_ganhos_ytd: number;
  negocios_perdidos_ytd: number;
  valor_total_ganho_ytd: number;
  dias_medios_fechamento: number;
  win_rate: number;
  ticket_medio: number;
}

export const usePerformanceGestor = () =>
  useQuery({
    queryKey: ["gold", "performance_gestor"],
    queryFn: async (): Promise<PerformanceGestor[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_performance_gestor")
          .select("*");
        if (error) throw error;
        const map = new Map<string, PerformanceGestor>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const nome = String(r.gestor_nome ?? "—").trim() || "—";
          const cur = map.get(nome) ?? {
            gestor_nome: nome,
            total_oportunidades_ytd: 0,
            valor_propostas_ytd: 0,
            negocios_ganhos_ytd: 0,
            negocios_perdidos_ytd: 0,
            valor_total_ganho_ytd: 0,
            dias_medios_fechamento: 0,
            win_rate: 0,
            ticket_medio: 0,
          };
          cur.total_oportunidades_ytd += Number(r.total_oportunidades_ytd ?? 0);
          cur.valor_propostas_ytd += Number(r.valor_propostas_ytd ?? 0);
          cur.negocios_ganhos_ytd += Number(r.negocios_ganhos_ytd ?? 0);
          cur.negocios_perdidos_ytd += Number(r.negocios_perdidos_ytd ?? 0);
          cur.valor_total_ganho_ytd += Number(r.valor_total_ganho_ytd ?? 0);
          const dias = Number(r.dias_medios_fechamento ?? 0);
          if (dias > 0) cur.dias_medios_fechamento = dias;
          map.set(nome, cur);
        }
        return Array.from(map.values()).map((g) => ({
          ...g,
          win_rate:
            g.total_oportunidades_ytd > 0
              ? (g.negocios_ganhos_ytd / g.total_oportunidades_ytd) * 100
              : 0,
          ticket_medio:
            g.negocios_ganhos_ytd > 0
              ? g.valor_total_ganho_ytd / g.negocios_ganhos_ytd
              : 0,
        }));
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Nome para listas Gold (rankings) — coluna canônica `gerente_nome`. */
const gerenteNomeFromRow = (r: Record<string, unknown>): string => {
  const nomeExibicao =
    r?.gerente_nome ?? r?.gestor_nome ?? (r as { name?: unknown }).name ?? "Não Atribuído";
  const s = String(nomeExibicao).trim();
  return s || "Não Atribuído";
};

export interface DealsMovimentacaoRanking {
  responsavel: string;
  qtd: number;
}

/** Ranking de movimentações — `gold.mv_ranking_movimentacoes`. */
export const useRankingMovimentacoesDeals = (limit = 10) =>
  useQuery({
    queryKey: ["gold", "mv_ranking_movimentacoes", limit],
    queryFn: async (): Promise<DealsMovimentacaoRanking[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_ranking_movimentacoes")
          .select("*")
          .order("total_movimentacoes", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          responsavel: gerenteNomeFromRow(r),
          qtd: Number(r.total_movimentacoes ?? r.qtd ?? r.total ?? 0),
        }));
      }),
    staleTime: 5 * 60 * 1000,
  });

export interface VisitasRanking {
  responsavel: string;
  qtd: number;
}

/** Ranking de visitas comerciais — `gold.mv_ranking_visitas`. */
export const useRankingVisitas = (limit = 10) =>
  useQuery({
    queryKey: ["gold", "mv_ranking_visitas", limit],
    queryFn: async (): Promise<VisitasRanking[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_ranking_visitas")
          .select("*")
          .order("total_visitas", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          responsavel: gerenteNomeFromRow(r),
          qtd: Number(r.total_visitas ?? r.qtd ?? r.total ?? 0),
        }));
      }),
    staleTime: 5 * 60 * 1000,
  });

export interface PipelineAbertoGestorRow {
  gestor_nome: string;
  qtd_negocios_abertos: number;
  valor_total_aberto: number;
}

const normalizeNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const textFromRow = (
  row: Record<string, unknown>,
  keys: string[],
  fallback = "Cliente não informado"
): string => {
  for (const key of keys) {
    const value = row[key];
    const text = String(value ?? "").trim();
    if (text && text !== "—" && text !== "-") return text;
  }
  return fallback;
};

/** Pipeline aberto por gestor — `gold.mv_pipeline_aberto_gestor` (sem silver). */
export const usePipelineAbertoPorGestor = (gestorNome: string | null) =>
  useQuery({
    queryKey: ["gold", "mv_pipeline_aberto_gestor", gestorNome],
    enabled: Boolean(gestorNome),
    queryFn: async (): Promise<number> =>
      guard(async () => {
        if (!gestorNome) return 0;
        const { data, error } = await supabaseGold
          .from("mv_pipeline_aberto_gestor")
          .select("*");
        if (error) throw error;
        const rows = (data ?? []) as Record<string, unknown>[];
        const alvo = normalizeNome(gestorNome);
        const row = rows.find((r) => {
          const nome = String(r.gestor_nome ?? r.gerente_nome ?? "").trim();
          return nome && normalizeNome(nome) === alvo;
        });
        return Number(row?.qtd_negocios_abertos ?? 0);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- mv_top_clientes_gestor --------- */

export interface TopClienteGestor {
  gestor_nome: string;
  empresa_nome: string;
  valor_ytd: number;
}

export const useTopClientesGestor = (gestorNome: string | null) =>
  useQuery({
    queryKey: ["gold", "mv_top_clientes_gestor", gestorNome],
    enabled: Boolean(gestorNome),
    queryFn: async (): Promise<TopClienteGestor[]> =>
      guard(async () => {
        if (!gestorNome) return [];
        const { data, error } = await supabaseGold
          .from("mv_top_clientes_gestor")
          .select("*")
          .eq("gestor_nome", gestorNome);
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[])
          .map((r) => ({
            gestor_nome: String(r?.gestor_nome ?? gestorNome),
            empresa_nome: textFromRow(r, [
              "empresa_nome",
              "cliente_nome",
              "conta_nome",
              "nome_empresa",
              "empresa",
              "cliente",
              "razao_social",
              "razao_social_empresa",
            ]),
            valor_ytd: Number(r?.valor_ytd ?? 0),
          }))
          .sort((a, b) => b.valor_ytd - a.valor_ytd);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- mv_curva_evolucao_gestor --------- */

export interface CurvaEvolucaoPonto {
  ano: number;
  mes: number;
  label: string;
  qtd_oportunidades: number;
  qtd_propostas: number;
  qtd_fechados: number;
  qtd_perdidos: number;
}

export const useCurvaEvolucaoGestor = (gestorNome: string | null) =>
  useQuery({
    queryKey: ["gold", "mv_curva_evolucao_gestor", gestorNome],
    enabled: Boolean(gestorNome),
    queryFn: async (): Promise<CurvaEvolucaoPonto[]> =>
      guard(async () => {
        if (!gestorNome) return [];
        const { data, error } = await supabaseGold
          .from("mv_curva_evolucao_gestor")
          .select("*")
          .eq("gestor_nome", gestorNome)
          .order("ano", { ascending: true })
          .order("mes", { ascending: true });
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[]).map((r) => {
          const ano = Number(r?.ano ?? 0);
          const mes = Number(r?.mes ?? 0);
          return {
            ano,
            mes,
            label: `${String(mes).padStart(2, "0")}/${String(ano).slice(-2)}`,
            qtd_oportunidades: Number(r?.qtd_oportunidades ?? 0),
            qtd_propostas: Number(r?.qtd_propostas ?? 0),
            qtd_fechados: Number(r?.qtd_fechados ?? 0),
            qtd_perdidos: Number(r?.qtd_perdidos ?? 0),
          };
        });
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- mv_carteira_clientes --------- */

export interface CarteiraClienteRow {
  cliente_nome: string;
  conta_nome: string;
  oportunidades_2025: number;
  propostas_2025: number;
  oportunidades_atuais: number;
  propostas_atuais: number;
  valor_pipeline: number;
  ultima_visita: string | null;
  contatos_cadastrados: number;
  ultima_movimentacao: string | null;
}

export const useCarteiraClientes = (gestorNome: string | null) =>
  useQuery({
    queryKey: ["gold", "mv_carteira_clientes", gestorNome],
    enabled: Boolean(gestorNome),
    queryFn: async (): Promise<CarteiraClienteRow[]> =>
      guard(async () => {
        if (!gestorNome) return [];
        const { data, error } = await supabaseGold
          .from("mv_carteira_clientes")
          .select("*")
          .eq("gestor_nome", gestorNome);
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[]).map((r) => {
          const cliente = textFromRow(r, [
            "cliente_nome",
            "empresa_nome",
            "conta_nome",
            "nome_empresa",
            "empresa",
            "cliente",
            "razao_social",
            "razao_social_empresa",
          ]);
          const conta = textFromRow(
            r,
            [
              "conta_nome",
              "empresa_nome",
              "cliente_nome",
              "nome_conta",
              "empresa",
              "cliente",
              "razao_social",
            ],
            cliente
          );
          return {
            cliente_nome: cliente,
            conta_nome: conta,
            oportunidades_2025: Number(r?.oportunidades_2025 ?? 0),
            propostas_2025: Number(r?.propostas_2025 ?? 0),
            oportunidades_atuais: Number(r?.oportunidades_atuais ?? 0),
            propostas_atuais: Number(r?.propostas_atuais ?? 0),
            valor_pipeline: Number(r?.valor_pipeline ?? 0),
            ultima_visita: (r?.ultima_visita as string | null) ?? null,
            contatos_cadastrados: Number(r?.contatos_cadastrados ?? 0),
            ultima_movimentacao: (r?.ultima_movimentacao as string | null) ?? null,
          };
        });
      }),
    staleTime: 5 * 60 * 1000,
  });
