import React, { useState, useRef, useEffect } from "react";
import { X, Send, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Ticket, useTickets } from "../../contexts/TicketContext";

interface TicketDrawerProps {
  ticket: Ticket;
  onClose: () => void;
}

const statusConfig = {
  open:     { label: "Aberto",     cls: "bg-blue-100 text-blue-700" },
  waiting:  { label: "Aguardando", cls: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolvido",  cls: "bg-green-100 text-green-700" },
};

const StatusIcon = ({ status }: { status: Ticket["status"] }) => {
  if (status === "resolved") return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === "waiting")  return <Clock className="w-3.5 h-3.5" />;
  return <AlertCircle className="w-3.5 h-3.5" />;
};

const TicketDrawer: React.FC<TicketDrawerProps> = ({ ticket, onClose }) => {
  const { addMessage } = useTickets();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    addMessage(ticket.id, text);
    setInput("");
  };

  const cfg = statusConfig[ticket.status];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">#{ticket.id.slice(-4).toUpperCase()}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                <StatusIcon status={ticket.status} />
                {cfg.label}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-snug">{ticket.subject}</p>
            <p className="text-xs text-gray-400 mt-0.5">Categoria: {ticket.category} · Aberto em {ticket.createdAt}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 ml-3">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.from === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm"
              }`}>
                {msg.from === "support" && (
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Suporte Automatech</p>
                )}
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-blue-200" : "text-gray-400"} text-right`}>
                  {msg.createdAt}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
          {ticket.status === "resolved" ? (
            <p className="text-center text-sm text-gray-400 py-1">Este ticket foi encerrado.</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TicketDrawer;
