// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
// Webhook URL: https://xdfhpxevouhagsqcilnp.supabase.co/functions/v1/stripe-webhook

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── Helpers ─────────────────────────────────────────────────

async function getPlanByPriceId(priceId: string) {
  const { data } = await supabase
    .from("plans")
    .select("id, slug")
    .eq("stripe_price_id", priceId)
    .single();
  return data;
}

async function getFreePlanId(): Promise<string | null> {
  const { data } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", "free")
    .single();
  return data?.id ?? null;
}

// ─── Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Sem stripe-signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    console.error("Assinatura webhook inválida:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log("Evento Stripe recebido:", event.type);

  try {
    switch (event.type) {

      // ── checkout.session.completed ──────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const stripeSubId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId || !stripeSubId) break;

        // Busca os detalhes da subscription para saber o priceId
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const priceId = stripeSub.items.data[0]?.price.id;
        const plan = priceId ? await getPlanByPriceId(priceId) : null;

        if (!plan) {
          console.error("Plano não encontrado para priceId:", priceId);
          break;
        }

        // Upsert: atualiza se já existe (free), caso contrário insere
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (existing) {
          await supabase
            .from("subscriptions")
            .update({
              plan_id:                plan.id,
              stripe_subscription_id: stripeSubId,
              stripe_customer_id:     customerId,
              status:                 stripeSub.status,
              current_period_start:   new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end:     new Date(stripeSub.current_period_end   * 1000).toISOString(),
              cancel_at_period_end:   stripeSub.cancel_at_period_end,
              updated_at:             new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("subscriptions").insert({
            user_id:                userId,
            plan_id:                plan.id,
            stripe_subscription_id: stripeSubId,
            stripe_customer_id:     customerId,
            status:                 stripeSub.status,
            current_period_start:   new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end:     new Date(stripeSub.current_period_end   * 1000).toISOString(),
            cancel_at_period_end:   stripeSub.cancel_at_period_end,
          });
        }
        break;
      }

      // ── customer.subscription.updated ──────────────────
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const userId = stripeSub.metadata?.user_id;
        if (!userId) break;

        const priceId = stripeSub.items.data[0]?.price.id;
        const plan = priceId ? await getPlanByPriceId(priceId) : null;

        await supabase
          .from("subscriptions")
          .update({
            ...(plan ? { plan_id: plan.id } : {}),
            status:               stripeSub.status,
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(stripeSub.current_period_end   * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at:           new Date().toISOString(),
          })
          .eq("stripe_subscription_id", stripeSub.id);
        break;
      }

      // ── customer.subscription.deleted ──────────────────
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const freePlanId = await getFreePlanId();

        await supabase
          .from("subscriptions")
          .update({
            status:                 "canceled",
            cancel_at_period_end:   false,
            ...(freePlanId ? { plan_id: freePlanId } : {}),
            stripe_subscription_id: null,
            updated_at:             new Date().toISOString(),
          })
          .eq("stripe_subscription_id", stripeSub.id);
        break;
      }

      // ── invoice.payment_failed ──────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = invoice.subscription as string;
        if (!stripeSubId) break;

        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", stripeSubId);
        break;
      }

      default:
        console.log("Evento não tratado:", event.type);
    }
  } catch (err) {
    console.error("Erro ao processar evento:", event.type, err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
