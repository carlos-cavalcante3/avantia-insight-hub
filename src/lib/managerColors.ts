import { AVANTIA_CHART_COLORS } from "@/lib/avantiaTheme";

const normalizeManagerName = (name: string): string =>
  String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Paleta vibrante e distinta (>= 15 tons) — usada como fallback para
 *  garantir que dois gerentes nunca compartilhem a mesma cor no gráfico. */
export const MANAGER_FALLBACK_PALETTE = [
  "#3b82f6", // blue-500
  "#f97316", // orange-500
  "#10b981", // emerald-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f59e0b", // amber-500
  "#6366f1", // indigo-500
  "#ef4444", // red-500
  "#14b8a6", // teal-500
  "#84cc16", // lime-500
  "#eab308", // yellow-500
  "#d946ef", // fuchsia-500
  "#0ea5e9", // sky-500
  "#f43f5e", // rose-500
  "#22c55e", // green-500
  "#8b5cf6", // violet-500
] as const;

export const MANAGER_COLORS: Record<string, string> = {
  alexandre: MANAGER_FALLBACK_PALETTE[0],
  "andre henrique": MANAGER_FALLBACK_PALETTE[1],
  claudinei: MANAGER_FALLBACK_PALETTE[2],
  dayane: MANAGER_FALLBACK_PALETTE[3],
  eder: MANAGER_FALLBACK_PALETTE[4],
  philipp: MANAGER_FALLBACK_PALETTE[5],
  philip: MANAGER_FALLBACK_PALETTE[5],
  maia: MANAGER_FALLBACK_PALETTE[6],
  rabitto: MANAGER_FALLBACK_PALETTE[7],
  "carlos trindade": MANAGER_FALLBACK_PALETTE[8],
  "andre garrido": MANAGER_FALLBACK_PALETTE[9],
  "fabio moraes": MANAGER_FALLBACK_PALETTE[10],
};

// referência mantida para evitar quebra de imports externos
export { AVANTIA_CHART_COLORS };

export const getManagerColor = (name: string): string => {
  const normalized = normalizeManagerName(name);
  for (const [key, color] of Object.entries(MANAGER_COLORS)) {
    if (normalized.includes(key)) return color;
  }
  const hash = Array.from(normalized).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return MANAGER_FALLBACK_PALETTE[hash % MANAGER_FALLBACK_PALETTE.length];
};
