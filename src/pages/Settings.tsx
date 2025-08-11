import React, { useState, useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';
import { Settings as SettingsIcon, Webhook, Bot, ToggleLeft as Toggle, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { config, loading, updateConfig } = useConfig();
  const [formData, setFormData] = useState({
    webhook_url: '',
    bot_name: '',
    ai_test_enabled: false
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (config) {
      setFormData({
        webhook_url: config.webhook_url || '',
        bot_name: config.bot_name || '',
        ai_test_enabled: config.ai_test_enabled || false
      });
    }
  }, [config]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await updateConfig(formData);
      setMessage('Configurações salvas com sucesso!');
    } catch (error) {
      setMessage('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Configure as integrações e comportamentos do sistema</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className={`border rounded-lg p-4 ${
            message.includes('sucesso') 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Webhook Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Webhook className="w-5 h-5 mr-2" />
            Configuração do Webhook
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Webhook n8n
              </label>
              <input
                type="url"
                name="webhook_url"
                value={formData.webhook_url}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://n8n-n8n.n0gtni.easypanel.host/webhook/chatwoot-labolmed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este webhook será usado para enviar mensagens para o sistema de IA
              </p>
            </div>
          </div>
        </div>

        {/* Bot Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            Configuração do Bot
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Robô IA
              </label>
              <input
                type="text"
                name="bot_name"
                value={formData.bot_name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Assistente Automatech"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome que será exibido nas conversas com o bot
              </p>
            </div>
          </div>
        </div>

        {/* AI Test Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Toggle className="w-5 h-5 mr-2" />
            Área de Teste IA
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Ativar Teste IA no Site</h4>
                <p className="text-sm text-gray-500">
                  Permite que usuários testem o assistente IA diretamente no site
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="ai_test_enabled"
                  checked={formData.ai_test_enabled}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>

      {/* Integration Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Como Funciona a Integração</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>1. <strong>Webhook:</strong> As mensagens do chat são enviadas para o webhook do n8n configurado</p>
          <p>2. <strong>Processamento:</strong> O n8n processa a mensagem e gera uma resposta via IA</p>
          <p>3. <strong>Resposta:</strong> A resposta é enviada de volta e exibida no chat</p>
          <p>4. <strong>Configuração n8n:</strong> Configure seu workflow para receber POST requests e retornar JSON com campo "response"</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;