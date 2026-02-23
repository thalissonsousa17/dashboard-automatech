import { useCallback } from "react";
import { useSubscription } from "./useSubscription";
import type { AllFeatureKey } from "../types/subscription";

/**
 * useFeatureGate — verifica limites de plano e abre UpgradeModal quando bloqueado.
 *
 * Exemplos de uso:
 *
 *   const { checkGate } = useFeatureGate();
 *
 *   // Criar workspace: permite se ainda não atingiu o limite
 *   const ok = checkGate('workspaces', currentWorkspaceCount, 'Workspaces');
 *   if (!ok) return; // modal já foi aberto automaticamente
 *
 *   // Feature booleana
 *   const ok = checkGate('qr_chamada', undefined, 'QR Chamada');
 *   if (!ok) return;
 */
export const useFeatureGate = () => {
  const { canAccess, openUpgradeModal, currentPlan, getLimit, isUnlimited } =
    useSubscription();

  /**
   * @param feature     Chave da feature a verificar
   * @param currentCount Contagem atual (para limites numéricos). Omitir para booleanos.
   * @param featureLabel Rótulo legível para exibir no modal
   * @returns true = acesso permitido, false = bloqueado (modal aberto automaticamente)
   */
  const checkGate = useCallback(
    (
      feature: AllFeatureKey,
      currentCount?: number,
      featureLabel?: string,
    ): boolean => {
      const allowed = canAccess(feature, currentCount);
      if (!allowed) {
        const limit = getLimit(feature);
        openUpgradeModal(
          feature,
          featureLabel ?? feature,
          typeof limit === "number" ? limit : undefined,
        );
      }
      return allowed;
    },
    [canAccess, openUpgradeModal, getLimit],
  );

  return {
    checkGate,
    canAccess,
    currentPlan,
    isUnlimited,
  };
};
