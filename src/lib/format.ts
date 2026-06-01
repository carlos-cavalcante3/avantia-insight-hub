/**
 * Formatação global de valores monetários.
 * Decisão de produto: NÃO exibir "R$" em cards/eixos. Valores grandes
 * recebem sufixo "M" (milhões) ou "K" (milhares).
 */

const nf2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nf1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const compactSuffix = (value: number, suffix: "K" | "M") =>
  `${nf1.format(value).replace(/\.0$/, "")}${suffix}`;

/**
 * Máscara global "Avantia": sem cifrão.
 *  ≥ 1.000.000  → "1,5M"
 *  ≥ 1.000      → "350K"
 *  resto        → "1.234,56"
 */
export const formatBRL = (value: number): string => {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${compactSuffix(abs / 1_000_000, "M")}`;
  if (abs >= 1_000) return `${sign}${compactSuffix(abs / 1_000, "K")}`;
  return `${sign}${nf2.format(abs)}`;
};

/** Compatibilidade — mesmo formato compacto. */
export const formatCompactBRL = (value: number): string => formatBRL(value);

/** Versão "extensa" sem cifrão para tooltips/detalhes finos. */
export const formatBRLFull = (value: number): string => {
  const v = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);
};

export const formatPercent = (value: number, digits = 1): string =>
  `${value.toFixed(digits).replace(".", ",")}%`;

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pt-BR").format(value);

export const formatDateBR = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
