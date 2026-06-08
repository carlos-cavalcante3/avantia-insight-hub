import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard } from "./ReportCard";
import { ErrorState } from "./ErrorState";
import { formatBRL } from "@/lib/format";
import { usePipelineClientesUltimaMov } from "@/hooks/useDashboardData";

const PAGE_SIZE = 10;

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface Row {
  id: string | number | null;
  nome: string;
  cliente: string;
  gerente: string;
  etapa: string;
  valor: number;
}

export const OportunidadesAudioVideoTable = () => {
  const { data, isLoading, error } = usePipelineClientesUltimaMov(5000, "avantia");
  const [page, setPage] = useState(0);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const empresa of data ?? []) {
      const pipe = normalize(String(empresa.pipeline_nome ?? ""));
      if (!(pipe.includes("audio") || pipe.includes("video"))) continue;
      for (const n of empresa.negocios_detalhados ?? []) {
        const rec = n as Record<string, unknown>;
        out.push({
          id: (rec.id as string | number | null) ?? null,
          nome: String(rec.nome ?? "Oportunidade"),
          cliente: String(rec.cliente ?? empresa.empresa ?? "—"),
          gerente: String(rec.gerente ?? "—"),
          etapa: String(rec.etapa_nome ?? rec.fase ?? "—"),
          valor: Number(rec.valor ?? 0),
        });
      }
    }
    return out.sort((a, b) => b.valor - a.valor);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <ReportCard
      title="Oportunidades Áudio e Vídeo"
      subtitle="Oportunidades em andamento — com áudio/vídeo"
      action={
        !isLoading ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800/60 px-2 text-xs font-semibold text-slate-100">
            {rows.length}
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : rows.length === 0 ? (
        <ErrorState message="Sem oportunidades de Áudio e Vídeo em aberto." />
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2 font-medium">Oportunidade / Cliente</th>
                  <th className="px-2 py-2 font-medium">Responsável</th>
                  <th className="px-2 py-2 font-medium">Etapa</th>
                  <th className="px-2 py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((r, i) => (
                  <tr
                    key={`${r.id ?? r.nome}-${i}`}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-2 py-2.5 align-top">
                      {r.id != null && String(r.id).trim() !== "" ? (
                        <a
                          href={`https://crm.rdstation.com/app/deals/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-medium"
                        >
                          {r.nome}
                        </a>
                      ) : (
                        <span className="text-slate-100 font-medium">{r.nome}</span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{r.cliente}</p>
                    </td>
                    <td className="px-2 py-2.5 text-slate-200">{r.gerente}</td>
                    <td className="px-2 py-2.5 text-slate-300">{r.etapa}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                      {formatBRL(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                Página <span className="font-semibold text-slate-100">{page + 1}</span> de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </ReportCard>
  );
};
