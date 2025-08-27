import React, { useState, useRef, useEffect } from "react";
import { openAIService } from "../lib/openai";
import { ChatMessage } from "../types";
import { Send, Bot, User, Sparkles, Brain } from "lucide-react";

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      conversationHistory.push({ role: "user", content: inputMessage });

      const response = await openAIService.chatCompletion(conversationHistory);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Erro no chat:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Meu Assistente Automatech IA
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Converse com seu assistente inteligente para análise de textos,
          suporte e muito mais
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Assistente Automatech IA</h3>
              <p className="text-sm text-blue-100">
                Powered by Automatech IA • Online
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={startNewConversation}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Nova Conversa
            </button>
            <Sparkles className="w-5 h-5 text-blue-200" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <Bot className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Como posso ajudá-lo hoje?
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Sou seu assistente IA especializado em automação, análise de
                textos e suporte técnico
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <button
                  onClick={() => setInputMessage("Analise este texto para mim")}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-left transition-colors"
                >
                  <div className="font-medium text-blue-900">
                    Análise de Texto
                  </div>
                  <div className="text-sm text-blue-700">
                    Verificar coerência e sugerir melhorias
                  </div>
                </button>
                <button
                  onClick={() =>
                    setInputMessage("Como posso automatizar processos?")
                  }
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-xl text-left transition-colors"
                >
                  <div className="font-medium text-green-900">Automação</div>
                  <div className="text-sm text-green-700">
                    Dicas sobre automação de processos
                  </div>
                </button>
                <button
                  onClick={() =>
                    setInputMessage("Preciso de ajuda com um projeto")
                  }
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl text-left transition-colors"
                >
                  <div className="font-medium text-purple-900">
                    Suporte Técnico
                  </div>
                  <div className="text-sm text-purple-700">
                    Ajuda com projetos e desenvolvimento
                  </div>
                </button>
                <button
                  onClick={() =>
                    setInputMessage("Revise este conteúdo acadêmico")
                  }
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl text-left transition-colors"
                >
                  <div className="font-medium text-orange-900">
                    Revisão Acadêmica
                  </div>
                  <div className="text-sm text-orange-700">
                    Correção e feedback de trabalhos
                  </div>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.sender === "bot" && (
                    <Bot className="w-5 h-5 mt-0.5 text-gray-500 flex-shrink-0" />
                  )}
                  {message.sender === "user" && (
                    <User className="w-5 h-5 mt-0.5 text-blue-100 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-2 ${
                        message.sender === "user"
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-100">
                <div className="flex items-center space-x-3">
                  <Bot className="w-5 h-5 text-gray-500" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem para o assistente IA..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by Automatech IA • Suas conversas são salvas automaticamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
