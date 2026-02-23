// Supabase Edge Function: create-checkout-session
// Deploy: npx supabase@latest functions deploy create-checkout-session --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, userId, userEmail, successUrl, cancelUrl } =
      await req.json();

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "priceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const frontendUrl = Deno.env.get("FRONTEND_URL") ??
      "https://dashboard.automatech.app.br";

    // Busca customer existente (apenas se userId foi fornecido)
    let customerId: string | undefined;

    if (userId) {
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .not("stripe_customer_id", "is", null)
        .limit(1)
        .single();

      customerId = subData?.stripe_customer_id ?? undefined;
    }

    if (!customerId && userEmail) {
      // Tenta encontrar customer existente no Stripe pelo email
      const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          ...(userId ? { metadata: { user_id: userId } } : {}),
        });
        customerId = customer.id;
      }
    }

    // Monta os parâmetros da sessão
    // Nota: customer_creation é inválido em mode:"subscription" — o Stripe sempre cria um customer.
    // Quando não há customerId, simplesmente omitimos o campo e o Stripe coleta o email no checkout.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ||
        `${frontendUrl}/dashboard/subscription?success=true`,
      cancel_url: cancelUrl || `${frontendUrl}/#pricing`,
      locale: "pt-BR",
      // Vincula ao customer existente se disponível; caso contrário o Stripe cria um novo
      ...(customerId ? { customer: customerId } : {}),
      // Inclui user_id nos metadados apenas se disponível (usuário logado)
      ...(userId
        ? {
          metadata: { user_id: userId },
          subscription_data: { metadata: { user_id: userId } },
        }
        : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
