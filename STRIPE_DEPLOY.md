# Deploy Stripe — Instruções

## 1. Execute o SQL no Supabase
Abra o SQL Editor e execute: `supabase_subscription_setup.sql`

## 2. Instale a CLI do Supabase (se não tiver)
```bash
npm install -g supabase
supabase login
supabase link --project-ref xdfhpxevouhagsqcilnp
```

## 3. Configure os secrets das Edge Functions
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_UxB9lBm0euR6HMUxxnnk6EN58PMfNgnB
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua service role key do Supabase>
supabase secrets set FRONTEND_URL=https://dashboard.automatech.app.br
```
> A Service Role Key está em: Supabase → Settings → API → service_role

## 4. Faça o deploy das funções
```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

## 5. Configure variáveis no Vercel
No painel do Vercel adicione:
- `VITE_STRIPE_PUBLISHABLE_KEY` = pk_live_51Rvj5jBNpKinyuTe...

## 6. Configure o Webhook no Stripe
Já está configurado em:
https://dashboard.stripe.com/webhooks → URL: https://xdfhpxevouhagsqcilnp.supabase.co/functions/v1/stripe-webhook

Eventos necessários:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed
