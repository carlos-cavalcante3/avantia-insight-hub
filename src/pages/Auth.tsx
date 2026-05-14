import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

const ALLOWED_DOMAIN = "avantia.com.br";
const RESTRICTED_MSG = "Acesso restrito a contas @avantia.com.br";

const isAllowedEmail = (email: string) =>
  email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Entrar · Avantia BI";
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      const userEmail = session.user?.email ?? "";
      if (!isAllowedEmail(userEmail)) {
        // Bloqueia e desloga imediatamente caso entre por OAuth com domínio errado
        supabase.auth.signOut().finally(() => {
          toast({
            title: "Acesso restrito",
            description: RESTRICTED_MSG,
            variant: "destructive",
          });
        });
        return;
      }
      navigate("/", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      const userEmail = data.session?.user?.email ?? "";
      if (data.session && isAllowedEmail(userEmail)) {
        navigate("/", { replace: true });
      } else if (data.session && !isAllowedEmail(userEmail)) {
        supabase.auth.signOut();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedEmail(email)) {
      toast({
        title: "Acesso restrito",
        description: RESTRICTED_MSG,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({
          title: "Cadastro realizado",
          description: "Verifique seu email para confirmar a conta.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast({ title: "Falha na autenticação", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        // Restringe o seletor de contas ao Workspace corporativo
        extraParams: {
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
        },
      });
      if (result.error) {
        toast({
          title: "Falha no login Google",
          description: result.error instanceof Error ? result.error.message : "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Avantia BI</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Entre para acessar o dashboard" : "Crie sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            Continuar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email corporativo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seuusuario@avantia.com.br"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center">
            Acesso exclusivo para colaboradores com e-mail{" "}
            <span className="font-semibold">@{ALLOWED_DOMAIN}</span>.
          </p>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "signin"
              ? "Não tem conta? Cadastre-se"
              : "Já tem conta? Entre"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
