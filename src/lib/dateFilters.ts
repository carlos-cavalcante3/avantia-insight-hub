const CUTOFF_2026 = new Date("2026-01-01T00:00:00");

const MES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const mesLabelCurto = (ano: number, mes: number): string =>
  `${MES_CURTO[Math.max(0, Math.min(11, mes - 1))] ?? "—"}/${String(ano).slice(-2)}`;

export const isOnOrAfterJan2026 = (date: Date): boolean =>
  !Number.isNaN(date.getTime()) && date >= CUTOFF_2026;

export const isNotFutureMonth = (ano: number, mes: number): boolean => {
  const now = new Date();
  const point = new Date(ano, mes - 1, 1);
  const endOfCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return point <= endOfCurrent;
};

/** Curvas mensais: desde Jan/2026 e sem meses futuros (ex.: Dez/2026 no meio do ano). */
export const filterCurvaValid = <T extends { ano: number; mes: number }>(items: T[]): T[] =>
  items.filter((item) => {
    if (!item.ano || !item.mes) return false;
    const d = new Date(item.ano, item.mes - 1, 1);
    return isOnOrAfterJan2026(d) && isNotFutureMonth(item.ano, item.mes);
  });

/** @deprecated Prefer filterCurvaValid */
export const filterCurvaFromJan2026 = filterCurvaValid;

/** Rejeita linhas de perda com metadado de data/ano anterior a 2026. */
export const isMotivoPerdaRow2026Plus = (row: Record<string, unknown>): boolean => {
  const ano = Number(row.ano ?? row.year ?? NaN);
  if (Number.isFinite(ano) && ano > 0) return ano >= 2026;

  for (const key of [
    "data_perda",
    "data_fechamento",
    "data",
    "periodo",
    "mes_referencia",
    "referencia",
  ]) {
    const raw = row[key];
    if (raw == null || raw === "") continue;
    const parsed = new Date(String(raw));
    if (!Number.isNaN(parsed.getTime())) return isOnOrAfterJan2026(parsed);
  }

  return true;
};
