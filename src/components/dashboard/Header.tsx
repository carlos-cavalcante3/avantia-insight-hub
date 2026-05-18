import { Bell, Search, Calendar, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Sector, SECTOR_LABEL } from "@/hooks/useVendasData";
import type { ReactNode } from "react";

interface HeaderProps {
  onMenuClick?: () => void;
  sector: Sector;
  onSectorChange: (value: Sector) => void;
  /** Quando definido, substitui o seletor de Setor (ex: seletor de Gestor na Página 4). */
  selectorOverride?: ReactNode;
  hideSectorSelector?: boolean;
}

export const Header = ({
  onMenuClick,
  sector,
  onSectorChange,
  selectorOverride,
  hideSectorSelector = false,
}: HeaderProps) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-3 min-w-0">
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
            <h1 className="text-xl sm:text-2xl font-bold -tracking-tightest text-foreground truncate">
              Dashboard Comercial
            </h1>
            <p className="text-xs text-muted-foreground capitalize hidden sm:block">{today}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!hideSectorSelector && (
            <div className="w-44 hidden sm:block">
              {selectorOverride ?? (
                <Select
                  value={sector}
                  onValueChange={(value) => onSectorChange(value as Sector)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avantia">{SECTOR_LABEL.avantia}</SelectItem>
                    <SelectItem value="publico">{SECTOR_LABEL.publico}</SelectItem>
                    <SelectItem value="privado">{SECTOR_LABEL.privado}</SelectItem>
                    <SelectItem value="audio_video">{SECTOR_LABEL.audio_video}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md bg-muted border border-border text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>YTD · 2026</span>
          </div>
          <Button variant="outline" size="icon" className="hidden sm:inline-flex">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
