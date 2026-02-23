// Serviço Stripe — chama as Edge Functions do Supabase
import { supabase } from "../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function callEdgeFn<T = unknown>(
  fn: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `Erro ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Inicia o Checkout Stripe e redireciona o usuário para a página de pagamento.
 * @param priceId    ID do price no Stripe (ex: price_1T3lzn...)
 * @param userId     ID do usuário no Supabase
 * @param userEmail  Email do usuário
 */
export async function createCheckoutSession(
  priceId: string,
  userId: string,
  userEmail: string,
): Promise<void> {
  const origin = window.location.origin;
  const { url } = await callEdgeFn<{ url: string }>("create-checkout-session", {
    priceId,
    userId,
    userEmail,
    successUrl: `${origin}/dashboard/subscription?success=true`,
    cancelUrl:  `${origin}/dashboard/subscription?canceled=true`,
  });

  if (url) window.location.href = url;
}

/**
 * Abre o Portal do Cliente Stripe para gerenciar assinatura.
 * @param userId ID do usuário no Supabase
 */
export async function createPortalSession(userId: string): Promise<void> {
  const origin = window.location.origin;
  const { url } = await callEdgeFn<{ url: string }>("create-portal-session", {
    userId,
    returnUrl: `${origin}/dashboard/subscription`,
  });

  if (url) window.location.href = url;
}
