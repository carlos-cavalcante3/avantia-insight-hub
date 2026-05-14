export const formatBRL = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

export const formatCompactBRL = (value: number): string => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace(".", ",")}K`;
  return formatBRL(value);
};

export const formatPercent = (value: number, digits = 1): string =>
  `${value.toFixed(digits).replace(".", ",")}%`;

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pt-BR").format(value);

export const formatDateBR = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
