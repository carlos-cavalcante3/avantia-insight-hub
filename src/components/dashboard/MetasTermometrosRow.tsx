import { type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { formatBRL, formatPercent } from "@/lib/format";

const MES_LABEL_CORTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const META_MENSAL = 2_000_000;
const META_ANUAL = 80_000_000;

type Slice = { name: string; value: number; fill: string };

const ZONA_DATA: Slice[] = [
  { name: "critico", value: 10, fill: "#991b1b" },
  { name: "ruim", value: 30, fill: "#ef4444" },
  { name: "regular", value: 60, fill: "#eab308" },
  { name: "quase-la", value: 70, fill: "#22c55e" }, 
  { name: "meta", value: 100, fill: "#15803d" }, 
];

function pctMetaRatio(meta: number, atingido: number): number {
  if (!meta || meta <= 0) return 0;
  return Math.min(Math.max(atingido / meta, 0), 1);
}

interface GaugeProps {
  id: string;
  title: string;
  subtitle: string;
  meta: number;
  atingido: number;
  isLoading: boolean;
  footer: ReactNode;
}

const MetaGauge = ({ id, title, subtitle, meta, atingido, isLoading, footer }: GaugeProps) => {
  const percentual = pctMetaRatio(meta, atingido);
  const angulo = percentual * 180 - 90;
  const atingidoSeguro = Math.max(0, atingido);

  return (
    <ReportCard id={id} title={title} subtitle={subtitle} className="h-full">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center w-full mt-4">
            <div className="relative w-full h-[200px] flex justify-center overflow-hidden pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ZONA_DATA}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={100}
                    outerRadius={140}
                    stroke="none"
                    paddingAngle={0}
                  >
                    {ZONA_DATA.map((entry, index) => (
                      <Cell key={`zona-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-0">
                <span className="text-6xl font-black text-slate-800 tracking-tighter drop-shadow-sm">
                  {Math.round(percentual * 100)}%
                </span>
              </div>

              <div
                className="absolute bottom-0 left-1/2 flex flex-col items-center justify-end transition-all duration-1000 ease-out z-10 drop-shadow-md"
                style={{
                  height: "120px",
                  width: "6px",
                  transform: `translateX(-50%) rotate(${angulo}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <div className="w-full h-full bg-slate-800 rounded-t-full shadow-lg"></div>
              </div>

              <div className="absolute bottom-[-12px] left-1/2 transform -translate-x-1/2 w-8 h-8 bg-slate-800 rounded-full border-[4px] border-white shadow-md drop-shadow-md z-20"></div>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center gap-1 text-base text-gray-600 bg-gray-50/50 w-full py-3 rounded-b-lg border-t border-gray-100">
              <span>
                Atingido:{" "}
                <strong className="text-gray-900 font-bold text-lg">{formatBRL(atingidoSeguro)}</strong>
              </span>
              <span>
                Meta fixa: <strong className="text-gray-900">{formatBRL(meta)}</strong>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border text-center text-[11px]">{footer}</div>
        </>
      )}
    </ReportCard>
  );
};

interface Props {
  valorMes?: number;
  valorYtd?: number;
  isLoading: boolean;
  error: Error | null;
  crescimentoYtdPct?: number;
  anoAnteriorYtd?: number;
  variacaoMesPct?: number;
  anoAnteriorMes?: number;
  mesIndex?: number;
  mesYoYLoading?: boolean;
  ytdYoYLoading?: boolean;
}

export const MetasTermometrosRow = ({
  valorMes = 0,
  valorYtd = 0,
  isLoading,
  error,
  crescimentoYtdPct,
  anoAnteriorYtd,
  variacaoMesPct,
  anoAnteriorMes,
  mesIndex,
  mesYoYLoading,
  ytdYoYLoading,
}: Props) => {
  const mesNome =
    mesIndex != null && mesIndex >= 1 && mesIndex <= 12
      ? MES_LABEL_CORTO[mesIndex - 1]
      : "—";

  const footerAnual = ytdYoYLoading ? (
    <Skeleton className="h-4 w-56 mx-auto" />
  ) : crescimentoYtdPct == null || anoAnteriorYtd == null ? (
    <span className="text-muted-foreground">—</span>
  ) : crescimentoYtdPct >= 0 ? (
    <span className="inline-flex items-center justify-center gap-1 text-green-500 font-medium">
      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
      +{formatPercent(crescimentoYtdPct)} vs mesmo período (YTD) em {anoAnteriorYtd}
    </span>
  ) : (
    <span className="inline-flex items-center justify-center gap-1 text-red-500 font-medium">
      <TrendingDown className="h-3.5 w-3.5 shrink-0" />
      {formatPercent(crescimentoYtdPct)} vs mesmo período (YTD) em {anoAnteriorYtd}
    </span>
  );

  const footerMensal =
    mesYoYLoading ? (
      <Skeleton className="h-4 w-48 mx-auto" />
    ) : variacaoMesPct == null || anoAnteriorMes == null ? (
      <span className="text-muted-foreground">—</span>
    ) : variacaoMesPct >= 0 ? (
      <span className="inline-flex items-center justify-center gap-1 text-green-500 font-medium">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        +{formatPercent(variacaoMesPct)} vs {mesNome} {anoAnteriorMes}
      </span>
    ) : (
      <span className="inline-flex items-center justify-center gap-1 text-red-500 font-medium">
        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
        {formatPercent(variacaoMesPct)} vs {mesNome} {anoAnteriorMes}
      </span>
    );

  if (error) {
    return (
      <section aria-label="Metas">
        <ErrorState message={error.message} />
      </section>
    );
  }

  return (
    <section aria-label="Metas mensal e anual" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MetaGauge
        id="meta-mensal"
        title="Meta Mensal"
        subtitle={`Meta fixa ${formatBRL(META_MENSAL)} · desempenho do mês atual`}
        meta={META_MENSAL}
        atingido={valorMes}
        isLoading={isLoading}
        footer={footerMensal}
      />
      <MetaGauge
        id="meta-anual-ytd"
        title="Meta Anual (YTD)"
        subtitle={`Meta fixa ${formatBRL(META_ANUAL)} · desempenho acumulado no ano`}
        meta={META_ANUAL}
        atingido={valorYtd}
        isLoading={isLoading}
        footer={footerAnual}
      />
    </section>
  );
};
