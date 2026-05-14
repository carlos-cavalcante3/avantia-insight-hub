import { useQuery } from "@tanstack/react-query";
import { supabaseGold, isGoldConfigured } from "@/lib/supabaseGold";
import {
  isPipelineNomeAvantiaGeral,
  normalizePipelineNome,
} from "@/lib/pipelineAvantiaGeral";

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

/** Peso para média ponderada de win rate: quantidade de propostas YTD (sem fallback em ganhos). */
const pesoPropostasYtd = (r: Record<string, unknown>) =>
  Math.max(0, Number(r.qtd_propostas_ytd ?? r.total_propostas_ytd ?? 0));

const pesoPropostasMtd = (r: Record<string, unknown>) =>
  Math.max(0, Number(r.qtd_propostas_mtd ?? r.qtd_ganhos_mtd ?? 0));

/** Consolida várias linhas de `mv_kpis_gerais` (ex.: visão Geral = Privado + Público + Áudio). */
const consolidateKpiSubset = (rows: Record<string, unknown>[]): Record<string, unknown> => {
  let valor_ytd = 0,
    qtd_ytd = 0,
    valor_mtd = 0,
    qtd_mtd = 0,
    wY = 0,
    wrY = 0,
    wM = 0,
    wrM = 0,
    wYa = 0,
    wrYa = 0,
    wMa = 0,
    wrMa = 0;
  for (const r of rows) {
    valor_ytd += Number(r.valor_ganho_ytd ?? r.valor_total_ganho_ytd ?? 0);
    qtd_ytd += Number(r.qtd_ganhos_ytd ?? r.total_negocios_ganhos_ytd ?? 0);
    valor_mtd += Number(r.valor_ganho_mtd ?? 0);
    qtd_mtd += Number(r.qtd_ganhos_mtd ?? 0);
    const py = pesoPropostasYtd(r);
    wrY += Number(r.win_rate_ytd ?? 0) * py;
    wY += py;
    const pm = pesoPropostasMtd(r);
    wrM += Number(r.win_rate_mtd ?? 0) * pm;
    wM += pm;
    const ya = r.win_rate_ytd_ano_anterior;
    if (ya != null && !Number.isNaN(Number(ya)) && py > 0) {
      wrYa += Number(ya) * py;
      wYa += py;
    }
    const ma = r.win_rate_mtd_ano_anterior;
    if (ma != null && !Number.isNaN(Number(ma)) && pm > 0) {
      wrMa += Number(ma) * pm;
      wMa += pm;
    }
  }
  return {
    valor_ganho_ytd: valor_ytd,
    qtd_ganhos_ytd: qtd_ytd,
    valor_ganho_mtd: valor_mtd,
    qtd_ganhos_mtd: qtd_mtd,
    win_rate_ytd: wY
      ? wrY / wY
      : rows.length
        ? rows.reduce((s, r) => s + Number(r.win_rate_ytd ?? 0), 0) / rows.length
        : 0,
    win_rate_mtd: wM
      ? wrM / wM
      : rows.length
        ? rows.reduce((s, r) => s + Number(r.win_rate_mtd ?? 0), 0) / rows.length
        : 0,
    win_rate_ytd_ano_anterior: wYa ? wrYa / wYa : null,
    win_rate_mtd_ano_anterior: wMa ? wrMa / wMa : null,
  };
};

const findKpiRowForSector = (
  rows: Record<string, unknown>[],
  sector: Sector
): Record<string, unknown> | null => {
  if (!rows.length) return null;
  if (sector === "avantia") {
    const subset = rows.filter((r) => isPipelineNomeAvantiaGeral(String(r.pipeline_nome)));
    return subset.length ? consolidateKpiSubset(subset) : null;
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
  const wrYtdAnt = row.win_rate_ytd_ano_anterior;
  const wrMtdAnt = row.win_rate_mtd_ano_anterior;
  return {
    valor_ytd,
    qtd_ytd,
    ticket_ytd: qtd_ytd ? valor_ytd / qtd_ytd : 0,
    win_rate_ytd: Number(row.win_rate_ytd ?? 0),
    valor_mtd,
    qtd_mtd,
    ticket_mtd: qtd_mtd ? valor_mtd / qtd_mtd : 0,
    win_rate_mtd: Number(row.win_rate_mtd ?? 0),
    win_rate_ytd_ano_anterior:
      wrYtdAnt != null && !Number.isNaN(Number(wrYtdAnt)) ? Number(wrYtdAnt) : null,
    win_rate_mtd_ano_anterior:
      wrMtdAnt != null && !Number.isNaN(Number(wrMtdAnt)) ? Number(wrMtdAnt) : null,
  };
};

export const useKpisVendas = (sector: Sector = "avantia") =>
  useQuery({
    queryKey: ["gold", "vendas_kpis_v4", sector],
    queryFn: async (): Promise<KpisAggregated> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_kpis_gerais").select("*");
        if (error) throw error;
        const rows = (data ?? []) as Record<string, unknown>[];
        return rowToKpisAggregated(findKpiRowForSector(rows, sector));
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Busca KPIs por TODOS os setores numa só query (pra alimentar metas) */
export const useKpisPorSetor = () =>
  useQuery({
    queryKey: ["gold", "vendas_kpis_setor_v4"],
    queryFn: async (): Promise<Record<Sector, KpisAggregated>> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_kpis_gerais").select("*");
        if (error) throw error;
        const rows = (data ?? []) as Record<string, unknown>[];
        return {
          avantia: rowToKpisAggregated(findKpiRowForSector(rows, "avantia")),
          publico: rowToKpisAggregated(findKpiRowForSector(rows, "publico")),
          privado: rowToKpisAggregated(findKpiRowForSector(rows, "privado")),
          audio_video: rowToKpisAggregated(findKpiRowForSector(rows, "audio_video")),
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

export const useReferenciasVendasAno2025 = (sector: Sector) =>
  useQuery({
    queryKey: ["gold", "refs_vendas_yoy_2025", sector],
    queryFn: async (): Promise<ReferenciasVendasAno2025> =>
      guard(async () => {
        const { data, error } = await supabaseGold.from("mv_vendas_mensais_yoy").select("*");
        if (error) throw error;
        const now = new Date();
        const mesCorte = now.getMonth() + 1;
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

export const useTopClientesPeriodo = (sector: Sector = "avantia", limit = 15) =>
  useQuery({
    queryKey: ["gold", "top_clientes_periodo_v2", sector, limit],
    queryFn: async (): Promise<{ ytd: ClientePeriodo[]; mtd: ClientePeriodo[] }> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_top_clientes_periodo")
          .select("pipeline_nome, empresa_nome, valor_ytd, valor_mtd");
        if (error) throw error;
        const filtered = (data ?? []).filter((r: { pipeline_nome: string }) =>
          matchSector(r.pipeline_nome, sector)
        );
        const agg = new Map<string, ClientePeriodo>();
        for (const r of filtered) {
          const key = r.empresa_nome ?? "—";
          const cur = agg.get(key) ?? { empresa_nome: key, valor_ytd: 0, valor_mtd: 0 };
          cur.valor_ytd += Number(r.valor_ytd ?? 0);
          cur.valor_mtd += Number(r.valor_mtd ?? 0);
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
}

export const useVendasGestorPeriodo = (sector: Sector = "avantia") =>
  useQuery({
    queryKey: ["gold", "vendas_gestor_periodo_v2", sector],
    queryFn: async (): Promise<{ ytd: GestorPeriodo[]; mtd: GestorPeriodo[] }> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_vendas_gestor_periodo")
          .select("pipeline_nome, gestor_nome, valor_ytd, valor_mtd");
        if (error) throw error;
        const filtered = (data ?? []).filter((r: { pipeline_nome: string }) =>
          matchSector(r.pipeline_nome, sector)
        );
        const agg = new Map<string, GestorPeriodo>();
        for (const r of filtered) {
          const key = (r.gestor_nome ?? "—").trim() || "—";
          const cur = agg.get(key) ?? { gestor_nome: key, valor_ytd: 0, valor_mtd: 0 };
          cur.valor_ytd += Number(r.valor_ytd ?? 0);
          cur.valor_mtd += Number(r.valor_mtd ?? 0);
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

/** Metas anuais por setor (provisórias, ajustar quando definidas pelo negócio). */
export const METAS_ANUAIS: Record<Sector, number> = {
  avantia: 80_000_000,
  publico: 30_000_000,
  privado: 40_000_000,
  audio_video: 10_000_000,
};

export const METAS_MENSAIS: Record<Sector, number> = {
  avantia: 6_666_667,
  publico: 2_500_000,
  privado: 3_333_333,
  audio_video: 833_333,
};
