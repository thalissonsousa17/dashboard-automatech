// ============================================================
// Tipos de Assinatura — Stripe + Supabase
// ============================================================

export type PlanSlug = 'free' | 'starter' | 'pro' | 'premium';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export type SupporteTier = false | 'email' | 'prioritario' | 'dedicado';
export type EditorTier   = 'limitado' | 'completo';

/** Funcionalidades com limites numéricos (-1 = ilimitado) e booleanos */
export interface PlanFeatures {
  provas_mes:        number;   // -1 = ilimitado
  tipos_prova:       number;   // -1 = ilimitado
  workspaces:        number;   // -1 = ilimitado
  pastas_trabalhos:  number;   // -1 = ilimitado
  publicar_material: boolean;
  editor_documentos: EditorTier;
  qr_chamada:        boolean;
  anotacoes:         number;   // -1 = ilimitado
  suporte:           SupporteTier;
}

export interface Plan {
  id:              string;
  name:            string;
  slug:            PlanSlug;
  price_brl:       number;
  stripe_price_id: string | null;
  features:        PlanFeatures;
  is_active:       boolean;
  created_at:      string;
}

export interface Subscription {
  id:                      string;
  user_id:                 string;
  plan_id:                 string;
  stripe_subscription_id:  string | null;
  stripe_customer_id:      string | null;
  status:                  SubscriptionStatus;
  current_period_start:    string | null;
  current_period_end:      string | null;
  cancel_at_period_end:    boolean;
  created_at:              string;
  updated_at:              string;
  plan?:                   Plan;  // joined
}

/** Chaves de feature que têm limite numérico */
export type NumericFeatureKey =
  | 'provas_mes'
  | 'tipos_prova'
  | 'workspaces'
  | 'pastas_trabalhos'
  | 'anotacoes';

/** Chaves de feature booleanas */
export type BooleanFeatureKey =
  | 'publicar_material'
  | 'qr_chamada';

export type AllFeatureKey = keyof PlanFeatures;

/** Retorno do canAccess */
export interface AccessResult {
  allowed:  boolean;
  limit:    number | boolean | string;
  used?:    number;
}

// Ordem para comparar planos (maior = mais recursos)
export const PLAN_ORDER: Record<PlanSlug, number> = {
  free:    0,
  starter: 1,
  pro:     2,
  premium: 3,
};
