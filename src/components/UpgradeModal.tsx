import React, { useState } from "react";
import { X, Zap, ArrowRight, Loader2 } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { usePlans } from "../hooks/usePlans";
import { createCheckoutSession } from "../services/stripeService";
import { useAuth } from "../contexts/AuthContext";
import type { Plan } from "../types/subscription";
import { PLAN_ORDER } from "../types/subscription";

const FEATURE_LABEL_MAP: Record<string, string> = {
  provas_mes:        "Gerador de Provas IA",
  tipos_prova:       "Tipos de prova",
  workspaces:        "Workspaces (pastas)",
  pastas_trabalhos:  "Pastas de trabalhos dos alunos",
  publicar_material: "Publicar Material",
  editor_documentos: "Editor de Documentos",
  qr_chamada:        "QR Chamada",
  anotacoes:         "Anotações",
  suporte:           "Suporte",
};

const UpgradeModal: React.FC = () => {
  const { upgradeModal, closeUpgradeModal, planRank } = useSubscription();
  const { plans } = usePlans();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!upgradeModal.open) return null;

  const featureLabel =
    upgradeModal.featureLabel ||
    FEATURE_LABEL_MAP[upgradeModal.feature ?? ""] ||
    upgradeModal.feature ||
    "esta funcionalidade";

  // Planos que desbloqueiam esta feature (superiores ao atual)
  const upgradePlans = plans.filter(
    (p) => (PLAN_ORDER[p.slug] ?? 0) > planRank && p.slug !== "free",
  );

  const handleSelect = async (plan: Plan) => {
    if (!plan.stripe_price_id || !user) return;
    setLoadingPlan(plan.id);
    try {
      await createCheckoutSession(plan.stripe_price_id, user.id, user.email!);
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-yellow-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Faça um upgrade</h2>
                <p className="text-blue-100 text-sm">
                  Limite atingido: <span className="font-semibold text-white">{featureLabel}</span>
                </p>
              </div>
            </div>
            <button
              onClick={closeUpgradeModal}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {upgradeModal.limit !== undefined && typeof upgradeModal.limit === "number" && (
            <p className="mt-3 text-sm bg-white/15 rounded-lg px-3 py-2">
              Seu plano atual permite até <strong>{upgradeModal.limit}</strong>{" "}
              {featureLabel.toLowerCase()}{upgradeModal.limit !== 1 ? "s" : ""}.
              Faça upgrade para continuar usando sem limites.
            </p>
          )}
        </div>

        {/* Planos disponíveis */}
        <div className="p-6">
          {upgradePlans.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              Você já está no plano máximo disponível.
            </p>
          ) : (
            <div className="space-y-3">
              {upgradePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all
                    ${plan.slug === "pro" ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-gray-50"}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{plan.name}</span>
                      {plan.slug === "pro" && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      R$ {plan.price_brl.toFixed(0)}/mês
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelect(plan)}
                    disabled={!!loadingPlan}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
                      ${plan.slug === "pro"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-gray-800 hover:bg-gray-900 text-white"}
                      disabled:opacity-50`}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        Assinar
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={closeUpgradeModal}
            className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Continuar com o plano atual
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
