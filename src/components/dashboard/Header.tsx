import { Bell, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNotificacoesRecentes } from "@/hooks/useDashboardData";
import { type Sector, SECTOR_LABEL } from "@/hooks/useVendasData";
import { formatBRL } from "@/lib/format";

interface HeaderProps {
  onMenuClick?: () => void;
  sector: Sector;
  onSectorChange: (value: Sector) => void;
  periodo: string;
  onPeriodoChange: (value: string) => void;
  selectorOverride?: ReactNode;
  hideSectorSelector?: boolean;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const Header = ({
  onMenuClick,
  sector,
  onSectorChange,
  periodo,
  onPeriodoChange,
  selectorOverride,
  hideSectorSelector = false,
}: HeaderProps) => {
  const navigate = useNavigate();
  const notificacoes = useNotificacoesRecentes(8);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const periodOptions = [
    { value: "ytd", label: "YTD (Acumulado)" },
    ...Array.from({ length: currentMonth }, (_, index) => {
      const month = currentMonth - index;
      return { value: `mes-${month}`, label: `${MONTH_NAMES[month - 1]} ${currentYear}` };
    }),
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-blue-950/50 bg-background/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
              Dashboard Comercial
            </h1>
            <p className="hidden text-xs capitalize text-muted-foreground sm:block">{today}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!hideSectorSelector && (
            <div className="hidden sm:block">
              {selectorOverride ?? (
                <Select value={sector} onValueChange={(value) => onSectorChange(value as Sector)}>
                  <SelectTrigger className="h-9 w-44 border-blue-950/50 bg-card text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-blue-950/50 bg-card text-slate-100">
                    <SelectItem value="avantia">{SECTOR_LABEL.avantia}</SelectItem>
                    <SelectItem value="publico">{SECTOR_LABEL.publico}</SelectItem>
                    <SelectItem value="privado">{SECTOR_LABEL.privado}</SelectItem>
                    <SelectItem value="audio_video">{SECTOR_LABEL.audio_video}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <Select value={periodo} onValueChange={onPeriodoChange}>
            <SelectTrigger className="h-9 w-44 border-blue-950/50 bg-slate-950 text-slate-100 shadow-sm sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="border-blue-950/50 bg-card text-slate-100">
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative border-blue-950/50 bg-card">
                <Bell className="h-4 w-4" />
                {(notificacoes.data?.length ?? 0) > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 border-blue-950/50 bg-card p-3 text-slate-100">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Notificações recentes</p>
                <span className="text-xs text-slate-400">{notificacoes.data?.length ?? 0}</span>
              </div>
              {notificacoes.isLoading ? (
                <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
              ) : (notificacoes.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Nenhuma notificação recente</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {(notificacoes.data ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-blue-950/50 bg-background p-2 text-xs leading-relaxed"
                    >
                      {"\u{1F389} "}
                      {item.gestor_nome} registrou um negócio com {item.cliente_nome} no valor de{" "}
                      {formatBRL(item.valor)}
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            className="border-blue-950/50 bg-card"
            onClick={handleLogout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
