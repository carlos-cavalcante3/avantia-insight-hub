import { useQuery } from "@tanstack/react-query";
import { supabaseGold, isGoldConfigured } from "@/lib/supabaseGold";

const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (!isGoldConfigured) throw new Error("Gold não configurado.");
  return fn();
};

export interface DealOption {
  deal_id: string;
  deal_name: string;
}

export interface TimelineEvento {
  deal_id: string;
  deal_name: string;
  data_evento: string;
  tipo_evento: string;
  descricao_evento: string;
}

const dealIdFromRow = (row: Record<string, unknown>): string =>
  String(row.deal_id ?? row.id ?? row.negocio_id ?? "").trim();

const dealNameFromRow = (row: Record<string, unknown>): string =>
  String(row.deal_name ?? row.nome_negocio ?? row.negocio_nome ?? row.titulo ?? "—").trim() || "—";

/** Lista distinta de negócios para o seletor — `gold.mv_timeline_oportunidade`. */
export const useDealOptions = () =>
  useQuery({
    queryKey: ["gold", "mv_timeline_oportunidade", "deal_options"],
    queryFn: async (): Promise<DealOption[]> =>
      guard(async () => {
        const { data, error } = await supabaseGold
          .from("mv_timeline_oportunidade")
          .select("deal_id, deal_name");
        if (error) throw error;
        const map = new Map<string, DealOption>();
        for (const row of (data ?? []) as Record<string, unknown>[]) {
          const deal_id = dealIdFromRow(row);
          if (!deal_id) continue;
          const deal_name = dealNameFromRow(row);
          if (!map.has(deal_id)) map.set(deal_id, { deal_id, deal_name });
        }
        return Array.from(map.values()).sort((a, b) =>
          a.deal_name.localeCompare(b.deal_name, "pt-BR")
        );
      }),
    staleTime: 5 * 60 * 1000,
  });

/** Timeline de eventos de um negócio — `gold.mv_timeline_oportunidade`. */
export const useEvolucaoOportunidade = (dealId: string | null) =>
  useQuery({
    queryKey: ["gold", "mv_timeline_oportunidade", dealId],
    enabled: Boolean(dealId),
    queryFn: async (): Promise<TimelineEvento[]> =>
      guard(async () => {
        if (!dealId) return [];
        const { data, error } = await supabaseGold
          .from("mv_timeline_oportunidade")
          .select("deal_id, deal_name, data_evento, tipo_evento, descricao_evento")
          .eq("deal_id", dealId)
          .order("data_evento", { ascending: true });
        if (error) throw error;
        return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
          deal_id: dealIdFromRow(row),
          deal_name: dealNameFromRow(row),
          data_evento: String(row.data_evento ?? ""),
          tipo_evento: String(row.tipo_evento ?? "Evento").trim() || "Evento",
          descricao_evento: String(row.descricao_evento ?? "").trim() || "—",
        }));
      }),
    staleTime: 5 * 60 * 1000,
  });
