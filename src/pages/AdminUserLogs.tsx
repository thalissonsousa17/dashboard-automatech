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
  Crown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
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
  // Assinatura
  plan_name: string | null;
  plan_slug: string | null;
  plan_price_brl: number;
  subscription_status: string | null;
  subscription_since: string | null;
  subscription_end: string | null;
  cancel_at_period_end: boolean;
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

// ─── Constantes de plano ──────────────────────────────────────
const PLAN_STYLE: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  free:    { bg: "bg-gray-100",    text: "text-gray-600",   dot: "bg-gray-400",   ring: "ring-gray-200" },
  starter: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   ring: "ring-blue-200" },
  pro:     { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", ring: "ring-purple-200" },
  premium: { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500",  ring: "ring-amber-200" },
};

const PLAN_DIST_STYLE: Record<string, { bar: string; bg: string; text: string; border: string }> = {
  free:    { bar: "bg-gray-400",   bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200" },
  starter: { bar: "bg-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  pro:     { bar: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  premium: { bar: "bg-amber-500",  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  active:   { bg: "bg-green-100", text: "text-green-700",  label: "Ativo" },
  past_due: { bg: "bg-red-100",   text: "text-red-700",    label: "Em atraso" },
  canceled: { bg: "bg-gray-100",  text: "text-gray-600",   label: "Cancelado" },
  trialing: { bg: "bg-sky-100",   text: "text-sky-700",    label: "Trial" },
  canceling:{ bg: "bg-orange-100",text: "text-orange-700", label: "Cancela ao fim" },
};

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

function formatShortDate(iso: string | null): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
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

function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

// ─── Sub-componentes ──────────────────────────────────────────
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

const PlanBadge: React.FC<{ slug: string | null; name: string | null }> = ({ slug, name }) => {
  const key = slug ?? "free";
  const style = PLAN_STYLE[key] ?? PLAN_STYLE.free;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {name ?? "Gratuito"}
    </span>
  );
};

const StatusBadge: React.FC<{
  status: string | null;
  slug: string | null;
  cancelAtPeriodEnd: boolean;
  endDate: string | null;
}> = ({ status, slug, cancelAtPeriodEnd, endDate }) => {
  const isPaid = slug && slug !== "free";
  if (!isPaid || !status) {
    return <span className="text-xs text-gray-400 italic">–</span>;
  }

  const key = cancelAtPeriodEnd && status === "active" ? "canceling" : (status ?? "free");
  const style = STATUS_STYLE[key] ?? STATUS_STYLE.active;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${style.bg} ${style.text}`}>
        {style.label}
      </span>
      {endDate && (
        <span className="text-xs text-gray-400">
          {cancelAtPeriodEnd ? "Até" : "Renova"} {formatShortDate(endDate)}
        </span>
      )}
    </div>
  );
};

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
  const [rpcError, setRpcError] = useState<string | null>(null);

  // Filtros
  const [emailFilter, setEmailFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");

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

        if (logsRes.error) {
          console.error("RPC get_admin_user_logs error:", logsRes.error);
          setRpcError(logsRes.error.message || "Erro ao carregar usuários.");
        } else if (logsRes.data) {
          setRpcError(null);
          setRows(
            logsRes.data.map((r: UserLogRow) => ({
              ...r,
              total_session_seconds: Number(r.total_session_seconds ?? 0),
              prompt_tokens:         Number(r.prompt_tokens ?? 0),
              completion_tokens:     Number(r.completion_tokens ?? 0),
              total_tokens:          Number(r.total_tokens ?? 0),
              estimated_cost_usd:    Number(r.estimated_cost_usd ?? 0),
              plan_price_brl:        Number(r.plan_price_brl ?? 0),
              cancel_at_period_end:  Boolean(r.cancel_at_period_end),
            })),
          );
        }

        if (!summaryRes.error && summaryRes.data?.[0]) {
          const s = summaryRes.data[0];
          setSummary({
            total_prompt_tokens:     Number(s.total_prompt_tokens ?? 0),
            total_completion_tokens: Number(s.total_completion_tokens ?? 0),
            total_tokens:            Number(s.total_tokens ?? 0),
            total_cost_usd:          Number(s.total_cost_usd ?? 0),
            total_users:             Number(s.total_users ?? 0),
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

  // ── Métricas de assinatura (derivadas dos rows) ──────────────
  const subStats = useMemo(() => {
    const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, premium: 0 };
    let mrr = 0;
    let paidActive = 0;
    let pastDue = 0;
    let cancelingSoon = 0;

    rows.forEach((r) => {
      const slug = r.plan_slug ?? "free";
      planCounts[slug] = (planCounts[slug] ?? 0) + 1;

      const isPaid = slug !== "free";
      if (isPaid && r.subscription_status === "active") {
        paidActive++;
        if (!r.cancel_at_period_end) {
          mrr += r.plan_price_brl ?? 0;
        } else {
          cancelingSoon++;
        }
      }
      if (r.subscription_status === "past_due") pastDue++;
    });

    return { planCounts, mrr, paidActive, pastDue, cancelingSoon };
  }, [rows]);

  const planDistTotal = rows.length || 1;
  const PLAN_DIST_ORDER = ["free", "starter", "pro", "premium"] as const;
  const PLAN_DIST_LABELS: Record<string, string> = {
    free: "Gratuito", starter: "Starter", pro: "Pro", premium: "Premium"
  };

  // ── Filtragem ─────────────────────────────────────────────────
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

    if (planFilter !== "all") {
      data = data.filter((r) => (r.plan_slug ?? "free") === planFilter);
    }

    data.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [rows, emailFilter, planFilter, sortKey, sortDir]);

  const hasFilters = !!(fromDate || toDate || emailFilter || planFilter !== "all");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Acesso restrito.
      </div>
    );
  }

  const TOTAL_COLS = 12;

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
            Monitoramento de sessões, consumo de IA e assinaturas por usuário
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

      {/* ── Banner de erro de configuração ── */}
      {rpcError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Função SQL não encontrada no banco de dados</p>
            <p className="text-xs text-red-600 mt-1">
              Execute o arquivo <code className="font-mono bg-red-100 px-1 rounded">supabase_admin_logs_complete.sql</code> no SQL Editor do Supabase para ativar esta página.
            </p>
            <p className="text-xs text-red-400 mt-1 font-mono">{rpcError}</p>
          </div>
        </div>
      )}

      {/* ── Cards de uso de IA ── */}
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
            label="Custo Estimado (IA)"
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
            label="Total de Professores"
            value={String(rows.length)}
            sub="Registrados no sistema"
            color="bg-orange-50"
          />
        </div>
      )}

      {/* ── Seção de Assinaturas ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Crown size={18} className="text-amber-500" />
          <h2 className="text-base font-semibold text-gray-800">Assinaturas</h2>
        </div>

        {loading ? (
          <div className="p-5 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Métricas principais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* MRR */}
              <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 flex items-start gap-3">
                <div className="p-2.5 bg-green-100 rounded-xl">
                  <TrendingUp size={18} className="text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wide">MRR Estimado</p>
                  <p className="text-2xl font-bold text-gray-800 mt-0.5">{formatBRL(subStats.mrr)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{subStats.paidActive} assinante{subStats.paidActive !== 1 ? "s" : ""} ativo{subStats.paidActive !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Assinantes pagos */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 flex items-start gap-3">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <CheckCircle size={18} className="text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Pagos Ativos</p>
                  <p className="text-2xl font-bold text-gray-800 mt-0.5">{subStats.paidActive}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {subStats.cancelingSoon > 0
                      ? `${subStats.cancelingSoon} cancelando ao fim`
                      : "Sem cancelamentos agendados"}
                  </p>
                </div>
              </div>

              {/* Em atraso */}
              <div className={`rounded-xl border p-4 flex items-start gap-3 ${subStats.pastDue > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                <div className={`p-2.5 rounded-xl ${subStats.pastDue > 0 ? "bg-red-100" : "bg-gray-100"}`}>
                  <AlertTriangle size={18} className={subStats.pastDue > 0 ? "text-red-700" : "text-gray-400"} />
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${subStats.pastDue > 0 ? "text-red-700" : "text-gray-500"}`}>Em Atraso</p>
                  <p className={`text-2xl font-bold mt-0.5 ${subStats.pastDue > 0 ? "text-red-700" : "text-gray-400"}`}>{subStats.pastDue}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pagamento pendente</p>
                </div>
              </div>
            </div>

            {/* Distribuição por plano */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Distribuição por plano</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLAN_DIST_ORDER.map((slug) => {
                  const count = subStats.planCounts[slug] ?? 0;
                  const pct = Math.round((count / planDistTotal) * 100);
                  const style = PLAN_DIST_STYLE[slug];
                  return (
                    <button
                      key={slug}
                      onClick={() => setPlanFilter(planFilter === slug ? "all" : slug)}
                      className={`rounded-xl border p-3.5 text-left transition-all ${style.bg} ${style.border}
                        ${planFilter === slug ? "ring-2 ring-offset-1 " + PLAN_STYLE[slug].ring : "hover:shadow-sm"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                          {PLAN_DIST_LABELS[slug]}
                        </span>
                        <span className={`text-xs font-medium ${style.text} opacity-70`}>{pct}%</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-800">{count}</p>
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${style.bar} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {slug === "free" ? "Gratuito" : `R$ ${slug === "starter" ? "29" : slug === "pro" ? "79" : "99"}/mês`}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Clique em um plano para filtrar a tabela abaixo
              </p>
            </div>
          </div>
        )}
      </div>

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

          {/* Plano */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plano</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">Todos</option>
              <option value="free">Gratuito</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* De */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
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
          {hasFilters && (
            <button
              onClick={() => {
                setEmailFilter("");
                setFromDate("");
                setToDate("");
                setPlanFilter("all");
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {filtered.length} professor{filtered.length !== 1 ? "es" : ""}
            {hasFilters ? " (filtrado)" : ""}
          </p>
          <p className="text-xs text-gray-400">Clique no cabeçalho para ordenar</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Email"         sortKey="email"                 current={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                <Th label="Nome"          sortKey="display_name"          current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Plano"         sortKey="plan_slug"             current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Assinatura"    sortKey="subscription_status"   current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Desde"         sortKey="subscription_since"    current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Último Login"  sortKey="last_login"            current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Tempo Total"   sortKey="total_session_seconds" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Tokens Prompt" sortKey="prompt_tokens"         current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Tokens Compl." sortKey="completion_tokens"     current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Total Tokens"  sortKey="total_tokens"          current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Custo (USD)"   sortKey="estimated_cost_usd"    current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Receita/mês"   sortKey="plan_price_brl"        current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(TOTAL_COLS)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLS} className="text-center py-12 text-gray-400">
                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">Nenhum resultado encontrado.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isPaid = row.plan_slug && row.plan_slug !== "free";
                  return (
                    <tr
                      key={row.user_id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* Email */}
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate">
                        {row.email ?? <span className="text-gray-400 italic">sem email</span>}
                      </td>

                      {/* Nome */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {row.display_name ?? <span className="text-gray-400 italic">–</span>}
                      </td>

                      {/* Plano */}
                      <td className="px-4 py-3">
                        <PlanBadge slug={row.plan_slug} name={row.plan_name} />
                      </td>

                      {/* Status da assinatura */}
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={row.subscription_status}
                          slug={row.plan_slug}
                          cancelAtPeriodEnd={row.cancel_at_period_end}
                          endDate={row.subscription_end}
                        />
                      </td>

                      {/* Desde (data de início da assinatura) */}
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {isPaid && row.subscription_since
                          ? formatShortDate(row.subscription_since)
                          : <span className="text-gray-300">–</span>}
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

                      {/* Custo IA */}
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

                      {/* Receita mensal */}
                      <td className="px-4 py-3 text-right">
                        {isPaid && row.subscription_status === "active" ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {formatBRL(row.plan_price_brl)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com totais filtrados */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-6 text-xs text-gray-500">
            <span>
              <span className="font-semibold text-gray-700">Tokens (seleção):</span>{" "}
              {formatTokens(filtered.reduce((s, r) => s + r.total_tokens, 0))}
            </span>
            <span>
              <span className="font-semibold text-gray-700">Custo IA (seleção):</span>{" "}
              {formatCost(filtered.reduce((s, r) => s + r.estimated_cost_usd, 0))}
            </span>
            <span>
              <span className="font-semibold text-gray-700">Tempo total (seleção):</span>{" "}
              {formatDuration(filtered.reduce((s, r) => s + r.total_session_seconds, 0))}
            </span>
            <span>
              <span className="font-semibold text-gray-700">Receita (seleção):</span>{" "}
              {formatBRL(
                filtered.reduce(
                  (s, r) =>
                    s + (r.plan_slug !== "free" && r.subscription_status === "active" ? r.plan_price_brl : 0),
                  0,
                ),
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserLogs;
