/** Negócio bruto vindo do JSON `negocios_detalhados` (view Gold). */
export interface NegocioFunilRaw {
  id?: string | number;
  nome_negocio?: string;
  negocio_nome?: string;
  cliente_nome?: string;
  empresa_nome?: string;
  gestor_nome?: string;
  gerente?: string;
  gerente_nome?: string;
  valor?: number;
  valor_total?: number;
  valor_estimado?: number;
  etapa_nome?: string;
  fase?: string;
}

export type SelectedFunnelStage = {
  nome: string;
  negocios_detalhados?: unknown;
  payload?: { negocios_detalhados?: unknown };
};

/** Parsing rigoroso + filtro de null objects do LEFT JOIN. */
export const extractNegociosValidos = (
  selectedStage: SelectedFunnelStage | null | undefined
): NegocioFunilRaw[] => {
  if (!selectedStage) return [];
  try {
    const rawData =
      selectedStage.payload?.negocios_detalhados ?? selectedStage.negocios_detalhados;
    const parsed: unknown =
      typeof rawData === "string"
        ? JSON.parse(rawData)
        : Array.isArray(rawData)
          ? rawData
          : rawData && typeof rawData === "object"
            ? Object.values(rawData as Record<string, unknown>)
            : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is NegocioFunilRaw => {
      if (!n || typeof n !== "object") return false;
      const row = n as NegocioFunilRaw;
      const id = row.id;
      const hasId = id != null && String(id).trim() !== "";
      const nome = row.nome_negocio ?? row.negocio_nome;
      const hasNome = nome != null && String(nome).trim() !== "";
      return hasId && hasNome;
    });
  } catch (e) {
    console.error("Erro ao fazer parse dos negócios:", e);
    return [];
  }
};

export const negocioFunilDisplayName = (n: NegocioFunilRaw): string =>
  String(n.nome_negocio ?? n.negocio_nome ?? "Negócio");

export const negocioFunilGerente = (n: NegocioFunilRaw): string =>
  String(n.gerente ?? n.gerente_nome ?? n.gestor_nome ?? "Não Atribuído");

export const negocioFunilValor = (n: NegocioFunilRaw): number =>
  Number(n.valor ?? n.valor_total ?? n.valor_estimado ?? 0);

export const negocioFunilCliente = (n: NegocioFunilRaw): string =>
  String(n.cliente_nome ?? n.empresa_nome ?? "—");
