import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ALLOWED_DOMAIN = "avantia.com.br";
const RESTRICTED_MSG = "Acesso restrito a contas @avantia.com.br";
const isAllowedEmail = (email: string) =>
  email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s && !isAllowedEmail(s.user?.email ?? "")) {
        // Domínio não permitido — encerra sessão
        supabase.auth.signOut();
        toast({
          title: "Acesso restrito",
          description: RESTRICTED_MSG,
          variant: "destructive",
        });
        setSession(null);
      } else {
        setSession(s);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s && !isAllowedEmail(s.user?.email ?? "")) {
        supabase.auth.signOut();
        toast({
          title: "Acesso restrito",
          description: RESTRICTED_MSG,
          variant: "destructive",
        });
        setSession(null);
      } else {
        setSession(s);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
