import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface HelpItem {
  id: string;
  type: "doc" | "video";
  title: string;
  url?: string;
  content?: string;
  video_id?: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type HelpItemInput = {
  type: "doc" | "video";
  title: string;
  url?: string;
  content?: string;
  video_id?: string;
  sort_order?: number;
  active?: boolean;
};

const db = supabase as any;

/** Extrai o videoId de URLs do YouTube (youtu.be / watch?v= / embed/) */
export function extractVideoId(input: string): string {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const parts = url.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx !== -1) return parts[embedIdx + 1];
    }
  } catch {
    // não é URL válida, retorna o input limpo
  }
  return trimmed;
}

export function useHelpItems() {
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("help_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) setItems(data as HelpItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (input: HelpItemInput): Promise<HelpItem | null> => {
    const { data, error } = await db
      .from("help_items")
      .insert({
        type: input.type,
        title: input.title.trim(),
        url: input.url?.trim() || null,
        content: input.content?.trim() || null,
        video_id: input.video_id?.trim() || null,
        sort_order: input.sort_order ?? items.filter((i) => i.type === input.type).length,
        active: input.active ?? true,
      })
      .select()
      .single();
    if (error || !data) {
      console.error("HELP_ITEMS CREATE ERROR:", error?.code, error?.message, error?.details);
      return null;
    }
    const item = data as HelpItem;
    setItems((prev) => [...prev, item].sort((a, b) => a.sort_order - b.sort_order));
    return item;
  };

  const updateItem = async (
    id: string,
    patch: Partial<HelpItemInput>
  ): Promise<boolean> => {
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title.trim();
    if (patch.url !== undefined) payload.url = patch.url.trim() || null;
    if (patch.content !== undefined) payload.content = patch.content.trim() || null;
    if (patch.video_id !== undefined) payload.video_id = patch.video_id.trim() || null;
    if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;
    if (patch.active !== undefined) payload.active = patch.active;

    const { error } = await db.from("help_items").update(payload).eq("id", id);
    if (error) {
      console.error("HELP_ITEMS UPDATE ERROR:", error?.code, error?.message, error?.details);
      return false;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...payload } : item))
    );
    return true;
  };

  const toggleActive = async (id: string): Promise<void> => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    await updateItem(id, { active: !item.active });
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    const { error } = await db.from("help_items").delete().eq("id", id);
    if (error) {
      console.error("HELP_ITEMS DELETE ERROR:", error?.code, error?.message, error?.details);
      return false;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    return true;
  };

  const docs = items.filter((i) => i.type === "doc");
  const videos = items.filter((i) => i.type === "video");

  return {
    items,
    docs,
    videos,
    loading,
    fetchItems,
    createItem,
    updateItem,
    toggleActive,
    deleteItem,
  };
}