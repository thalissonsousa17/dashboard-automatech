import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Activity,
  Users,
  DollarSign,
  Zap,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  Clock,
  MessageSquare,
  BarChart2,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Tipos ───────────────────────────────────────────────────
interface UserLogRow {
  user_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  last_login: string | null;
  total_session_seconds: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

interface Summary {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_users: number;
}

type SortKey = keyof UserLogRow;
type SortDir = "asc" | "desc";

// ─── Utilitários ─────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatCost(usd: number): string {
  if (!usd || usd === 0) return "$ 0.0000";
  if (usd < 0.001) return `$ ${usd.toFixed(6)}`;
  return `$ ${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Card de resumo ───────────────────────────────────────────
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}> = ({ icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Cabeçalho de coluna ordenável ───────────────────────────
const Th: React.FC<{
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}> = ({ label, sortKey, current, dir, onSort, className = "" }) => {
  const active = current === sortKey;
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp size={13} className="text-blue-500" />
          ) : (
            <ChevronDown size={13} className="text-blue-500" />
          )
        ) : (
          <ChevronsUpDown size={13} className="text-gray-300" />
        )}
      </span>
    </th>
  );
};

// ─── Página principal ─────────────────────────────────────────
const AdminUserLogs: React.FC = () => {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState<UserLogRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    total_users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [emailFilter, setEmailFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>("last_login");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadData = useCallback(
    async (silent = false) => {
      if (!isAdmin) return;
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        const params: Record<string, string> = {};
        if (fromDate) params.p_from_date = new Date(fromDate).toISOString();
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          params.p_to_date = to.toISOString();
        }

        const [logsRes, summaryRes] = await Promise.all([
          db.rpc("get_admin_user_logs", params),
          db.rpc("get_admin_token_summary"),
        ]);

        if (!logsRes.error && logsRes.data) {
          setRows(
            logsRes.data.map((r: UserLogRow) => ({
              ...r,
              total_session_seconds: Number(r.total_session_seconds ?? 0),
              prompt_tokens: Number(r.prompt_tokens ?? 0),
              completion_tokens: Number(r.completion_tokens ?? 0),
              total_tokens: Number(r.total_tokens ?? 0),
              estimated_cost_usd: Number(r.estimated_cost_usd ?? 0),
            })),
          );
        }

        if (!summaryRes.error && summaryRes.data?.[0]) {
          const s = summaryRes.data[0];
          setSummary({
            total_prompt_tokens: Number(s.total_prompt_tokens ?? 0),
            total_completion_tokens: Number(s.total_completion_tokens ?? 0),
            total_tokens: Number(s.total_tokens ?? 0),
            total_cost_usd: Number(s.total_cost_usd ?? 0),
            total_users: Number(s.total_users ?? 0),
          });
        }
      } catch (err) {
        console.error("Erro ao carregar logs:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, fromDate, toDate],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let data = [...rows];

    if (emailFilter.trim()) {
      const q = emailFilter.toLowerCase();
      data = data.filter(
        (r) =>
          r.email?.toLowerCase().includes(q) ||
          r.display_name?.toLowerCase().includes(q),
      );
    }

    data.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [rows, emailFilter, sortKey, sortDir]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Acesso restrito.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity size={24} className="text-blue-600" />
            Logs de Uso
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitoramento de sessões e consumo da API OpenAI por usuário
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Zap size={20} className="text-blue-600" />}
            label="Total de Tokens"
            value={formatTokens(summary.total_tokens)}
            sub={`Prompt: ${formatTokens(summary.total_prompt_tokens)} · Completion: ${formatTokens(summary.total_completion_tokens)}`}
            color="bg-blue-50"
          />
          <SummaryCard
            icon={<DollarSign size={20} className="text-green-600" />}
            label="Custo Estimado"
            value={formatCost(summary.total_cost_usd)}
            sub="Baseado nos preços do modelo"
            color="bg-green-50"
          />
          <SummaryCard
            icon={<Users size={20} className="text-purple-600" />}
            label="Usuários com IA"
            value={String(summary.total_users)}
            sub="Que consumiram tokens"
            color="bg-purple-50"
          />
          <SummaryCard
            icon={<BarChart2 size={20} className="text-orange-600" />}
            label="Professores Ativos"
            value={String(rows.length)}
            sub="Registrados no sistema"
            color="bg-orange-50"
          />
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Email */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Buscar por email / nome
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="professor@email.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* De */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              De
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Até */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Até
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Limpar */}
          {(fromDate || toDate || emailFilter) && (
            <button
              onClick={() => {
                setEmailFilter("");
                setFromDate("");
                setToDate("");
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {filtered.length} professor{filtered.length !== 1 ? "es" : ""}
            {emailFilter || fromDate || toDate ? " (filtrado)" : ""}
          </p>
          <p className="text-xs text-gray-400">Clique no cabeçalho para ordenar</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Email" sortKey="email" current={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                <Th label="Nome" sortKey="display_name" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Telefone" sortKey="phone" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Último Login" sortKey="last_login" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Tempo Total" sortKey="total_session_seconds" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Tokens Prompt" sortKey="prompt_tokens" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Tokens Compl." sortKey="completion_tokens" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Total Tokens" sortKey="total_tokens" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Custo (USD)" sortKey="estimated_cost_usd" current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">Nenhum resultado encontrado.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.user_id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Email */}
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate">
                      {row.email ?? <span className="text-gray-400 italic">sem email</span>}
                    </td>

                    {/* Nome */}
                    <td className="px-4 py-3 text-gray-600">
                      {row.display_name ?? "–"}
                    </td>

                    {/* Telefone */}
                    <td className="px-4 py-3 text-gray-500">
                      {row.phone ?? "–"}
                    </td>

                    {/* Último login */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400 shrink-0" />
                        {formatDate(row.last_login)}
                      </span>
                    </td>

                    {/* Tempo total */}
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {formatDuration(row.total_session_seconds)}
                    </td>

                    {/* Prompt tokens */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">
                      {formatTokens(row.prompt_tokens)}
                    </td>

                    {/* Completion tokens */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">
                      {formatTokens(row.completion_tokens)}
                    </td>

                    {/* Total tokens */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.total_tokens > 100_000
                            ? "bg-red-100 text-red-700"
                            : row.total_tokens > 10_000
                            ? "bg-orange-100 text-orange-700"
                            : row.total_tokens > 0
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {formatTokens(row.total_tokens)}
                      </span>
                    </td>

                    {/* Custo */}
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <span
                        className={
                          row.estimated_cost_usd > 0
                            ? "text-green-700 font-semibold"
                            : "text-gray-400"
                        }
                      >
                        {formatCost(row.estimated_cost_usd)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com totais filtrados */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-6 text-xs text-gray-500">
            <span>
              <span className="font-semibold text-gray-700">Total tokens (filtro):</span>{" "}
              {formatTokens(filtered.reduce((s, r) => s + r.total_tokens, 0))}
            </span>
            <span>
              <span className="font-semibold text-gray-700">Custo (filtro):</span>{" "}
              {formatCost(filtered.reduce((s, r) => s + r.estimated_cost_usd, 0))}
            </span>
            <span>
              <span className="font-semibold text-gray-700">Tempo total (filtro):</span>{" "}
              {formatDuration(filtered.reduce((s, r) => s + r.total_session_seconds, 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserLogs;
