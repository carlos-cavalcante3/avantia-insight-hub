import { useEffect, useState } from "react";
import { LayoutDashboard, Filter, Trophy, AlertTriangle, BarChart3, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const formatNameFromEmail = (email: string) => {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return { name: "Usuário", initials: "U" };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const name = parts.slice(0, 2).map(cap).join(" ");
  const initials = (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  return { name, initials };
};

export type DashboardTab =
  | "vendas"
  | "pipeline"
  | "gerentes"
  | "analise_gerentes"
  | "licitacoes"
  | "alertas";

const nav: { key: DashboardTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "vendas", label: "Vendas", icon: LayoutDashboard },
  { key: "pipeline", label: "Pipeline", icon: Filter },
  { key: "gerentes", label: "Gerentes", icon: Trophy },
  { key: "analise_gerentes", label: "Análise de Gerentes", icon: BarChart3 },
  { key: "licitacoes", label: "Licitações", icon: Scale },
  { key: "alertas", label: "Alertas", icon: AlertTriangle },
];

interface SidebarProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

export const Sidebar = ({ active, onChange }: SidebarProps) => {
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? ""));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? ""));
    return () => sub.subscription.unsubscribe();
  }, []);
  const { name, initials } = formatNameFromEmail(email);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center h-14 px-5 border-b border-sidebar-border">
        <img
          src="https://avantia.com.br/wp-content/uploads/2025/12/avantia-logotipo-negativo.svg"
          alt="Avantia"
          className="h-6 w-auto"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Analytics
        </p>
        {nav.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              <span className="flex-1">{item.label}</span>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground text-xs font-semibold">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-[10px] text-sidebar-foreground/60 truncate">{email || "read-only"}</p>
        </div>
      </div>
    </aside>
  );
};
