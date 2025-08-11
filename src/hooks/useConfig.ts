import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Config } from '../types';

// Mock config para quando Supabase não estiver configurado
const mockConfig: Config = {
  id: '1',
  webhook_url: 'https://n8n-n8n.n0gtni.easypanel.host/webhook/chatwoot-labolmed',
  bot_name: 'Assistente Automatech',
  ai_test_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
export const useConfig = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
      // Usar config mock quando Supabase não estiver configurado
      setConfig(mockConfig);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<Omit<Config, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Simular atualização em modo mock
        setConfig(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null);
        return;
      }

      if (config) {
        const { data, error } = await supabase
          .from('config')
          .update(updates)
          .eq('id', config.id)
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      } else {
        const { data, error } = await supabase
          .from('config')
          .insert([updates])
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      // Simular atualização em modo mock
      setConfig(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    updateConfig,
    fetchConfig,
  };
};