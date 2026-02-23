import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Ticket,
  BookOpen,
  Phone,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertCircle,
  CheckCheck,
  MessageSquare,
  Brain,
  QrCode,
  CreditCard,
  User,
  Mail,
  Send,
  ExternalLink,
} from "lucide-react";
import { useTickets, Ticket as TicketType } from "../contexts/TicketContext";
import TicketDrawer from "../components/Suporte/TicketDrawer";
import NewTicketModal from "../components/Suporte/NewTicketModal";

// ─── Types ────────────────────────────────────────────────────

type Tab = "tickets" | "knowledge" | "contact";

const STATUS_CONFIG = {
  open:     { label: "Aberto",     cls: "bg-blue-100 text-blue-700",  Icon: AlertCircle },
  waiting:  { label: "Aguardando", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  resolved: { label: "Resolvido",  cls: "bg-green-100 text-green-700", Icon: CheckCircle },
};

// ─── Knowledge Base data ──────────────────────────────────────

interface KBArticle {
  title: string;
  summary: string;
  content: string;
}
interface KBCategory {
  id: string;
  Icon: React.ElementType;
  title: string;
  color: string;
  articles: KBArticle[];
}

const KB_CATEGORIES: KBCategory[] = [
  {
    id: "provas",
    Icon: Brain,
    title: "Gerador de Provas IA",
    color: "blue",
    articles: [
      {
        title: "Como configurar o número de questões",
        summary: "Aprenda a definir tipos e quantidade de questões por prova.",
        content: "No Gerador de Provas, selecione o número total de questões desejado. Você pode definir separadamente quantas serão de múltipla escolha e quantas serão dissertativas. A IA distribuirá as questões de acordo com sua configuração.",
      },
      {
        title: "Tipos de questão suportados",
        summary: "Múltipla escolha, dissertativas e provas mistas.",
        content: "A plataforma suporta três formatos: (1) Múltipla escolha — sempre com 5 alternativas A,B,C,D,E; (2) Dissertativas — questões abertas para desenvolvimento textual; (3) Mista — combinação dos dois tipos, com dissertativas sempre ao final da prova.",
      },
      {
        title: "Como usar material de referência",
        summary: "Envie PDFs ou cole texto para contextualizar a geração.",
        content: "Na tela de geração, você pode fazer upload de um arquivo PDF ou colar texto diretamente na área de material de referência. A IA utilizará esse conteúdo como base para criar questões mais contextualizadas e relevantes para seus alunos.",
      },
    ],
  },
  {
    id: "qr",
    Icon: QrCode,
    title: "QR Chamada",
    color: "green",
    articles: [
      {
        title: "Como criar uma chamada por QR Code",
        summary: "Passo a passo para gerar e compartilhar o QR Code.",
        content: "Acesse o QR Chamada pelo menu lateral. Clique em 'Nova Chamada', defina a turma e o tempo limite. Um QR Code será gerado para você projetar na sala. Os alunos escaneiam com o celular e registram presença automaticamente.",
      },
      {
        title: "Visualizando relatório de presença",
        summary: "Acompanhe em tempo real quem registrou presença.",
        content: "Na tela da chamada ativa, você vê em tempo real a lista de alunos que registraram presença. Ao encerrar, o relatório completo fica disponível para download em PDF ou exportação para planilha.",
      },
    ],
  },
  {
    id: "plano",
    Icon: CreditCard,
    title: "Assinatura & Planos",
    color: "purple",
    articles: [
      {
        title: "Como fazer upgrade de plano",
        summary: "Acesse Plano & Assinatura e escolha o plano desejado.",
        content: "Vá em 'Plano & Assinatura' no menu lateral. Clique em 'Fazer Upgrade' e escolha o plano desejado. O pagamento é processado via Stripe de forma segura e o acesso às novas funcionalidades é liberado imediatamente após a confirmação.",
      },
      {
        title: "Política de cancelamento",
        summary: "Você pode cancelar a qualquer momento sem perder o acesso.",
        content: "Ao cancelar sua assinatura, você mantém o acesso a todas as funcionalidades até o fim do período já pago. Após esse prazo, sua conta retorna automaticamente para o plano gratuito. Não há multa ou taxa de cancelamento.",
      },
      {
        title: "Como solicitar reembolso",
        summary: "Reembolsos são processados em até 7 dias úteis.",
        content: "Se você cancelou dentro de 7 dias após a cobrança, entre em contato com nosso suporte via email ou WhatsApp. Reembolsos são analisados caso a caso e processados em até 7 dias úteis para o cartão original.",
      },
    ],
  },
  {
    id: "conta",
    Icon: User,
    title: "Conta & Perfil",
    color: "orange",
    articles: [
      {
        title: "Como alterar minha foto de perfil",
        summary: "Em Meu Perfil, clique na imagem e faça upload.",
        content: "Acesse 'Meu Perfil' pelo menu lateral ou pelo dropdown do avatar no Header. Clique na imagem de perfil atual e selecione uma nova foto do seu computador. Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB.",
      },
      {
        title: "Alterando minha senha",
        summary: "Redefina sua senha de forma segura.",
        content: "Para alterar sua senha, use a opção 'Esqueci minha senha' na tela de login e siga as instruções enviadas ao seu email. Alternativamente, entre em contato com o suporte para assistência.",
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────

const Suporte: React.FC = () => {
  const location = useLocation();
  const { tickets, loading } = useTickets();

  const [activeTab, setActiveTab]         = useState<Tab>("tickets");
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  // Knowledge base state
  const [kbSearch, setKbSearch]           = useState("");
  const [kbCategory, setKbCategory]       = useState<string | null>(null);
  const [kbArticle, setKbArticle]         = useState<KBArticle | null>(null);

  // Contact form
  const [contactSubject, setContactSubject]   = useState("");
  const [contactCategory, setContactCategory] = useState("Técnico");
  const [contactMessage, setContactMessage]   = useState("");
  const [contactSent, setContactSent]         = useState(false);
  const { createTicket } = useTickets();

  // Open ticket drawer when navigated from notification
  useEffect(() => {
    const state = location.state as { openTicketId?: string } | undefined;
    if (state?.openTicketId) {
      const t = tickets.find((tk) => tk.id === state.openTicketId);
      if (t) {
        setActiveTab("tickets");
        setSelectedTicket(t);
      }
    }
  }, [location.state, tickets]);

  // Keep selectedTicket in sync (so new messages appear)
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) return;
    await createTicket(contactSubject.trim(), contactMessage.trim(), contactCategory);
    setContactSent(true);
    setContactSubject("");
    setContactMessage("");
    setTimeout(() => {
      setContactSent(false);
      setActiveTab("tickets");
    }, 2000);
  };

  const filteredKB = kbCategory
    ? KB_CATEGORIES.filter((c) => c.id === kbCategory)
    : kbSearch
    ? KB_CATEGORIES.map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
            a.summary.toLowerCase().includes(kbSearch.toLowerCase())
        ),
      })).filter((cat) => cat.articles.length > 0)
    : KB_CATEGORIES;

  const colorMap: Record<string, string> = {
    blue:   "bg-blue-100 text-blue-600",
    green:  "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
        <p className="text-sm text-gray-500 mt-1">Abra tickets, consulte a base de conhecimento ou entre em contato.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {(
          [
            { id: "tickets",   label: "Meus Tickets",          Icon: Ticket },
            { id: "knowledge", label: "Base de Conhecimento",   Icon: BookOpen },
            { id: "contact",   label: "Contato",                Icon: Phone },
          ] as { id: Tab; label: string; Icon: React.ElementType }[]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === "tickets" && tickets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-full">
                {tickets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Meus Tickets ──────────────────────────────── */}
      {activeTab === "tickets" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} no total</p>
            <button
              onClick={() => setShowNewTicket(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Ticket
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm">Carregando tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Você ainda não tem tickets abertos.</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="mt-4 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Abrir primeiro ticket
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assunto</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aberto em</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((t, idx) => {
                    const cfg = STATUS_CONFIG[t.status];
                    const StatusIcon = cfg.Icon;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                          #{tickets.length - idx}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                          {t.subject}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-500">{t.category}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-400 text-xs">{t.createdAt}</td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Base de Conhecimento ──────────────────────── */}
      {activeTab === "knowledge" && (
        <div>
          {/* Breadcrumb */}
          {(kbCategory || kbArticle) && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <button onClick={() => { setKbCategory(null); setKbArticle(null); }} className="hover:text-blue-600">
                Categorias
              </button>
              {kbCategory && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <button onClick={() => setKbArticle(null)} className="hover:text-blue-600">
                    {KB_CATEGORIES.find((c) => c.id === kbCategory)?.title}
                  </button>
                </>
              )}
              {kbArticle && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-gray-800 font-medium">{kbArticle.title}</span>
                </>
              )}
            </div>
          )}

          {/* Article view */}
          {kbArticle ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{kbArticle.title}</h2>
              <p className="text-gray-500 text-sm mb-4 italic">{kbArticle.summary}</p>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                {kbArticle.content.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                <span className="text-sm text-gray-500">Este artigo foi útil?</span>
                <button className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-green-500" /> Sim
                </button>
                <button
                  onClick={() => { setActiveTab("contact"); setKbCategory(null); setKbArticle(null); }}
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Não, preciso de ajuda
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              {!kbCategory && (
                <div className="relative mb-6">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    placeholder="Buscar artigos..."
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* Categories or filtered list */}
              {!kbSearch && !kbCategory ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {KB_CATEGORIES.map((cat) => {
                    const CatIcon = cat.Icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setKbCategory(cat.id)}
                        className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left group"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[cat.color]}`}>
                          <CatIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{cat.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{cat.articles.length} artigo{cat.articles.length !== 1 ? "s" : ""}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-blue-400 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredKB.map((cat) => (
                    <div key={cat.id}>
                      {kbSearch && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat.title}</p>
                      )}
                      {cat.articles.map((article) => (
                        <button
                          key={article.title}
                          onClick={() => setKbArticle(article)}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left mb-2 group"
                        >
                          <div>
                            <p className="font-medium text-gray-800 group-hover:text-blue-700 transition-colors">{article.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{article.summary}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-4 group-hover:text-blue-400 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ))}
                  {filteredKB.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum artigo encontrado para "{kbSearch}"</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB 3: Contato ───────────────────────────────────── */}
      {activeTab === "contact" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Enviar mensagem</h2>

              {contactSent ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                  <p className="font-semibold text-gray-900">Mensagem enviada!</p>
                  <p className="text-sm text-gray-500 mt-1">Redirecionando para seus tickets...</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Assunto</label>
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="Resumo do problema"
                      required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                    <select
                      value={contactCategory}
                      onChange={(e) => setContactCategory(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                    >
                      {["Técnico", "Financeiro", "Dúvidas", "Outro"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensagem</label>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Descreva detalhadamente..."
                      required
                      rows={5}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!contactSubject.trim() || !contactMessage.trim()}
                    className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Enviar mensagem
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            {/* System status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status do Sistema</p>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-700">Todos os sistemas operacionais</span>
              </div>
              <div className="mt-3 space-y-2">
                {["API IA", "QR Chamada", "Supabase", "Pagamentos"].map((s) => (
                  <div key={s} className="flex items-center justify-between text-xs text-gray-600">
                    <span>{s}</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" /> Operacional
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct contact */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contato Direto</p>
              <div className="space-y-3">
                <a
                  href="https://wa.me/5583986844693"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-gray-700 hover:text-green-700 transition-colors group"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-xs text-gray-400">(83) 98684-4693</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                </a>
                <a
                  href="mailto:suporte@automatech.app.br"
                  className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-700 transition-colors group"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-xs text-gray-400">suporte@automatech.app.br</p>
                  </div>
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-3">
                Seg–Sex · 9h–18h (Horário de Brasília)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Drawer */}
      {selectedTicket && (
        <TicketDrawer ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* New Ticket Modal */}
      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreated={() => setShowNewTicket(false)}
        />
      )}
    </div>
  );
};

export default Suporte;
