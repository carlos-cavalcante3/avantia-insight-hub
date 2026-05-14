import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

interface ErrorStateProps {
  /** Mensagem técnica (apenas para log no console — nunca renderizada). */
  message?: string;
  className?: string;
}

/**
 * Mostra uma mensagem genérica e amigável ao usuário.
 * Detalhes técnicos do erro vão apenas para o console (debugging),
 * evitando vazamento de nomes de schemas, views e queries.
 */
export const ErrorState = ({ message, className }: ErrorStateProps) => {
  useEffect(() => {
    if (message) {
      // eslint-disable-next-line no-console
      console.error("[ErrorState]", message);
    }
  }, [message]);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-2 py-8 px-4 rounded-md border border-destructive/30 bg-destructive/5 text-destructive ${className ?? ""}`}
    >
      <AlertCircle className="h-5 w-5" />
      <p className="text-sm font-medium">Não foi possível carregar os dados</p>
      <p className="text-xs text-destructive/80 max-w-md">
        Tente novamente em instantes. Se o problema persistir, contate o suporte.
      </p>
    </div>
  );
};
