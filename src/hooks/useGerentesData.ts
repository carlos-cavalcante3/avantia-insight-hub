import { useQuery } from "@tanstack/react-query";
import { supabaseGold, isGoldConfigured } from "@/lib/supabaseGold";
import {
  CURVA_GLOBAL_GERENTES,
  EQUIPE_PUBLICO,
  EQUIPE_PRIVADO,
  matchNomeInList,
} from "@/lib/gerentes";
import { normalizeName } from "@/lib/metasGerentes";
import { filterCurvaValid, mesLabelCurto } from "@/lib/dateFilters";
import { parseNegociosDetalhados } from "@/lib/parseJsonArray";

const selectedMonthOrUndefined = (selectedMonth?: number) =>
  selectedMonth && selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : undefined;

const rowMonth = (row: Record<string, unknown>) =>
  Number(row.mes ?? row.month ?? row.mes_numero ?? 0);

const rowYear = (row: Record<string, unknown>) =>
  Number(row.ano ?? row.year ?? new Date().getFullYear());

const filterRowsBySelectedMonth = (
  rows: Record<string, unknown>[],
  selectedMonth?: number
): Record<string, unknown>[] => {
  const month = selectedMonthOrUndefined(selectedMonth);
  if (!month || !rows.some((row) => rowMonth(row) > 0)) return rows;
  const currentYear = new Date().getFullYear();
  return rows.filter((row) => rowMonth(row) === month && rowYear(row) === currentYear);
};

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
  prazo_medio_dias: number;
  win_rate: number;
  ticket_medio: number;
  detalhes_vendas_ytd?: VendaDetalheGestor[];
}

export interface VendaDetalheGestor {
  cliente_nome: string;
  valor: number;
}

const detalheVendaGestorFromRow = (row: Record<string, unknown>): VendaDetalheGestor => ({
  cliente_nome: textFromRow(row, [
    "cliente_nome",
    "empresa_nome",
    "cliente",
    "empresa",
    "conta_nome",
    "razao_social",
  ]),
  valor: Number(row.valor ?? row.valor_ganho ?? row.valor_total ?? row.valor_ytd ?? 0),
});

export const usePerformanceGestor = (selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "performance_gestor", selectedMonthOrUndefined(selectedMonth) ?? "ytd"],
    queryFn: async (): Promise<PerformanceGestor[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_performance_gestor")
          .select("*");
        if (error) throw error;
        const rows = filterRowsBySelectedMonth(
          (data ?? []) as Record<string, unknown>[],
          selectedMonth
        );
        const map = new Map<string, PerformanceGestor>();
        for (const r of rows) {
          const nome = String(r.gestor_nome ?? "—").trim() || "—";
          const cur = map.get(nome) ?? {
            gestor_nome: nome,
            total_oportunidades_ytd: 0,
            valor_propostas_ytd: 0,
            negocios_ganhos_ytd: 0,
            negocios_perdidos_ytd: 0,
            valor_total_ganho_ytd: 0,
            dias_medios_fechamento: 0,
            prazo_medio_dias: 0,
            win_rate: 0,
            ticket_medio: 0,
            detalhes_vendas_ytd: [],
          };
          cur.total_oportunidades_ytd += Number(r.total_oportunidades_ytd ?? 0);
          cur.valor_propostas_ytd += Number(r.valor_propostas_ytd ?? 0);
          cur.negocios_ganhos_ytd += Number(r.negocios_ganhos_ytd ?? 0);
          cur.negocios_perdidos_ytd += Number(r.negocios_perdidos_ytd ?? 0);
          cur.valor_total_ganho_ytd += Number(r.valor_total_ganho_ytd ?? 0);
          const dias = Number(r.dias_medios_fechamento ?? r.prazo_medio_dias ?? 0);
          if (dias > 0) cur.dias_medios_fechamento = dias;
          const prazo = Number(r.prazo_medio_dias ?? dias ?? 0);
          if (prazo > 0) cur.prazo_medio_dias = prazo;
          const detalhes = parseNegociosDetalhados(r.detalhes_vendas_ytd);
          cur.detalhes_vendas_ytd?.push(
            ...(detalhes.length
              ? detalhes.map(detalheVendaGestorFromRow)
              : Number(r.valor_total_ganho_ytd ?? 0) > 0
                ? [detalheVendaGestorFromRow(r)]
                : [])
          );
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

const normalizeNome = normalizeName;

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

export interface PipelineAbertoPorGestorRow {
  gestor_nome: string;
  qtd_negocios_abertos: number;
  valor_total_aberto: number;
}

/** Pipeline aberto agregado de todos os gestores — `gold.mv_pipeline_aberto_gestor`. */
export const usePipelineAbertoTodosGestores = () =>
  useQuery({
    queryKey: ["gold", "mv_pipeline_aberto_gestor_todos"],
    queryFn: async (): Promise<PipelineAbertoPorGestorRow[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_pipeline_aberto_gestor")
          .select("*");
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          gestor_nome: String(r.gestor_nome ?? r.gerente_nome ?? "").trim() || "—",
          qtd_negocios_abertos: Number(r.qtd_negocios_abertos ?? 0),
          valor_total_aberto: Number(
            r.valor_total_aberto ?? r.valor_pipeline ?? r.valor_aberto ?? 0
          ),
        }));
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- mv_top_clientes_gestor --------- */

export interface TopClienteGestor {
  gestor_nome: string;
  empresa_nome: string;
  valor_ytd: number;
  valor_mtd: number;
}

export const useTopClientesGestor = (
  gestorNome: string | null,
  selectedMonth?: number,
  isYtdView?: boolean
) =>
  useQuery({
    queryKey: [
      "gold",
      "top_clientes_gestor_v2",
      gestorNome,
      isYtdView ? "ytd" : selectedMonthOrUndefined(selectedMonth) ?? new Date().getMonth() + 1,
    ],
    enabled: Boolean(gestorNome),
    queryFn: async (): Promise<TopClienteGestor[]> =>
      guard(async () => {
        if (!gestorNome) return [];
        const gestorNorm = normalizeName(gestorNome);
        const currentYear = new Date().getFullYear();
        const month = selectedMonthOrUndefined(selectedMonth) ?? new Date().getMonth() + 1;

        if (isYtdView) {
          const { data, error } = await supabaseGold
            .from("mv_top_clientes_gestor")
            .select("*");
          if (error) throw error;
          return ((data ?? []) as Record<string, unknown>[])
            .filter((r) => normalizeName(String(r.gestor_nome ?? "")) === gestorNorm)
            .map((r) => ({
              gestor_nome: String(r.gestor_nome ?? gestorNome).trim() || gestorNome,
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
              valor_ytd: Number(r.valor_ytd ?? r.valor ?? r.valor_ganho ?? r.valor_total ?? 0),
              valor_mtd: 0,
            }))
            .filter((r) => r.valor_ytd > 0)
            .sort((a, b) => b.valor_ytd - a.valor_ytd);
        }

        const { data, error } = await supabaseGold
          .from("mv_top_clientes_periodo")
          .select("*");
        if (error) throw error;
        const agg = new Map<string, TopClienteGestor>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          if (normalizeName(String(r.gestor_nome ?? "")) !== gestorNorm) continue;
          if (Number(r.ano ?? currentYear) !== currentYear) continue;
          if (Number(r.mes ?? 0) !== month) continue;
          const empresaNome = textFromRow(r, [
            "empresa_nome",
            "cliente_nome",
            "conta_nome",
            "nome_empresa",
            "empresa",
            "cliente",
            "razao_social",
            "razao_social_empresa",
          ]);
          const cur = agg.get(empresaNome) ?? {
            gestor_nome: String(r.gestor_nome ?? gestorNome).trim() || gestorNome,
            empresa_nome: empresaNome,
            valor_ytd: 0,
            valor_mtd: 0,
          };
          cur.valor_mtd += Number(r.valor ?? r.valor_ganho ?? r.valor_total ?? 0);
          agg.set(empresaNome, cur);
        }
        return Array.from(agg.values())
          .filter((r) => r.valor_mtd > 0)
          .sort((a, b) => b.valor_mtd - a.valor_mtd);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- mv_curva_evolucao_gestor --------- */

export interface CurvaEvolucaoPonto {
  ano: number;
  mes: number;
  label: string;
  qtd_geradas: number;
  qtd_oportunidades: number;
  qtd_propostas: number;
  qtd_fechados: number;
  qtd_perdidas: number;
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
          .from("mv_curva_conversao_mensal")
          .select("*")
          .eq("gestor_nome", gestorNome)
          .order("ano", { ascending: true })
          .order("mes", { ascending: true });
        if (error) throw error;
        const pontos = ((data ?? []) as Record<string, unknown>[]).map((r) => {
          const ano = Number(r?.ano ?? 0);
          const mes = Number(r?.mes ?? 0);
          const qtdGeradas = Number(r?.qtd_geradas ?? r?.qtd_oportunidades ?? 0);
          const qtdPerdidas = Number(r?.qtd_perdidas ?? r?.qtd_perdidos ?? 0);
          return {
            ano,
            mes,
            label: mesLabelCurto(ano, mes),
            qtd_geradas: qtdGeradas,
            qtd_oportunidades: qtdGeradas,
            qtd_propostas: Number(r?.qtd_propostas ?? 0),
            qtd_fechados: Number(r?.qtd_fechados ?? 0),
            qtd_perdidas: qtdPerdidas,
            qtd_perdidos: qtdPerdidas,
          };
        });
        return filterCurvaValid(pontos);
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- Curva GLOBAL (todos gerentes) ---------
 * Agrega `mv_curva_evolucao_gestor` por (ano, mês) somando `qtd_oportunidades`.
 * Para o gráfico global, exibimos APENAS a linha de Oportunidades Geradas. */
export interface CurvaGlobalPonto {
  ano: number;
  mes: number;
  label: string;
  qtd_oportunidades: number;
  [gestorNome: string]: string | number;
}

export type EquipeFiltro = "global" | "publico" | "privado";

const canonicalGestorLabel = (gestorNome: string, equipeList: string[] | null): string => {
  if (!equipeList?.length) return gestorNome;
  const match = equipeList.find((m) => matchNomeInList(gestorNome, [m]));
  return match ?? gestorNome;
};

const gestorNaEquipe = (
  gestorNome: string,
  equipeFiltro: EquipeFiltro
): boolean => {
  if (!matchNomeInList(gestorNome, CURVA_GLOBAL_GERENTES)) return false;
  if (equipeFiltro === "global") return true;
  const equipeList = equipeFiltro === "publico" ? EQUIPE_PUBLICO : EQUIPE_PRIVADO;
  return matchNomeInList(gestorNome, equipeList);
};

export const useCurvaEvolucaoGlobal = (equipeFiltro: EquipeFiltro = "global") =>
  useQuery({
    queryKey: ["gold", "mv_oportunidades_geradas_mes_global_curve", equipeFiltro],
    queryFn: async (): Promise<CurvaGlobalPonto[]> =>
      guard(async () => {
        // Fetch all rows with `*` (mirrors useOportunidadesGeradasMes that already works
        // in AnaliseGerentesTab). Using `*` avoids 400 errors when the view does not
        // expose a specific column name (e.g. qtd_geradas vs qtd_oportunidades).
        const { data, error } = await supabaseGold
          .from("mv_oportunidades_geradas_mes")
          .select("*");
        if (error) throw error;

        const equipeList =
          equipeFiltro === "publico"
            ? EQUIPE_PUBLICO
            : equipeFiltro === "privado"
              ? EQUIPE_PRIVADO
              : null;

        const map = new Map<string, CurvaGlobalPonto>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          const gestorNome = String(
            r.gestor_nome ?? r.gestor ?? r.responsavel ?? r.nome ?? ""
          ).trim();
          if (!gestorNome) continue;
          if (!gestorNaEquipe(gestorNome, equipeFiltro)) continue;

          const ano = Number(r.ano ?? r.year ?? 0);
          const mes = Number(r.mes ?? r.month ?? r.mes_numero ?? 0);
          if (!ano || !mes) continue;

          const qtd = Number(
            r.qtd_geradas ?? r.qtd_oportunidades ?? r.qtd ?? r.total ?? 0
          );
          if (!Number.isFinite(qtd)) continue;

          const labelKey = canonicalGestorLabel(gestorNome, equipeList);
          const key = `${ano}-${String(mes).padStart(2, "0")}`;
          const cur = map.get(key) ?? {
            ano,
            mes,
            label: mesLabelCurto(ano, mes),
            qtd_oportunidades: 0,
          };
          cur.qtd_oportunidades += qtd;
          cur[labelKey] = Number(cur[labelKey] ?? 0) + qtd;
          map.set(key, cur);
        }

        return filterCurvaValid(
          Array.from(map.values()).sort((a, b) =>
            a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
          )
        );
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------- mv_previsao_vendas_mensal --------- */

export interface PrevisaoVendasMensalRow {
  gestor_nome: string;
  ano: number;
  mes: number;
  valor_previsto: number;
}

/** Previsão de vendas mensal por gestor — `gold.mv_previsao_vendas_mensal`.
 *  Retorna um Map nome-normalizado → valor previsto do mês/ano selecionado. */
export const usePrevisaoVendasMensal = (selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "mv_previsao_vendas_mensal", selectedMonthOrUndefined(selectedMonth) ?? new Date().getMonth() + 1],
    queryFn: async (): Promise<Map<string, number>> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_previsao_vendas_mensal")
          .select("*");
        if (error) throw error;
        const month = selectedMonthOrUndefined(selectedMonth) ?? new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const map = new Map<string, number>();
        for (const r of (data ?? []) as Record<string, unknown>[]) {
          if (Number(r.ano ?? year) !== year) continue;
          if (Number(r.mes ?? 0) !== month) continue;
          const nome = String(r.gestor_nome ?? r.gerente_nome ?? "").trim();
          if (!nome) continue;
          const key = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const valor = Number(r.valor_previsto ?? r.previsao ?? r.valor ?? 0);
          map.set(key, (map.get(key) ?? 0) + valor);
        }
        return map;
      }),
    staleTime: 5 * 60 * 1000,
  });


/* --------- mv_oportunidades_geradas_mes --------- */

export interface OportunidadeGeradaMesGestor {
  ano: number;
  mes: number;
  label: string;
  qtd_geradas: number;
  qtd_oportunidades: number;
  valor_potencial: number;
  detalhes_oportunidades?: OportunidadeDetalhe[];
}

export interface OportunidadeDetalhe {
  cliente_nome: string;
  valor: number | null;
}

const oportunidadeDetalheFromRow = (row: Record<string, unknown>): OportunidadeDetalhe => {
  const rawValor = row.valor ?? row.valor_potencial ?? row.valor_estimado ?? row.valor_total;
  const valor = rawValor == null || rawValor === "" ? null : Number(rawValor);
  return {
    cliente_nome: textFromRow(row, [
      "cliente_nome",
      "empresa_nome",
      "cliente",
      "empresa",
      "conta_nome",
      "razao_social",
    ]),
    valor: Number.isFinite(valor as number) ? (valor as number) : null,
  };
};

export const useOportunidadesGeradasMes = (gestorNome: string | null) =>
  useQuery({
    queryKey: ["gold", "mv_oportunidades_geradas_mes", gestorNome],
    enabled: Boolean(gestorNome),
    queryFn: async (): Promise<OportunidadeGeradaMesGestor[]> =>
      guard(async () => {
        if (!gestorNome) return [];
        const { data, error } = await supabaseGold
          .from("mv_oportunidades_geradas_mes")
          .select("*")
          .eq("gestor_nome", gestorNome)
          .order("ano", { ascending: true })
          .order("mes", { ascending: true });
        if (error) throw error;
        const pontos = ((data ?? []) as Record<string, unknown>[]).map((r) => {
          const ano = Number(r.ano ?? 0);
          const mes = Number(r.mes ?? 0);
          return {
            ano,
            mes,
            label: mesLabelCurto(ano, mes),
            qtd_geradas: Number(r.qtd_geradas ?? r.qtd_oportunidades ?? 0),
            qtd_oportunidades: Number(r.qtd_oportunidades ?? r.qtd_geradas ?? 0),
            valor_potencial: Number(r.valor_potencial ?? 0),
            detalhes_oportunidades: parseNegociosDetalhados(r.detalhes_oportunidades).map(
              oportunidadeDetalheFromRow
            ),
          };
        });
        return filterCurvaValid(pontos);
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
