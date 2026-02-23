import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import type {
  Plan,
  Subscription,
  AllFeatureKey,
  PlanSlug,
} from "../types/subscription";
import { PLAN_ORDER as PLAN_ORD } from "../types/subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Context types ────────────────────────────────────────────
interface UpgradeModalState {
  open:         boolean;
  feature?:     string;
  featureLabel?: string;
  limit?:       number | string;
}

interface SubscriptionContextType {
  currentPlan:       Plan | null;
  subscription:      Subscription | null;
  isLoading:         boolean;
  canAccess:         (feature: AllFeatureKey, currentCount?: number) => boolean;
  getLimit:          (feature: AllFeatureKey) => number | boolean | string;
  isUnlimited:       (feature: AllFeatureKey) => boolean;
  isPaidPlan:        boolean;
  planRank:          number;
  upgradeModal:      UpgradeModalState;
  openUpgradeModal:  (feature: string, featureLabel?: string, limit?: number | string) => void;
  closeUpgradeModal: () => void;
  refreshSubscription: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

export const useSubscriptionContext = (): SubscriptionContextType => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error("useSubscriptionContext must be used inside SubscriptionProvider");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────
export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setCurrentPlan(null);
      setSubscription(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await db
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setSubscription(data as Subscription);
        setCurrentPlan((data.plan ?? null) as Plan | null);
      } else {
        // Fallback: plano free
        const { data: freePlan } = await db
          .from("plans")
          .select("*")
          .eq("slug", "free")
          .single();
        setCurrentPlan(freePlan ?? null);
        setSubscription(null);
      }
    } catch (err) {
      console.error("Erro ao carregar assinatura:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ─── Helpers ────────────────────────────────────────────────
  const getLimit = useCallback(
    (feature: AllFeatureKey): number | boolean | string => {
      return currentPlan?.features?.[feature] ?? false;
    },
    [currentPlan],
  );

  const isUnlimited = useCallback(
    (feature: AllFeatureKey): boolean => {
      const v = currentPlan?.features?.[feature];
      return v === -1;
    },
    [currentPlan],
  );

  const canAccess = useCallback(
    (feature: AllFeatureKey, currentCount?: number): boolean => {
      if (!currentPlan) return false;
      const value = currentPlan.features[feature];

      if (typeof value === "boolean") return value;
      if (value === -1) return true; // unlimited
      if (typeof value === "number") {
        if (currentCount !== undefined) return currentCount < value;
        return value > 0;
      }
      if (typeof value === "string") return value !== "" && value !== "false";
      return false;
    },
    [currentPlan],
  );

  const isPaidPlan = (currentPlan?.slug ?? "free") !== "free";
  const planRank = PLAN_ORD[(currentPlan?.slug ?? "free") as PlanSlug] ?? 0;

  const openUpgradeModal = useCallback(
    (feature: string, featureLabel?: string, limit?: number | string) => {
      setUpgradeModal({ open: true, feature, featureLabel, limit });
    },
    [],
  );
  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal({ open: false });
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        currentPlan,
        subscription,
        isLoading,
        canAccess,
        getLimit,
        isUnlimited,
        isPaidPlan,
        planRank,
        upgradeModal,
        openUpgradeModal,
        closeUpgradeModal,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
