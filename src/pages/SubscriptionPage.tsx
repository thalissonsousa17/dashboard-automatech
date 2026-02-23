import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Zap,
  Check,
  X,
  Crown,
  Shield,
  CreditCard,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Settings,
  Loader2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { usePlans } from "../hooks/usePlans";
import { useSubscription } from "../hooks/useSubscription";
import { createCheckoutSession, createPortalSession } from "../services/stripeService";
import { useAuth } from "../contexts/AuthContext";
import PlanCard from "../components/PlanCard";
import type { Plan, PlanSlug } from "../types/subscription";
import { PLAN_ORDER } from "../types/subscription";

// ─── FAQ ────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Ao cancelar, você mantém acesso ao plano pago até o fim do período já pago. Após isso, sua conta é revertida automaticamente para o plano gratuito.",
  },
  {
    q: "Como funciona o upgrade de plano?",
    a: "Ao fazer upgrade, a cobrança é proporcional ao tempo restante do mês. O novo plano é ativado imediatamente.",
  },
  {
    q: "Meus dados ficam salvos se eu cancelar?",
    a: "Sim. Todos os seus dados, provas e documentos ficam salvos mesmo após o cancelamento. Você continua acessando no limite do plano gratuito.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "Cartão de crédito e débito (Visa, Mastercard, Elo, Amex). O pagamento é processado com segurança pelo Stripe.",
  },
  {
    q: "O plano gratuito tem data de expiração?",
    a: "Não. O plano gratuito é vitalício, com os limites descritos.",
  },
  {
    q: "Existe desconto para pagamento anual?",
    a: "Estamos preparando planos anuais com desconto especial. Em breve você poderá escolher essa opção.",
  },
];

// ─── Feature comparison table ────────────────────────────────
const COMPARISON_ROWS = [
  { key: "provas_mes",        label: "Provas/mês com IA", type: "number" as const },
  { key: "tipos_prova",       label: "Tipos de prova",    type: "number" as const },
  { key: "workspaces",        label: "Workspaces",        type: "number" as const },
  { key: "pastas_trabalhos",  label: "Pastas de alunos",  type: "number" as const },
  { key: "publicar_material", label: "Publicar Material", type: "bool" as const },
  { key: "editor_documentos", label: "Editor Word-like",  type: "string" as const },
  { key: "qr_chamada",        label: "QR Chamada",        type: "bool" as const },
  { key: "anotacoes",         label: "Anotações",         type: "number" as const },
  { key: "suporte",           label: "Suporte",           type: "support" as const },
];

function renderCell(value: unknown, type: string): React.ReactNode {
  if (type === "bool") {
    return value
      ? <Check size={18} className="text-green-500 mx-auto" />
      : <X     size={18} className="text-gray-300 mx-auto" />;
  }
  if (type === "number") {
    if (value === -1) return <span className="text-green-600 font-bold text-sm">∞</span>;
    return <span className="font-semibold text-sm">{String(value)}</span>;
  }
  if (type === "support") {
    const map: Record<string, string> = {
      email: "Email",
      prioritario: "Prioritário",
      dedicado: "Dedicado",
    };
    if (value === false) return <X size={18} className="text-gray-300 mx-auto" />;
    return <span className="text-sm font-medium">{map[value as string] ?? String(value)}</span>;
  }
  if (type === "string") {
    const map: Record<string, string> = { limitado: "Limitado", completo: "Completo" };
    return <span className="text-sm font-medium">{map[value as string] ?? String(value)}</span>;
  }
  return <span className="text-sm">{String(value)}</span>;
}

// ─── FAQ Item ────────────────────────────────────────────────
const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800">{q}</span>
        {open ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 bg-gray-50 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
          {a}
        </div>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────
const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plans, isLoading: plansLoading } = usePlans();
  const {
    currentPlan,
    subscription,
    isLoading: subLoading,
    isPaidPlan,
    planRank,
    refreshSubscription,
  } = useSubscription();
  const { user } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Feedback após retorno do Stripe
  const success  = searchParams.get("success")  === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => refreshSubscription(), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, refreshSubscription]);

  // Auto-inicia checkout quando o usuário vem da landing page com plano pendente
  useEffect(() => {
    if (subLoading || plansLoading || !user || plans.length === 0) return;
    const pendingPriceId = sessionStorage.getItem("pending_plan_id");
    if (!pendingPriceId) return;
    sessionStorage.removeItem("pending_plan_id");
    const plan = plans.find((p) => p.stripe_price_id === pendingPriceId);
    if (plan && plan.stripe_price_id && currentPlan?.id !== plan.id) {
      setCheckoutLoading(plan.id);
      createCheckoutSession(plan.stripe_price_id, user.id, user.email!)
        .catch(console.error)
        .finally(() => setCheckoutLoading(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subLoading, plansLoading, user, plans]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!plan.stripe_price_id || !user) return;
    setCheckoutLoading(plan.id);
    try {
      await createCheckoutSession(plan.stripe_price_id, user.id, user.email!);
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      await createPortalSession(user.id);
    } catch (err) {
      console.error(err);
      alert("Erro ao abrir portal de assinatura. Tente novamente.");
    } finally {
      setPortalLoading(false);
    }
  };

  const loading = plansLoading || subLoading;

  const formatDate = (iso: string | null) => {
    if (!iso) return "–";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      .format(new Date(iso));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">

      {/* ── Feedback pós-checkout ── */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Assinatura ativada com sucesso!</p>
            <p className="text-sm text-green-700">Seu plano foi atualizado. Aproveite todos os recursos.</p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm">O checkout foi cancelado. Nenhuma cobrança foi realizada.</p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Crown size={15} /> Planos & Assinatura
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Escolha o plano ideal para você
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Comece gratuitamente e escale conforme sua necessidade. Cancele quando quiser, sem burocracia.
        </p>
      </div>

      {/* ── Status da assinatura atual ── */}
      {!loading && currentPlan && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  Plano atual:{" "}
                  <span className="text-blue-700">{currentPlan.name}</span>
                  {subscription?.status === "past_due" && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      Pagamento pendente
                    </span>
                  )}
                  {subscription?.cancel_at_period_end && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Cancelamento agendado
                    </span>
                  )}
                </p>
                {subscription?.current_period_end && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar size={13} />
                    {subscription.cancel_at_period_end
                      ? `Acesso até ${formatDate(subscription.current_period_end)}`
                      : `Renovação em ${formatDate(subscription.current_period_end)}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => refreshSubscription()}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={16} />
              </button>
              {isPaidPlan && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {portalLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Settings size={14} />
                  }
                  Gerenciar assinatura
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cards de planos ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[460px] bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            const isRecommended = plan.slug === "pro";
            const isHigherTier  = (PLAN_ORDER[plan.slug as PlanSlug] ?? 0) > planRank;
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={isCurrentPlan}
                isRecommended={isRecommended}
                isHigherTier={isHigherTier}
                onSelect={handleSelectPlan}
                loading={checkoutLoading === plan.id}
              />
            );
          })}
        </div>
      )}

      {/* ── Tabela comparativa ── */}
      {!loading && plans.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Zap size={20} className="text-blue-600" />
              Comparação detalhada
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold w-48">Funcionalidade</th>
                  {plans.map((p) => (
                    <th key={p.id} className={`text-center px-4 py-3 font-bold
                      ${p.slug === "pro" ? "text-purple-700 bg-purple-50" : "text-gray-700"}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-5 py-3 text-gray-600 font-medium">{row.label}</td>
                    {plans.map((p) => (
                      <td key={p.id} className={`text-center px-4 py-3
                        ${p.slug === "pro" ? "bg-purple-50/30" : ""}`}>
                        {renderCell(p.features[row.key as keyof typeof p.features], row.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagamento seguro ── */}
      <div className="flex flex-wrap items-center justify-center gap-6 py-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <CreditCard size={16} className="text-gray-400" />
          Pagamento seguro via Stripe
        </span>
        <span className="flex items-center gap-1.5">
          <Shield size={16} className="text-gray-400" />
          SSL criptografado
        </span>
        <span className="flex items-center gap-1.5">
          <Check size={16} className="text-green-500" />
          Cancele quando quiser
        </span>
      </div>

      {/* ── FAQ ── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <HelpCircle size={22} className="text-blue-600" />
          Perguntas frequentes
        </h2>
        <div className="space-y-3 max-w-3xl">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* ── CTA final ── */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-2">Ainda com dúvidas?</h3>
        <p className="text-blue-100 mb-5">
          Fale com nosso suporte via WhatsApp. Respondemos em minutos.
        </p>
        <a
          href="https://wa.me/5583986844693?text=Olá! Tenho dúvidas sobre os planos da Automatech."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
        >
          Falar no WhatsApp
        </a>
      </div>

    </div>
  );
};

export default SubscriptionPage;
