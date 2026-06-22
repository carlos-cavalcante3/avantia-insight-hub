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
  "philippe maia": 15_000_000,
  "claudinei da costa": 15_000_000,
  "dayane lima": 8_000_000,
  "alexandre soares": 15_000_000,
  "joao rabitto": 4_000_000,
  "eder cosmo": 5_000_000,
  "andre henrique dos santos": 5_000_000,
};

export const getMetaGerente = (nome: string | null | undefined): number =>
  METAS_GERENTES[normalizeName(nome)] ?? METAS_GERENTES.DEFAULT;
