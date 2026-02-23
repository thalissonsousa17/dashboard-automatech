import React from "react";
import { useSubscription } from "../hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, Star, Loader2 } from "lucide-react";
import type { PlanSlug } from "../types/subscription";

const BADGE_STYLES: Record<PlanSlug, { bg: string; text: string; icon: React.ReactNode }> = {
  free:    { bg: "bg-gray-100",    text: "text-gray-600",   icon: null },
  starter: { bg: "bg-blue-100",   text: "text-blue-700",   icon: <Zap size={11} /> },
  pro:     { bg: "bg-purple-100", text: "text-purple-700", icon: <Star size={11} fill="currentColor" /> },
  premium: { bg: "bg-amber-100",  text: "text-amber-700",  icon: <Crown size={11} /> },
};

interface SubscriptionBadgeProps {
  /** Se true, ao clicar navega para /dashboard/subscription */
  clickable?: boolean;
  size?: "sm" | "md";
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  clickable = true,
  size = "sm",
}) => {
  const { currentPlan, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs">
        <Loader2 size={10} className="animate-spin" />
      </span>
    );
  }

  if (!currentPlan) return null;

  const style = BADGE_STYLES[currentPlan.slug] ?? BADGE_STYLES.free;
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <span
      onClick={clickable ? () => navigate("/dashboard/subscription") : undefined}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold
        ${style.bg} ${style.text} ${textSize}
        ${clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
    >
      {style.icon}
      {currentPlan.name}
    </span>
  );
};

export default SubscriptionBadge;
