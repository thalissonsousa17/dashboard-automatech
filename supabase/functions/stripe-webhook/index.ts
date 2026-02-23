// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
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
    .select("id, slug, name")
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

/** Senha legível de 12 caracteres (sem caracteres ambíguos) */
function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

/** Busca user_id por email usando a função RPC SECURITY DEFINER */
async function findUserByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_id_by_email", { p_email: email });
  if (error) {
    console.error("findUserByEmail error:", error);
    return null;
  }
  return data ?? null;
}

/** Cria novo usuário Supabase com email já confirmado e upsert de profile */
async function createNewUser(
  email: string,
  password: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("createNewUser error:", error);
    return null;
  }

  const userId = data.user?.id;
  if (userId) {
    await supabase.from("profiles").upsert(
      {
        user_id: userId,
        display_name: email.split("@")[0],
        role: "professor",
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return userId ?? null;
}

/** Envia email de boas-vindas com credenciais via Resend */
async function sendWelcomeEmail(
  email: string,
  password: string,
  planName: string,
  frontendUrl: string,
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY não configurada — email não enviado");
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #2563eb, #16a34a); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Bem-vindo à Automatech! 🎉</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Plataforma Educacional para Professores</p>
      </div>
      <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
          Olá! Sua assinatura do plano <strong style="color: #2563eb;">${planName}</strong> foi confirmada com sucesso.
        </p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
          Criamos sua conta automaticamente. Use as credenciais abaixo para acessar a plataforma:
        </p>

        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 16px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
            Suas Credenciais de Acesso
          </p>
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #9ca3af;">E-mail</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827; background: #f3f4f6; padding: 10px 14px; border-radius: 6px; letter-spacing: 0.02em;">
              ${email}
            </p>
          </div>
          <div>
            <p style="margin: 0 0 4px; font-size: 13px; color: #9ca3af;">Senha temporária</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #111827; background: #f3f4f6; padding: 10px 14px; border-radius: 6px; letter-spacing: 0.08em; font-family: monospace;">
              ${password}
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${frontendUrl}/login"
            style="display: inline-block; background: linear-gradient(135deg, #2563eb, #16a34a); color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.02em;">
            Acessar Minha Conta →
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            ⚠️ <strong>Importante:</strong> Recomendamos que você altere sua senha após o primeiro acesso em
            <em>Configurações → Meu Perfil</em>.
          </p>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center; line-height: 1.7;">
          Dúvidas? Entre em contato:<br>
          <a href="mailto:suporte@automatech.app.br" style="color: #2563eb;">suporte@automatech.app.br</a>
          &nbsp;|&nbsp; WhatsApp: (83) 98684-4693
        </p>
      </div>

      <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">
        © ${new Date().getFullYear()} Automatech — Plataforma Educacional
      </p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Automatech <noreply@automatech.app.br>",
        to: [email],
        subject: `Bem-vindo ao plano ${planName} — suas credenciais de acesso`,
        html,
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error("Resend error:", res.status, bodyText);
    } else {
      console.log("Email de boas-vindas enviado para:", email);
    }
  } catch (err) {
    console.error("sendWelcomeEmail fetch error:", err);
  }
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

      // ── checkout.session.completed ──────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId = session.metadata?.user_id;
        const stripeSubId = session.subscription as string;
        const customerId = session.customer as string;
        const customerEmail = session.customer_details?.email;
        const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://dashboard.automatech.app.br";

        if (!stripeSubId) break;

        // Busca detalhes da subscription para obter o priceId
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const priceId = stripeSub.items.data[0]?.price.id;
        const plan = priceId ? await getPlanByPriceId(priceId) : null;

        if (!plan) {
          console.error("Plano não encontrado para priceId:", priceId);
          break;
        }

        // Se não há userId nos metadados → compra sem conta → tenta encontrar/criar usuário
        let isNewUser = false;
        if (!userId && customerEmail) {
          const existingUserId = await findUserByEmail(customerEmail);

          if (existingUserId) {
            // Usuário já existe → apenas vincula
            userId = existingUserId;
            console.log("Usuário existente encontrado pelo email:", customerEmail);
          } else {
            // Novo usuário → cria conta + envia email
            const password = generatePassword();
            const newUserId = await createNewUser(customerEmail, password);

            if (newUserId) {
              userId = newUserId;
              isNewUser = true;

              // Envia email de boas-vindas com as credenciais
              await sendWelcomeEmail(customerEmail, password, plan.name ?? plan.slug, frontendUrl);

              // Atualiza metadados da subscription no Stripe para futuras referências
              await stripe.subscriptions.update(stripeSubId, {
                metadata: { user_id: newUserId },
              });
            } else {
              console.error("Falha ao criar usuário para email:", customerEmail);
            }
          }
        }

        if (!userId) {
          console.error("userId não determinado — checkout.session.completed ignorado");
          break;
        }

        // Upsert da assinatura no Supabase
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

        console.log(
          `Assinatura processada — userId: ${userId}, plano: ${plan.slug}, novo usuário: ${isNewUser}`,
        );
        break;
      }

      // ── customer.subscription.updated ──────────────────────
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

      // ── customer.subscription.deleted ──────────────────────
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

      // ── invoice.payment_failed ──────────────────────────────
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
