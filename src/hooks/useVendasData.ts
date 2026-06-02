import { useQuery } from "@tanstack/react-query";
import { supabaseGold, isGoldConfigured } from "@/lib/supabaseGold";
import {
  isPipelineNomeAvantiaGeral,
  normalizePipelineNome,
} from "@/lib/pipelineAvantiaGeral";
import { parseNegociosDetalhados } from "@/lib/parseJsonArray";

export type Sector = "avantia" | "publico" | "privado" | "audio_video";

import type { PipelineScope } from "@/hooks/useDashboardData";

export { isPipelineNomeAvantiaGeral } from "@/lib/pipelineAvantiaGeral";

/** Escopo de pipeline Gold alinhado ao setor da aba Vendas (áudio/vídeo segue Avantia). */
export const sectorToPipelineScope = (sector: Sector): PipelineScope => {
  if (sector === "publico") return "setor_publico";
  if (sector === "privado") return "setor_privado";
  return "avantia";
};

export const SECTOR_LABEL: Record<Sector, string> = {
  avantia: "Avantia (Geral)",
  publico: "Público",
  privado: "Privado",
  audio_video: "Áudio e Vídeo",
};

const matchSector = (pipelineNome: string | null | undefined, sector: Sector): boolean => {
  const n = normalizePipelineNome(String(pipelineNome ?? ""));
  switch (sector) {
    case "avantia":
      return isPipelineNomeAvantiaGeral(pipelineNome);
    case "publico":
      return n.includes("publico") || n.includes("public") || n.includes("eletric");
    case "privado":
      return n.includes("privado") && n.includes("venda");
    case "audio_video":
      return n.includes("audio") || n.includes("video");
  }
};

const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (!isGoldConfigured) throw new Error("Gold não configurado.");
  return fn();
};

/* ----------------------------- KPIs ----------------------------- */

export interface KpisAggregated {
  valor_ytd: number;
  qtd_ytd: number;
  ticket_ytd: number;
  win_rate_ytd: number;
  valor_mtd: number;
  qtd_mtd: number;
  ticket_mtd: number;
  win_rate_mtd: number;
  /** Média ponderada por qtd_ganhos_ytd; null se a view não expuser a coluna. */
  win_rate_ytd_ano_anterior: number | null;
  win_rate_mtd_ano_anterior: number | null;
}

/** Consolida várias linhas de `mv_kpis_gerais` (ex.: visão Geral = Privado + Público + Áudio).
 *  IMPORTANTE: somamos os números brutos (qtd_ganhos / qtd_oportunidades) e recalculamos
 *  a taxa de conversão no JS. Nunca somar ou tirar média de porcentagens. */
const safePct = (num: number, den: number): number => {
  if (!den || den <= 0) return 0;
  const v = (num / den) * 100;
  return Number.isFinite(v) ? v : 0;
};

const oportunidadesYtdFromRow = (r: Record<string, unknown>): number =>
  Number(
    r.oportunidades_geradas_ytd ??
      r.qtd_oportunidades_geradas_ytd ??
      r.total_oportunidades_ytd ??
      r.qtd_oportunidades_ytd ??
      r.total_propostas_ytd ??
      0
  );

const oportunidadesMtdFromRow = (r: Record<string, unknown>): number =>
  Number(
    r.oportunidades_geradas_mtd ??
      r.qtd_oportunidades_geradas_mtd ??
      r.total_oportunidades_mtd ??
      r.qtd_oportunidades_mtd ??
      r.total_propostas_mtd ??
      0
  );

/** Consolida várias linhas de `mv_kpis_gerais` somando números brutos e recalculando taxa no JS.
 *  Nunca somar ou tirar média de porcentagens. Usa `total_propostas_*` (campo correto da view)
 *  com fallback para `qtd_oportunidades_*`. */
const consolidateKpiSubset = (rows: Record<string, unknown>[]): Record<string, unknown> => {
  let valor_ytd = 0,
    qtd_ganhos_ytd = 0,
    qtd_oport_ytd = 0,
    valor_mtd = 0,
    qtd_ganhos_mtd = 0,
    qtd_oport_mtd = 0;
  for (const r of rows) {
    valor_ytd += Number(r.valor_ganho_ytd ?? r.valor_total_ganho_ytd ?? 0);
    qtd_ganhos_ytd += Number(r.qtd_ganhos_ytd ?? r.total_negocios_ganhos_ytd ?? 0);
    qtd_oport_ytd += oportunidadesYtdFromRow(r);
    valor_mtd += Number(r.valor_ganho_mtd ?? 0);
    qtd_ganhos_mtd += Number(r.qtd_ganhos_mtd ?? 0);
    qtd_oport_mtd += oportunidadesMtdFromRow(r);
  }
  return {
    valor_ganho_ytd: valor_ytd,
    qtd_ganhos_ytd,
    qtd_oportunidades_ytd: qtd_oport_ytd,
    total_propostas_ytd: qtd_oport_ytd,
    taxa_conversao_ytd: safePct(qtd_ganhos_ytd, qtd_oport_ytd),
    valor_ganho_mtd: valor_mtd,
    qtd_ganhos_mtd,
    qtd_oportunidades_mtd: qtd_oport_mtd,
    total_propostas_mtd: qtd_oport_mtd,
    taxa_conversao_mtd: safePct(qtd_ganhos_mtd, qtd_oport_mtd),
  };
};

const findKpiRowForSector = (
  rows: Record<string, unknown>[],
  sector: Sector
): Record<string, unknown> | null => {
  if (!rows.length) return null;
  if (sector === "avantia") {
    // Avantia (Geral): sem filtro manual — soma TODAS as linhas que a view retornar.
    return consolidateKpiSubset(rows);
  }
  const found = rows.find((row) => {
    const n = normalizePipelineNome(String(row.pipeline_nome ?? ""));
    if (sector === "privado") return n.includes("privado") && n.includes("venda");
    if (sector === "publico")
      return (
        (n.includes("publico") || n.includes("public") || n.includes("eletric")) && n.includes("venda")
      );
    if (sector === "audio_video") return n.includes("audio") || n.includes("video");
    return false;
  });
  return found ?? rows[0] ?? null;
};

const rowToKpisAggregated = (row: Record<string, unknown> | null): KpisAggregated => {
  if (!row) {
    return {
      valor_ytd: 0,
      qtd_ytd: 0,
      ticket_ytd: 0,
      win_rate_ytd: 0,
      valor_mtd: 0,
      qtd_mtd: 0,
      ticket_mtd: 0,
      win_rate_mtd: 0,
      win_rate_ytd_ano_anterior: null,
      win_rate_mtd_ano_anterior: null,
    };
  }
  const valor_ytd = Number(row.valor_ganho_ytd ?? row.valor_total_ganho_ytd ?? 0);
  const qtd_ytd = Number(row.qtd_ganhos_ytd ?? row.total_negocios_ganhos_ytd ?? 0);
  const valor_mtd = Number(row.valor_ganho_mtd ?? 0);
  const qtd_mtd = Number(row.qtd_ganhos_mtd ?? 0);
  // Recalcula sempre a partir dos brutos para garantir integridade (evita NaN/Infinity).
  const oport_ytd = oportunidadesYtdFromRow(row);
  const oport_mtd = oportunidadesMtdFromRow(row);
  const win_rate_ytd = Number(
    row.taxa_conversao_ytd ?? row.taxa_conversao ?? safePct(qtd_ytd, oport_ytd)
  );
  const win_rate_mtd = Number(
    row.taxa_conversao_mtd ?? safePct(qtd_mtd, oport_mtd)
  );
  return {
    valor_ytd,
    qtd_ytd,
    ticket_ytd: qtd_ytd ? valor_ytd / qtd_ytd : 0,
    win_rate_ytd,
    valor_mtd,
    qtd_mtd,
    ticket_mtd: qtd_mtd ? valor_mtd / qtd_mtd : 0,
    win_rate_mtd,
    win_rate_ytd_ano_anterior: null,
    win_rate_mtd_ano_anterior: null,
  };
};

const selectedMonthOrCurrent = (selectedMonth?: number) => {
  const current = new Date().getMonth() + 1;
  return selectedMonth && selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : current;
};

const applySelectedMonthToKpis = (
  base: KpisAggregated,
  rows: Record<string, unknown>[],
  oportData: Record<string, unknown>[],
  sector: Sector,
  selectedMonth?: number
): KpisAggregated => {
  const month = selectedMonthOrCurrent(selectedMonth);
  const year = new Date().getFullYear();
  const ytdVendas = rows.filter(
    (r) =>
      Number(r.ano) === year &&
      Number(r.mes) <= month &&
      matchSector(String(r.pipeline_nome), sector)
  );
  const ytdOport = oportData.filter(
    (r) =>
      Number(r.ano) === year &&
      Number(r.mes) <= month &&
      matchSector(String(r.pipeline_nome), sector)
  );
  const valor_ytd = ytdVendas.reduce((s, r) => s + Number(r.receita_total ?? 0), 0);
  const qtd_ytd = ytdVendas.reduce((s, r) => s + Number(r.qtd_negocios ?? 0), 0);
  const oport_ytd = ytdOport.reduce((s, r) => s + Number(r.qtd_geradas ?? 0), 0);

  const monthRows = ytdVendas.filter((r) => Number(r.mes) === month);
  const valor_mtd = monthRows.reduce((sum, r) => sum + Number(r.receita_total ?? 0), 0);
  const qtd_mtd = monthRows.reduce((sum, r) => sum + Number(r.qtd_negocios ?? 0), 0);
  const oport_mtd = ytdOport
    .filter((r) => Number(r.mes) === month)
    .reduce((sum, r) => sum + Number(r.qtd_geradas ?? 0), 0);
  return {
    ...base,
    valor_ytd,
    qtd_ytd,
    ticket_ytd: qtd_ytd > 0 ? valor_ytd / qtd_ytd : 0,
    win_rate_ytd: oport_ytd > 0 ? (qtd_ytd / oport_ytd) * 100 : 0,
    valor_mtd,
    qtd_mtd,
    ticket_mtd: qtd_mtd > 0 ? valor_mtd / qtd_mtd : 0,
    win_rate_mtd: oport_mtd > 0 ? (qtd_mtd / oport_mtd) * 100 : 0,
  };
};

/* --------------- Composição mensal (única + recorrente) --------------- */

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface ComposicaoMesPoint {
  label: string;
  unica: number;
  recorrente: number;
}

export const useVendasComposicaoMesAMes = (sector: Sector = "avantia", selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "vendas_composicao_mes_v1", sector, selectedMonthOrCurrent(selectedMonth)],
    queryFn: async (): Promise<ComposicaoMesPoint[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_vendas_mensais_yoy").select("*");
        if (error) throw error;
        const year = new Date().getFullYear();
        const month = selectedMonthOrCurrent(selectedMonth);
        const rows = ((data ?? []) as Record<string, unknown>[]).filter(
          (r) =>
            Number(r.ano) === year &&
            Number(r.mes) >= 1 &&
            Number(r.mes) <= month &&
            matchSector(String(r.pipeline_nome ?? ""), sector)
        );
        const agg = new Map<number, ComposicaoMesPoint>();
        for (let m = 1; m <= month; m++) {
          agg.set(m, { label: MONTH_SHORT[m - 1], unica: 0, recorrente: 0 });
        }
        for (const r of rows) {
          const m = Number(r.mes);
          const cur = agg.get(m);
          if (!cur) continue;
          cur.unica += Number(r.receita_unica ?? 0);
          cur.recorrente += Number(r.receita_recorrente ?? 0);
        }
        return Array.from(agg.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v);
      }),
    staleTime: 5 * 60 * 1000,
  });


export const useKpisVendas = (sector: Sector = "avantia", selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "vendas_kpis_v8", sector, selectedMonthOrCurrent(selectedMonth)],
    queryFn: async (): Promise<KpisAggregated> =>
      guard(async () => {
        const [
          { data, error },
          { data: monthlyData, error: monthlyError },
          { data: oportData, error: oportError },
        ] = await Promise.all([
          supabaseGold.from("mv_kpis_gerais").select("*"),
          supabaseGold.from("mv_vendas_mensais_yoy").select("*"),
          supabaseGold.from("mv_curva_conversao_mensal").select("*"),
        ]);
        if (error) throw error;
        if (monthlyError) throw monthlyError;
        if (oportError) throw oportError;
        const rows = (data ?? []) as Record<string, unknown>[];
        return applySelectedMonthToKpis(
          rowToKpisAggregated(findKpiRowForSector(rows, sector)),
          (monthlyData ?? []) as Record<string, unknown>[],
          (oportData ?? []) as Record<string, unknown>[],
          sector,
          selectedMonth
        );
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Busca KPIs por TODOS os setores numa só query (pra alimentar metas) */
export const useKpisPorSetor = (selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "vendas_kpis_setor_v8", selectedMonthOrCurrent(selectedMonth)],
    queryFn: async (): Promise<Record<Sector, KpisAggregated>> =>
      guard(async () => {
        const [
          { data, error },
          { data: monthlyData, error: monthlyError },
          { data: oportData, error: oportError },
        ] = await Promise.all([
          supabaseGold.from("mv_kpis_gerais").select("*"),
          supabaseGold.from("mv_vendas_mensais_yoy").select("*"),
          supabaseGold.from("mv_curva_conversao_mensal").select("*"),
        ]);
        if (error) throw error;
        if (monthlyError) throw monthlyError;
        if (oportError) throw oportError;
        const rows = (data ?? []) as Record<string, unknown>[];
        const monthlyRows = (monthlyData ?? []) as Record<string, unknown>[];
        const oportRows = (oportData ?? []) as Record<string, unknown>[];
        return {
          avantia: applySelectedMonthToKpis(rowToKpisAggregated(findKpiRowForSector(rows, "avantia")), monthlyRows, oportRows, "avantia", selectedMonth),
          publico: applySelectedMonthToKpis(rowToKpisAggregated(findKpiRowForSector(rows, "publico")), monthlyRows, oportRows, "publico", selectedMonth),
          privado: applySelectedMonthToKpis(rowToKpisAggregated(findKpiRowForSector(rows, "privado")), monthlyRows, oportRows, "privado", selectedMonth),
          audio_video: applySelectedMonthToKpis(rowToKpisAggregated(findKpiRowForSector(rows, "audio_video")), monthlyRows, oportRows, "audio_video", selectedMonth),
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Referência fixa 2025 a partir de `mv_vendas_mensais_yoy` (YTD/MTD alinhados ao corte do ano corrente). */
const REF_VENDAS_ANO = 2025;

export interface ReferenciasVendasAno2025 {
  refYear: number;
  receitaYtd2025: number;
  qtdYtd2025: number;
  ticketYtd2025: number;
  receitaMtd2025: number;
  qtdMtd2025: number;
  ticketMtd2025: number;
}

export const useReferenciasVendasAno2025 = (sector: Sector, selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "refs_vendas_yoy_2025", sector, selectedMonthOrCurrent(selectedMonth)],
    queryFn: async (): Promise<ReferenciasVendasAno2025> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_vendas_mensais_yoy").select("*");
        if (error) throw error;
        const now = new Date();
        const mesCorte = selectedMonthOrCurrent(selectedMonth);
        const rows = ((data ?? []) as Record<string, unknown>[]).filter(
          (r) => Number(r.ano) === REF_VENDAS_ANO && matchSector(String(r.pipeline_nome), sector)
        );
        let receitaYtd = 0,
          qtdYtd = 0,
          receitaMtd = 0,
          qtdMtd = 0;
        for (const r of rows) {
          const mes = Number(r.mes);
          if (mes < 1 || mes > mesCorte) continue;
          receitaYtd += Number(r.receita_total ?? 0);
          qtdYtd += Number(r.qtd_negocios ?? 0);
          if (mes === mesCorte) {
            receitaMtd += Number(r.receita_total ?? 0);
            qtdMtd += Number(r.qtd_negocios ?? 0);
          }
        }
        return {
          refYear: REF_VENDAS_ANO,
          receitaYtd2025: receitaYtd,
          qtdYtd2025: qtdYtd,
          ticketYtd2025: qtdYtd ? receitaYtd / qtdYtd : 0,
          receitaMtd2025: receitaMtd,
          qtdMtd2025: qtdMtd,
          ticketMtd2025: qtdMtd ? receitaMtd / qtdMtd : 0,
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------------------------- Pipeline --------------------------- */

export interface PipelinePonderado {
  valor_pipeline_bruto: number;
  valor_pipeline_ponderado: number;
  qtd_aberto: number;
}

export const usePipelinePonderado = (sector: Sector = "avantia") =>
  useQuery({
    queryKey: ["gold", "pipeline_ponderado_v2", sector],
    queryFn: async (): Promise<PipelinePonderado> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_pipeline_ponderado")
          .select("pipeline_nome, qtd_aberto, valor_pipeline_bruto, valor_pipeline_ponderado");
        if (error) throw error;
        const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((r) =>
          matchSector(r.pipeline_nome as string, sector)
        );
        return rows.reduce<PipelinePonderado>(
          (acc: PipelinePonderado, r: Record<string, unknown>) => ({
            valor_pipeline_bruto: acc.valor_pipeline_bruto + Number(r.valor_pipeline_bruto ?? 0),
            valor_pipeline_ponderado:
              acc.valor_pipeline_ponderado + Number(r.valor_pipeline_ponderado ?? 0),
            qtd_aberto: acc.qtd_aberto + Number(r.qtd_aberto ?? 0),
          }),
          { valor_pipeline_bruto: 0, valor_pipeline_ponderado: 0, qtd_aberto: 0 }
        );
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ------------------------- Top Clientes ------------------------- */

export interface ClientePeriodo {
  empresa_nome: string;
  valor_ytd: number;
  valor_mtd: number;
}

export const useTopClientesPeriodo = (sector: Sector = "avantia", limit = 15, selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "top_clientes_periodo_v2", sector, limit, selectedMonthOrCurrent(selectedMonth)],
    queryFn: async (): Promise<{ ytd: ClientePeriodo[]; mtd: ClientePeriodo[] }> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_top_clientes_periodo")
          .select("*");
        if (error) throw error;
        const currentYear = new Date().getFullYear();
        const month = selectedMonthOrCurrent(selectedMonth);
        const filtered = ((data ?? []) as Record<string, unknown>[]).filter((r) =>
          Number(r.ano ?? currentYear) === currentYear &&
          matchSector(String(r.pipeline_nome ?? ""), sector)
        );
        const agg = new Map<string, ClientePeriodo>();
        for (const r of filtered) {
          const rowMonth = Number(r.mes ?? 0);
          if (rowMonth < 1 || rowMonth > month) continue;
          const key = String(
            r.empresa_nome ?? r.cliente_nome ?? r.conta_nome ?? r.cliente ?? "—"
          ).trim() || "—";
          const cur = agg.get(key) ?? { empresa_nome: key, valor_ytd: 0, valor_mtd: 0 };
          const valor = Number(r.valor ?? r.valor_ganho ?? r.valor_total ?? 0);
          cur.valor_ytd += valor;
          if (rowMonth === month) cur.valor_mtd += valor;
          agg.set(key, cur);
        }
        const all = Array.from(agg.values());
        return {
          ytd: [...all].filter((r) => r.valor_ytd > 0).sort((a, b) => b.valor_ytd - a.valor_ytd).slice(0, limit),
          mtd: [...all].filter((r) => r.valor_mtd > 0).sort((a, b) => b.valor_mtd - a.valor_mtd).slice(0, limit),
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* ----------------------- Vendas por Gestor ---------------------- */

export interface GestorPeriodo {
  gestor_nome: string;
  valor_ytd: number;
  valor_mtd: number;
  qtd_ytd: number;
  qtd_mtd: number;
  detalhes_vendas_ytd?: VendaDetalhe[];
  detalhes_vendas_mtd?: VendaDetalhe[];
}

export interface VendaDetalhe {
  nome: string;
  cliente: string;
  gerente: string;
  valor: number;
}

const asArray = (value: unknown): Record<string, unknown>[] => parseNegociosDetalhados(value);

const detalheVendaFromRow = (
  row: Record<string, unknown>,
  fallbackGerente: string,
  fallbackValor: number
): VendaDetalhe => ({
  nome: String(row.negocio_nome ?? row.nome_negocio ?? row.negocio ?? row.titulo ?? row.cliente_nome ?? "Negocio"),
  cliente: String(row.cliente_nome ?? row.empresa_nome ?? row.cliente ?? row.empresa ?? "Cliente nao informado"),
  gerente: String(row.gestor_nome ?? row.gerente_nome ?? row.gerente ?? fallbackGerente),
  valor: Number(row.valor ?? row.valor_ganho ?? row.valor_total ?? fallbackValor ?? 0),
});

export const useVendasGestorPeriodo = (sector: Sector = "avantia", selectedMonth?: number) =>
  useQuery({
    queryKey: ["gold", "vendas_gestor_periodo_v2", sector, selectedMonthOrCurrent(selectedMonth)],
    queryFn: async (): Promise<{ ytd: GestorPeriodo[]; mtd: GestorPeriodo[] }> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_vendas_gestor_periodo")
            .select("*");
        if (error) throw error;
        const currentYear = new Date().getFullYear();
        const month = selectedMonthOrCurrent(selectedMonth);
        const filtered = ((data ?? []) as Record<string, unknown>[]).filter((r) =>
          Number(r.ano ?? currentYear) === currentYear &&
          matchSector(String(r.pipeline_nome ?? ""), sector)
        );
        const agg = new Map<string, GestorPeriodo>();
        for (const r of filtered) {
          const key = String(r.gestor_nome ?? "—").trim() || "—";
          const rowMonth = Number(r.mes ?? 0);
          const valor = Number(r.valor ?? r.valor_ganho ?? r.valor_total ?? r.valor_ytd ?? 0);
          const cur = agg.get(key) ?? {
            gestor_nome: key,
            valor_ytd: 0,
            valor_mtd: 0,
            qtd_ytd: 0,
            qtd_mtd: 0,
            detalhes_vendas_ytd: [],
            detalhes_vendas_mtd: [],
          };
          const detalhes = asArray(
            r.detalhes_vendas ?? r.detalhes_vendas_ytd ?? r.detalhes_vendas_mtd
          );
          const detalhesLinha = detalhes.length
            ? detalhes.map((d) => detalheVendaFromRow(d, key, valor))
            : valor > 0
              ? [detalheVendaFromRow(r, key, valor)]
              : [];

          if (rowMonth > 0 && rowMonth <= month) {
            cur.valor_ytd += valor;
            cur.qtd_ytd += Number(r.qtd_negocios ?? 0);
            cur.detalhes_vendas_ytd?.push(...detalhesLinha);
          }
          if (rowMonth === month) {
            cur.valor_mtd += valor;
            cur.qtd_mtd += Number(r.qtd_negocios ?? 0);
            cur.detalhes_vendas_mtd?.push(...detalhesLinha);
          }
          agg.set(key, cur);
        }
        const all = Array.from(agg.values());
        return {
          ytd: all.filter((r) => r.valor_ytd > 0).sort((a, b) => b.valor_ytd - a.valor_ytd),
          mtd: all.filter((r) => r.valor_mtd > 0).sort((a, b) => b.valor_mtd - a.valor_mtd),
        };
      }),
    staleTime: 5 * 60 * 1000,
  });

/* --------------------------- Metas ----------------------------- */

/** Metas anuais por setor. */
export const METAS_ANUAIS: Record<Sector, number> = {
  avantia: 130_000_000,
  publico: 55_000_000,
  privado: 60_000_000,
  audio_video: 15_000_000,
};

export const METAS_MENSAIS_POR_MES: Record<number, Record<Sector, number>> = {
  1: { avantia: 0, privado: 0, publico: 0, audio_video: 0 },
  2: { avantia: 2_636_887.05, privado: 2_036_887.05, publico: 0, audio_video: 600_000 },
  3: { avantia: 4_222_531.80, privado: 3_922_531.80, publico: 0, audio_video: 300_000 },
  4: { avantia: 6_208_311.38, privado: 4_895_012.40, publico: 1_013_298.98, audio_video: 300_000 },
  5: { avantia: 5_294_199.47, privado: 2_657_844.86, publico: 2_136_354.61, audio_video: 500_000 },
  6: { avantia: 14_196_803.92, privado: 6_173_668.18, publico: 7_223_135.74, audio_video: 800_000 },
  7: { avantia: 19_027_773.96, privado: 12_167_154.65, publico: 5_360_619.31, audio_video: 1_500_000 },
  8: { avantia: 14_841_159.96, privado: 4_327_286.78, publico: 8_513_873.18, audio_video: 2_000_000 },
  9: { avantia: 11_282_142.03, privado: 2_022_358.82, publico: 7_259_783.21, audio_video: 2_000_000 },
  10: { avantia: 11_588_162.27, privado: 2_088_162.27, publico: 7_500_000, audio_video: 2_000_000 },
  11: { avantia: 20_824_393, privado: 7_824_393, publico: 11_000_000, audio_video: 2_000_000 },
  12: { avantia: 19_884_700.19, privado: 11_884_700.19, publico: 5_000_000, audio_video: 3_000_000 },
};

export const getMetasMensaisAtuais = (date = new Date()): Record<Sector, number> =>
  METAS_MENSAIS_POR_MES[date.getMonth() + 1] ?? METAS_MENSAIS_POR_MES[1];

export const METAS_MENSAIS: Record<Sector, number> = getMetasMensaisAtuais();
