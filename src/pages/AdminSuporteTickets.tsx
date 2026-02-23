import React, { useState, useEffect } from "react";
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  MessageSquare,
  User,
} from "lucide-react";
import useAdminTickets, { AdminTicket } from "../hooks/useAdminTickets";
import TicketDrawer from "../components/Suporte/TicketDrawer";

type StatusFilter = "all" | "open" | "waiting" | "resolved";

const STATUS_CONFIG = {
  open:     { label: "Aberto",     cls: "bg-blue-100 text-blue-700",   Icon: AlertCircle },
  waiting:  { label: "Aguardando", cls: "bg-amber-100 text-amber-700",  Icon: Clock },
  resolved: { label: "Resolvido",  cls: "bg-green-100 text-green-700",  Icon: CheckCircle },
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Todos",
  open: "Abertos",
  waiting: "Aguardando",
  resolved: "Resolvidos",
};

const AdminSuporteTickets: React.FC = () => {
  const { tickets, loading, fetchAllTickets, sendSupportMessage, updateStatus } =
    useAdminTickets();

  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Keep selectedTicket in sync when tickets update
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  const filtered = tickets.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch =
      !search ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    waiting: tickets.filter((t) => t.status === "waiting").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-blue-600" />
            Tickets de Suporte
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie e responda os tickets abertos pelos professores.
          </p>
        </div>
        <button
          onClick={fetchAllTickets}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Stats + Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["all", "open", "waiting", "resolved"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {FILTER_LABELS[s]}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                statusFilter === s ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[s]}
            </span>
          </button>
        ))}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por assunto ou professor..."
            className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white w-64 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm">Carregando tickets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {tickets.length === 0
              ? "Nenhum ticket aberto ainda."
              : "Nenhum ticket corresponde ao filtro."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assunto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Professor</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Msgs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t, idx) => {
                const cfg = STATUS_CONFIG[t.status];
                const StatusIcon = cfg.Icon;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      #{filtered.length - idx}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px]">
                      <p className="truncate">{t.subject}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700 truncate max-w-[120px]">
                          {t.userName}
                        </span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-500 text-sm">
                      {t.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-400 text-xs">
                      {t.createdAt}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        {t.messages.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Ticket Drawer */}
      {selectedTicket && (
        <TicketDrawer
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          isAdmin
          onSendMessage={sendSupportMessage}
          onStatusChange={updateStatus}
        />
      )}
    </div>
  );
};

export default AdminSuporteTickets;
