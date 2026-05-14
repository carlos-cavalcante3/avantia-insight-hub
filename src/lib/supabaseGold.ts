import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase apontando para o projeto externo da Avantia,
 * configurado para acessar o schema `gold` por padrão.
 *
 * Variáveis de ambiente obrigatórias (Vite):
 *   - VITE_GOLD_SUPABASE_URL
 *   - VITE_GOLD_SUPABASE_ANON_KEY
 *
 * Sem fallback hardcoded: se as variáveis não estiverem definidas,
 * `isGoldConfigured` será false e a UI mostrará um aviso.
 */

const URL = import.meta.env.VITE_GOLD_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_GOLD_SUPABASE_ANON_KEY as string | undefined;

export const isGoldConfigured = Boolean(URL && ANON);

// `any` deliberado: o cliente aponta para o schema `gold` (fora dos types gerados do public).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseGold: any = isGoldConfigured
  ? createClient(URL!, ANON!, {
      db: { schema: "gold" },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            "Supabase Gold não configurado. Defina VITE_GOLD_SUPABASE_URL e VITE_GOLD_SUPABASE_ANON_KEY."
          );
        },
      }
    );
