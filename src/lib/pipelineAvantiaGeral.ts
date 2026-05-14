/** Normalização para comparação de nomes de pipeline (Gold). */
export const normalizePipelineNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Pipelines que compõem o consolidado executivo "Avantia (Geral)".
 * Não existe linha única no banco — agregação no front.
 */
export function isPipelineNomeAvantiaGeral(pipeNome: string | null | undefined): boolean {
  const n = normalizePipelineNome(String(pipeNome ?? ""));
  if (n.includes("audio") || n.includes("video")) return true;
  if (!n.includes("venda")) return n.includes("audio") || n.includes("video");
  return (
    (n.includes("privado") && n.includes("venda")) ||
    n.includes("publico") ||
    n.includes("public") ||
    n.includes("eletric")
  );
}
