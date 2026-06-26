/** Regra única de alertas por dias sem movimentação. */

export const MOV_LIMITE_VERDE = 15;
export const MOV_LIMITE_AMARELO = 60;

export const diasDesdeMovimentacao = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
};

export type MovAlertLevel = "verde" | "amarelo" | "vermelho";

export const movAlertLevel = (iso: string | null | undefined): MovAlertLevel => {
  const dias = diasDesdeMovimentacao(iso);
  if (dias == null) return "vermelho";
  if (dias < MOV_LIMITE_VERDE) return "verde";
  if (dias <= MOV_LIMITE_AMARELO) return "amarelo";
  return "vermelho";
};

export const movBadgeClass = (iso: string | null | undefined): string => {
  switch (movAlertLevel(iso)) {
    case "verde":
      return "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20";
    case "amarelo":
      return "bg-warning/15 text-warning border border-warning/30";
    default:
      return "bg-destructive/15 text-destructive border border-destructive/30";
  }
};

export const movTextClass = (iso: string | null | undefined): string => {
  switch (movAlertLevel(iso)) {
    case "verde":
      return "text-emerald-400";
    case "amarelo":
      return "text-amber-500 font-semibold";
    default:
      return "text-red-400 font-bold";
  }
};

export const movSemaforoDotClass = (iso: string | null | undefined): string => {
  switch (movAlertLevel(iso)) {
    case "verde":
      return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]";
    case "amarelo":
      return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]";
    default:
      return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]";
  }
};

export const movSemaforoLabel = (iso: string | null | undefined): string => {
  switch (movAlertLevel(iso)) {
    case "verde":
      return "Ativo";
    case "amarelo":
      return "Atenção";
    default:
      return "Crítico";
  }
};

export const formatRelativeMovimentacao = (iso: string | null | undefined): string => {
  const d = diasDesdeMovimentacao(iso);
  if (d === null) return "—";
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  if (d < 30) return `há ${d} dias`;
  if (d < 60) return `há ${Math.floor(d / 7)} semanas`;
  return `há ${Math.floor(d / 30)} meses`;
};

/** Variante quando só há a quantidade de dias (sem data ISO). */
export const movAlertLevelFromDias = (dias: number): MovAlertLevel => {
  if (dias < MOV_LIMITE_VERDE) return "verde";
  if (dias <= MOV_LIMITE_AMARELO) return "amarelo";
  return "vermelho";
};

export const movSemaforoDotFromDias = (dias: number): string => {
  switch (movAlertLevelFromDias(dias)) {
    case "verde":
      return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]";
    case "amarelo":
      return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]";
    default:
      return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]";
  }
};

export const movSemaforoTextFromDias = (dias: number): string => {
  switch (movAlertLevelFromDias(dias)) {
    case "verde":
      return "text-emerald-500 bg-emerald-500/15";
    case "amarelo":
      return "text-amber-500 bg-amber-500/15";
    default:
      return "text-red-500 bg-red-500/15";
  }
};

export const movBadgeClassFromDias = (dias: number): string => {
  switch (movAlertLevelFromDias(dias)) {
    case "verde":
      return "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20";
    case "amarelo":
      return "bg-warning/15 text-warning border border-warning/30";
    default:
      return "bg-destructive/15 text-destructive border border-destructive/30";
  }
};

export const movSemaforoLabelFromDias = (dias: number): string => {
  switch (movAlertLevelFromDias(dias)) {
    case "verde":
      return "Ativo";
    case "amarelo":
      return "Atenção";
    default:
      return "Crítico";
  }
};
