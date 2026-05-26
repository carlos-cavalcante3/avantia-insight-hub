/**
 * Whitelist oficial dos 10 gerentes comerciais Avantia.
 *
 * REGRA DE NEGÓCIO:
 *  - Toda lista/tabela/gráfico de performance INDIVIDUAL deve mostrar
 *    apenas estes 10 gerentes (filtro tolerante a acento e capitalização).
 *  - Totais GLOBAIS ("Avantia Geral") NUNCA passam por este filtro;
 *    eles agregam o universo completo.
 */

export const GERENTES_WHITELIST_RAW = [
  "ALEXANDRE Soares",
  "ANDRÉ Henrique dos Santos",
  "CLAUDINEI Claudinei da Costa",
  "DAYANE Lima",
  "EDER Da costa",
  "PHILLIPE Maia",
  "JOÃO RABITTO",
  "CARLOS TRINDADE",
  "ANDRÉ GARRIDO",
  "FABIO MORAES",
] as const;

export const normalizeGerente = (s: string): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Tokens essenciais por gerente. Match por "todos os tokens contidos".
 * Permite variações como "Andre Garrido", "andré h. dos santos", "Phillipe maia da silva".
 */
const TOKENS: { canonical: string; tokens: string[] }[] = GERENTES_WHITELIST_RAW.map((n) => {
  const norm = normalizeGerente(n);
  const tokens = norm.split(/\s+/).filter((t) => t.length >= 3);
  // remove ruído: nomes muito comuns são mantidos pois aparecem em pares
  return { canonical: n, tokens };
});

export const isGerenteWhitelisted = (nome: string | null | undefined): boolean => {
  const norm = normalizeGerente(nome ?? "");
  if (!norm) return false;
  return TOKENS.some(({ tokens }) => tokens.every((t) => norm.includes(t)));
};

/** Retorna o nome canônico se o input casar com alguém da whitelist; senão null. */
export const matchGerenteCanonical = (nome: string | null | undefined): string | null => {
  const norm = normalizeGerente(nome ?? "");
  if (!norm) return null;
  const hit = TOKENS.find(({ tokens }) => tokens.every((t) => norm.includes(t)));
  return hit ? hit.canonical : null;
};

/** Filtra uma lista por nome (item.gestor_nome / item.gerente_nome / item.responsavel). */
export const filterByGerenteWhitelist = <T extends Record<string, unknown>>(
  rows: T[],
  keys: string[] = ["gestor_nome", "gerente_nome", "responsavel", "gestor"]
): T[] => {
  return rows.filter((r) => {
    for (const k of keys) {
      const v = r?.[k];
      if (typeof v === "string" && isGerenteWhitelisted(v)) return true;
    }
    return false;
  });
};
