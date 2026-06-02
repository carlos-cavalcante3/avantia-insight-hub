/** Parser robusto para JSON/JSONB do Supabase (string, array ou objeto). */
export const parseNegociosDetalhados = (data: unknown): Record<string, unknown>[] => {
  if (data == null) return [];
  let parsed: unknown = data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === "object") {
    return Object.values(parsed as Record<string, unknown>) as Record<string, unknown>[];
  }
  return [];
};

/** @deprecated Use parseNegociosDetalhados */
export const parseJsonArray = parseNegociosDetalhados;
