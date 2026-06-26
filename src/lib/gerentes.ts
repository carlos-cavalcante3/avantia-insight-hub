/**
 * Whitelist FLEXÍVEL de gerentes Avantia.
 *
 * REGRA:
 *  - Listas / rankings INDIVIDUAIS exibem só quem casar com pelo menos
 *    UMA das chaves abaixo (toLowerCase + includes, tolerante a acento).
 *  - Totais GLOBAIS ("Avantia Geral") NUNCA passam por este filtro.
 */

const stripAccents = (s: string): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Chaves substring (já sem acento). Casa por includes simples. */
export const GERENTE_KEYS = [
  "alexandre",
  "andre henrique",
  "claudinei",
  "claudiney",
  "dayane",
  "eder",
  "philipp",
  "philip",
  "phillipe",
  "maia",
  "rabitto",
  "carlos trindade",
  "andre garrido",
  "fabio moraes",
];

/** Equipes nomeadas — usadas para filtrar listas/painéis por setor. */
export const EQUIPE_PUBLICO = [
  "André Garrido",
  "Carlos Trindade",
  "Fabio Moraes",
];

export const EQUIPE_PRIVADO = [
  "Alexandre Soares",
  "André Henrique dos Santos",
  "Claudiney da costa",
  "Dayane Lima",
  "Eder cosmo",
  "João Rabitto",
  "Phillipe Maia",
];

/** Gerentes exibidos na Curva de Geração de Oportunidades (Global). */
export const CURVA_GLOBAL_GERENTES = [...EQUIPE_PUBLICO, ...EQUIPE_PRIVADO];

/** Verifica se um nome bate com algum nome da lista — ignora acentos e
 *  maiúsculas, com includes bidirecional para tolerar variações (sobrenome
 *  parcial, abreviações etc.). */
export const matchNomeInList = (
  nome: string | null | undefined,
  list: string[]
): boolean => {
  const a = stripAccents(nome ?? "");
  if (!a) return false;
  return list.some((b) => {
    const nb = stripAccents(b);
    return a.includes(nb) || nb.includes(a);
  });
};

export const isGerenteWhitelisted = (nome: string | null | undefined): boolean => {
  const norm = stripAccents(nome ?? "");
  if (!norm) return false;
  return GERENTE_KEYS.some((k) => norm.includes(k));
};

export const matchGerenteCanonical = (nome: string | null | undefined): string | null =>
  isGerenteWhitelisted(nome) ? String(nome).trim() : null;

export const filterByGerenteWhitelist = <T extends Record<string, unknown>>(
  rows: T[],
  keys: string[] = ["gestor_nome", "gerente_nome", "responsavel", "gestor"]
): T[] =>
  rows.filter((r) => {
    for (const k of keys) {
      const v = r?.[k];
      if (typeof v === "string" && isGerenteWhitelisted(v)) return true;
    }
    return false;
  });
