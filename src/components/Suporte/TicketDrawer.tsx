import React, { useState, useRef, useEffect } from "react";
import { X, Send, Clock, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { useTickets } from "../../contexts/TicketContext";

export interface DrawerTicket {
  id: string;
  subject: string;
  category: string;
  status: "open" | "waiting" | "resolved";
  createdAt: string;
  messages: { id: string; from: "user" | "support"; text: string; createdAt: string }[];
  userName?: string; // admin only
}

interface TicketDrawerProps {
  ticket: DrawerTicket;
  onClose: () => void;
  /** Admin override: called instead of TicketContext.addMessage */
  onSendMessage?: (ticketId: string, text: string) => Promise<void>;
  /** Admin only: change ticket status */
  onStatusChange?: (ticketId: string, status: DrawerTicket["status"]) => void;
  isAdmin?: boolean;
}

const STATUS_CONFIG = {
  open:     { label: "Aberto",     cls: "bg-blue-100 text-blue-700",  Icon: AlertCircle },
  waiting:  { label: "Aguardando", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  resolved: { label: "Resolvido",  cls: "bg-green-100 text-green-700", Icon: CheckCircle },
};

const STATUSES: DrawerTicket["status"][] = ["open", "waiting", "resolved"];

const TicketDrawer: React.FC<TicketDrawerProps> = ({
  ticket,
  onClose,
  onSendMessage,
  onStatusChange,
  isAdmin = false,
}) => {
  const { addMessage } = useTickets();
  const [input, setInput] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    if (onSendMessage) {
      await onSendMessage(ticket.id, text);
    } else {
      await addMessage(ticket.id, text);
    }
    setInput("");
    setSending(false);
  };

  const cfg = STATUS_CONFIG[ticket.status];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400">
                #{ticket.id.slice(0, 8).toUpperCase()}
              </span>

              {/* Status — admin pode alterar */}
              {isAdmin && onStatusChange ? (
                <div className="relative">
                  <button
                    onClick={() => setStatusOpen((v) => !v)}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer ${cfg.cls}`}
                  >
                    <cfg.Icon className="w-3 h-3" />
                    {cfg.label}
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>
                  {statusOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[130px]">
                      {STATUSES.map((s) => {
                        const sc = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              onStatusChange(ticket.id, s);
                              setStatusOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50 ${
                              ticket.status === s ? "opacity-50 cursor-default" : ""
                            }`}
                          >
                            <sc.Icon className="w-3 h-3" />
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                  <cfg.Icon className="w-3 h-3" />
                  {cfg.label}
                </span>
              )}
            </div>

            <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
              {ticket.subject}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAdmin && ticket.userName && (
                <span className="font-medium text-blue-600 mr-1">{ticket.userName} ·</span>
              )}
              {ticket.category} · {ticket.createdAt}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
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
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.from === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                {msg.from === "support" && (
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">
                    Suporte Automatech
                  </p>
                )}
                {msg.from === "user" && isAdmin && ticket.userName && (
                  <p className="text-[10px] font-semibold text-blue-200 mb-1">
                    {ticket.userName}
                  </p>
                )}
                <p>{msg.text}</p>
                <p
                  className={`text-[10px] mt-1 text-right ${
                    msg.from === "user" ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {msg.createdAt}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
          {!isAdmin && ticket.status === "resolved" ? (
            <p className="text-center text-sm text-gray-400 py-1">
              Este ticket foi encerrado.
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isAdmin ? "Responder como suporte..." : "Digite sua mensagem..."}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={`px-3 py-2.5 text-white rounded-xl transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isAdmin
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
          {isAdmin && (
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Respondendo como <strong>Suporte Automatech</strong>
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default TicketDrawer;
