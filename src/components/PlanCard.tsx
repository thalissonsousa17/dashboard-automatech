import React from "react";
import {
  Check,
  X,
  Star,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type { Plan, PlanSlug } from "../types/subscription";

interface PlanCardProps {
  plan:           Plan;
  isCurrentPlan:  boolean;
  isRecommended?: boolean;
  isHigherTier?:  boolean;  // plano superior ao atual
  onSelect:       (plan: Plan) => void;
  loading?:       boolean;
}

const PLAN_COLORS: Record<PlanSlug, { gradient: string; badge: string; btn: string; border: string }> = {
  free:    {
    gradient: "from-gray-50 to-gray-100",
    badge:    "bg-gray-200 text-gray-600",
    btn:      "bg-gray-200 text-gray-600 cursor-default",
    border:   "border-gray-200",
  },
  starter: {
    gradient: "from-blue-50 to-blue-100",
    badge:    "bg-blue-100 text-blue-700",
    btn:      "bg-blue-600 hover:bg-blue-700 text-white",
    border:   "border-blue-200",
  },
  pro:     {
    gradient: "from-purple-50 to-indigo-100",
    badge:    "bg-purple-100 text-purple-700",
    btn:      "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white",
    border:   "border-purple-300",
  },
  premium: {
    gradient: "from-amber-50 to-orange-100",
    badge:    "bg-amber-100 text-amber-700",
    btn:      "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
    border:   "border-amber-300",
  },
};

const FEATURE_LABELS: Record<string, string> = {
  provas_mes:        "Provas/mês",
  tipos_prova:       "Tipos de prova",
  workspaces:        "Workspaces",
  pastas_trabalhos:  "Pastas de alunos",
  publicar_material: "Publicar material",
  editor_documentos: "Editor de documentos",
  qr_chamada:        "QR Chamada",
  anotacoes:         "Anotações",
  suporte:           "Suporte",
};

function renderFeatureValue(key: string, value: unknown): React.ReactNode {
  if (value === true) return <Check size={16} className="text-green-500" />;
  if (value === false) return <X size={16} className="text-gray-300" />;
  if (value === -1) return <span className="text-green-600 font-semibold text-sm">Ilimitado</span>;
  if (key === "suporte") {
    const map: Record<string, string> = {
      email: "Email",
      prioritario: "Prioritário",
      dedicado: "Dedicado",
    };
    return <span className="text-sm text-gray-700">{map[value as string] ?? String(value)}</span>;
  }
  if (key === "editor_documentos") {
    return (
      <span className="text-sm text-gray-700 capitalize">
        {value === "completo" ? "Completo" : "Limitado"}
      </span>
    );
  }
  return <span className="text-sm font-medium text-gray-800">{String(value)}</span>;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan,
  isRecommended,
  isHigherTier,
  onSelect,
  loading,
}) => {
  const colors = PLAN_COLORS[plan.slug] ?? PLAN_COLORS.free;
  const isPaid = plan.slug !== "free";

  const renderButton = () => {
    if (loading) {
      return (
        <button disabled className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 opacity-70 ${colors.btn}`}>
          <Loader2 size={16} className="animate-spin" />
          Aguarde...
        </button>
      );
    }
    if (isCurrentPlan) {
      return (
        <button disabled className="w-full py-3 px-4 rounded-xl font-semibold bg-green-100 text-green-700 border border-green-200 cursor-default">
          Plano atual
        </button>
      );
    }
    if (!isPaid) {
      return (
        <button disabled className={`w-full py-3 px-4 rounded-xl font-semibold ${colors.btn}`}>
          Gratuito
        </button>
      );
    }
    return (
      <button
        onClick={() => onSelect(plan)}
        className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${colors.btn}`}
      >
        {isHigherTier ? "Fazer upgrade" : "Assinar agora"}
        <ArrowRight size={16} />
      </button>
    );
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg
        ${isRecommended ? "ring-2 ring-purple-500 ring-offset-2 shadow-xl scale-105" : "shadow-sm"}
        ${isCurrentPlan ? "ring-2 ring-green-400 ring-offset-1" : ""}
        bg-gradient-to-b ${colors.gradient} ${colors.border}`}
    >
      {/* Badges */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {isRecommended && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white mb-2">
              <Star size={11} fill="currentColor" /> Mais popular
            </span>
          )}
          {isCurrentPlan && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white mb-2">
              Seu plano atual
            </span>
          )}
        </div>
        {isPaid && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
            {plan.slug.toUpperCase()}
          </span>
        )}
      </div>

      {/* Nome e preço */}
      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
      <div className="mb-5">
        {plan.price_brl === 0 ? (
          <p className="text-3xl font-bold text-gray-900">Grátis</p>
        ) : (
          <p className="text-3xl font-bold text-gray-900">
            R$ {plan.price_brl.toFixed(0)}
            <span className="text-base font-normal text-gray-500">/mês</span>
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {(Object.entries(plan.features) as [string, unknown][]).map(([key, value]) => (
          <li key={key} className="flex items-center justify-between gap-2 text-sm text-gray-600">
            <span className="flex-1">{FEATURE_LABELS[key] ?? key}</span>
            <span className="shrink-0">{renderFeatureValue(key, value)}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {renderButton()}
    </div>
  );
};

export default PlanCard;
