import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Plan } from "../types/subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await db
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("price_brl", { ascending: true });

        if (!error && data) setPlans(data as Plan[]);
      } catch (err) {
        console.error("Erro ao carregar planos:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return { plans, isLoading };
};
