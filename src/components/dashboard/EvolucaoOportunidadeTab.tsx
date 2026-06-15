import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTimeBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDealOptions, useEvolucaoOportunidade } from "@/hooks/useEvolucaoOportunidade";

const tipoEventoStyle = (tipo: string) => {
  const norm = tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (norm.includes("criacao") || norm.includes("criação") || norm.includes("criado")) {
    return {
      dot: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    };
  }
  if (norm.includes("etapa") || norm.includes("fase") || norm.includes("mudanca") || norm.includes("mudança")) {
    return {
      dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
  }
  if (norm.includes("interacao") || norm.includes("interação") || norm.includes("contato") || norm.includes("nota")) {
    return {
      dot: "bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.5)]",
      badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    };
  }
  if (norm.includes("fechamento") || norm.includes("ganho") || norm.includes("vencido") || norm.includes("won")) {
    return {
      dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  if (norm.includes("perda") || norm.includes("perdido") || norm.includes("lost")) {
    return {
      dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
    };
  }
  return {
    dot: "bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]",
    badge: "bg-slate-600/15 text-slate-300 border-slate-600/30",
  };
};

export const EvolucaoOportunidadeTab = () => {
  const deals = useDealOptions();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const timeline = useEvolucaoOportunidade(selectedDealId);

  const selectedDealName = useMemo(
    () => (deals.data ?? []).find((d) => d.deal_id === selectedDealId)?.deal_name ?? null,
    [deals.data, selectedDealId]
  );

  if (deals.error) return <ErrorState message={(deals.error as Error).message} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Negócio
        </span>
        <Select
          value={selectedDealId ?? ""}
          onValueChange={(value) => setSelectedDealId(value || null)}
        >
          <SelectTrigger className="h-9 w-full max-w-xl bg-slate-900 border-slate-800">
            <SelectValue placeholder="Selecione um negócio" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {deals.isLoading ? (
              <SelectItem value="__loading" disabled>
                Carregando negócios...
              </SelectItem>
            ) : (deals.data ?? []).length === 0 ? (
              <SelectItem value="__empty" disabled>
                Nenhum negócio encontrado
              </SelectItem>
            ) : (
              (deals.data ?? []).map((deal) => (
                <SelectItem key={deal.deal_id} value={deal.deal_id}>
                  {deal.deal_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <ReportCard
        title="Evolução da Oportunidade"
        subtitle={
          selectedDealName
            ? `Linha do tempo de eventos · ${selectedDealName}`
            : "Selecione um negócio para visualizar a timeline"
        }
      >
        {!selectedDealId ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <GitBranch className="h-10 w-10 text-slate-600" />
            <p>Escolha um negócio no seletor acima para ver a evolução completa.</p>
          </div>
        ) : timeline.isLoading ? (
          <div className="space-y-6 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full bg-slate-800" />
            ))}
          </div>
        ) : timeline.error ? (
          <ErrorState message={(timeline.error as Error).message} />
        ) : (timeline.data ?? []).length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
            Nenhum evento registrado para este negócio.
          </div>
        ) : (
          <div className="relative py-2 pl-6">
            <div
              className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-blue-500/60 via-slate-600/50 to-slate-700/30"
              aria-hidden
            />
            <ul className="space-y-6">
              {(timeline.data ?? []).map((evento, index) => {
                const style = tipoEventoStyle(evento.tipo_evento);
                return (
                  <li key={`${evento.data_evento}-${index}`} className="relative flex gap-4">
                    <span
                      className={cn(
                        "absolute -left-6 top-1.5 z-10 h-3 w-3 shrink-0 rounded-full border-2 border-slate-950",
                        style.dot
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 rounded-lg border border-slate-800/80 bg-slate-900/50 px-4 py-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <time className="text-[11px] font-medium tabular-nums text-slate-400">
                          {evento.data_evento ? formatDateTimeBR(evento.data_evento) : "—"}
                        </time>
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            style.badge
                          )}
                        >
                          {evento.tipo_evento}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-100">
                        {evento.descricao_evento}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </ReportCard>
    </div>
  );
};
