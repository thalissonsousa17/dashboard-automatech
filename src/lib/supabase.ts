import { createClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Auth helpers
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
};

// Storage helpers
export const uploadImage = async (
  file: File,
  bucket: string = "project-images",
) => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    // Em modo mock, retornar uma URL de placeholder
    return "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400";
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file);

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
};

// Upload de arquivos para posts do espaço docente
export const uploadTeachingPostFile = async (file: File, userId: string) => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    // Em modo mock, retornar uma URL de placeholder baseada no tipo do arquivo
    const fileType = file.type;
    if (fileType.startsWith("image/")) {
      return "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800";
    }
    return `#mock-file-${file.name}`;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from("teaching-posts-files")
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("teaching-posts-files").getPublicUrl(filePath);

  return publicUrl;
};

// Download de arquivo do storage
export const downloadTeachingPostFile = async (filePath: string) => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    // Em modo mock, simular download
    return null;
  }

  const { data, error } = await supabase.storage
    .from("teaching-posts-files")
    .download(filePath);

  if (error) {
    throw error;
  }

  return data;
};

// Deletar arquivo do storage
export const deleteTeachingPostFile = async (filePath: string) => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return;
  }

  const { error } = await supabase.storage
    .from("teaching-posts-files")
    .remove([filePath]);

  if (error) {
    throw error;
  }
};
