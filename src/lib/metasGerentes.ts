export const normalizeName = (name: string | null | undefined): string =>
  name
    ? name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";

export const METAS_GERENTES: Record<string, number> = {
  "paulo mascarenhas": 5_000_000,
  "fabio moraes": 10_000_000,
  "carlos trindade": 20_000_000,
  "andre garrido": 20_000_000,
  DEFAULT: 5_000_000,
};

export const getMetaGerente = (nome: string | null | undefined): number =>
  METAS_GERENTES[normalizeName(nome)] ?? METAS_GERENTES.DEFAULT;
