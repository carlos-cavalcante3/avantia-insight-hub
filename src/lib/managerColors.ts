import { AVANTIA_CHART_COLORS } from "@/lib/avantiaTheme";

const normalizeManagerName = (name: string): string =>
  String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const MANAGER_COLORS: Record<string, string> = {
  alexandre: AVANTIA_CHART_COLORS[0],
  "andre henrique": AVANTIA_CHART_COLORS[1],
  claudinei: AVANTIA_CHART_COLORS[5],
  dayane: AVANTIA_CHART_COLORS[4],
  eder: AVANTIA_CHART_COLORS[7],
  philipp: AVANTIA_CHART_COLORS[2],
  philip: AVANTIA_CHART_COLORS[2],
  maia: AVANTIA_CHART_COLORS[3],
  rabitto: AVANTIA_CHART_COLORS[5],
  "carlos trindade": AVANTIA_CHART_COLORS[0],
  "andre garrido": AVANTIA_CHART_COLORS[4],
  "fabio moraes": AVANTIA_CHART_COLORS[7],
};

export const getManagerColor = (name: string): string => {
  const normalized = normalizeManagerName(name);
  for (const [key, color] of Object.entries(MANAGER_COLORS)) {
    if (normalized.includes(key)) return color;
  }
  const hash = Array.from(normalized).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVANTIA_CHART_COLORS[hash % AVANTIA_CHART_COLORS.length];
};
