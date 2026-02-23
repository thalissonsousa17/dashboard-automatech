import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  QrCode,
  FileText,
  Users,
  Star,
  Zap,
  Check,
  X,
  Crown,
  MessageCircle,
  Loader2,
  Brain,
  BarChart3,
  Sparkles,
  ChevronRight,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── Planos estáticos para a landing ────────────────────────
const LANDING_PLANS = [
  {
    slug: "free",
    name: "Gratuito",
    price: 0,
    priceId: null,
    recommended: false,
    features: [
      { label: "Provas/mês com IA", value: "1" },
      { label: "Workspaces", value: "1" },
      { label: "Publicar Material", value: false },
      { label: "QR Chamada", value: false },
      { label: "Anotações", value: "1" },
      { label: "Suporte", value: false },
    ],
  },
  {
    slug: "starter",
    name: "Starter",
    price: 29,
    priceId: "price_1T3lznBNpKinyuTebIjzvY2Q",
    recommended: false,
    features: [
      { label: "Provas/mês com IA", value: "15" },
      { label: "Workspaces", value: "5" },
      { label: "Publicar Material", value: true },
      { label: "QR Chamada", value: true },
      { label: "Anotações", value: "10" },
      { label: "Suporte", value: "Email" },
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    price: 79,
    priceId: "price_1T3m1TBNpKinyuTe4WsXqaLj",
    recommended: true,
    features: [
      { label: "Provas/mês com IA", value: "30" },
      { label: "Workspaces", value: "15" },
      { label: "Publicar Material", value: true },
      { label: "QR Chamada", value: true },
      { label: "Anotações", value: "Ilimitado" },
      { label: "Suporte", value: "Prioritário" },
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    price: 99,
    priceId: "price_1T3m2UBNpKinyuTeIJnC6AHE",
    recommended: false,
    features: [
      { label: "Provas/mês com IA", value: "Ilimitado" },
      { label: "Workspaces", value: "Ilimitado" },
      { label: "Publicar Material", value: true },
      { label: "QR Chamada", value: true },
      { label: "Anotações", value: "Ilimitado" },
      { label: "Suporte", value: "Dedicado" },
    ],
  },
];

const STATS = [
  { value: "100+", label: "Professores ativos" },
  { value: "5.000+", label: "Provas geradas" },
  { value: "20 min", label: "Economizadas por aula" },
  { value: "98%", label: "Satisfação" },
];

const BENEFITS = [
  {
    icon: QrCode,
    color: "blue",
    title: "QR Chamada Automática",
    description:
      "Alunos fazem a presença escaneando um QR Code. Sem papel, sem perda de tempo — controle total em segundos.",
    available: true,
  },
  {
    icon: Brain,
    color: "purple",
    title: "Provas com Inteligência Artificial",
    description:
      "Gere provas completas com questões dissertativas e múltipla escolha em minutos. A IA cuida de tudo.",
    available: true,
  },
  {
    icon: FileText,
    color: "green",
    title: "Materiais Organizados",
    description:
      "Centralize PDFs, vídeos e atividades em workspaces organizados. Seus alunos acessam tudo facilmente.",
    available: true,
  },
  {
    icon: Users,
    color: "orange",
    title: "Gestão de Turmas",
    description:
      "Organize disciplinas, acompanhe frequência e tenha relatórios completos de desempenho por aluno.",
    available: true,
  },
  {
    icon: Zap,
    color: "yellow",
    title: "Correção Automatizada",
    description:
      "Um sistema inteligente que corrige e fornece feedback personalizado para cada aluno automaticamente.",
    available: false,
  },
  {
    icon: BarChart3,
    color: "teal",
    title: "Assistente Automatech IA",
    description:
      "Assistente virtual para análise de texto, automação de tarefas e suporte acadêmico em tempo real.",
    available: false,
  },
];

const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   badge: "bg-blue-100 text-blue-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  badge: "bg-green-100 text-green-700" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", badge: "bg-yellow-100 text-yellow-700" },
  teal:   { bg: "bg-teal-50",   icon: "text-teal-600",   badge: "bg-teal-100 text-teal-700" },
};

const AutomatechLandingPage: React.FC = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = async (priceId: string, planSlug: string) => {
    setLoadingPlan(planSlug);
    try {
      const frontendUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            priceId,
            successUrl: `${frontendUrl}/dashboard/subscription?success=true`,
            cancelUrl: `${frontendUrl}/#pricing`,
          },
        },
      );
      if (error || !data?.url) {
        console.error("Checkout error:", error || data);
        alert("Erro ao iniciar checkout. Tente novamente.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("handleSubscribe error:", err);
      alert("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">Automatech</span>
                <span className="hidden sm:block text-xs text-gray-400 leading-none">Plataforma Educacional</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
              <button onClick={() => scrollTo("features")} className="hover:text-blue-600 transition-colors">Funcionalidades</button>
              <button onClick={() => scrollTo("pricing")} className="hover:text-blue-600 transition-colors">Preços</button>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open("/login", "_self")}
                className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
              >
                Entrar
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Começar agora
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-green-100 rounded-full opacity-40 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4" />
              Plataforma Educacional com IA
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left */}
            <div>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
                Organize suas aulas e{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-500">
                  engaje seus alunos
                </span>{" "}
                com IA
              </h1>

              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Gere provas em minutos, faça chamada por QR Code, publique materiais
                e acompanhe seus alunos — tudo em uma só plataforma.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <button
                  onClick={() => scrollTo("pricing")}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-7 py-3.5 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  Começar gratuitamente
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollTo("features")}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-base px-7 py-3.5 rounded-xl shadow-sm transition-all hover:shadow-md"
                >
                  Ver funcionalidades
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Sem taxa de setup</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Cancele quando quiser</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Suporte em português</span>
              </div>
            </div>

            {/* Right — Dashboard preview */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Browser bar */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 text-center">
                      dashboard.automatech.app.br
                    </div>
                  </div>
                </div>
                <img
                  src="/assets/1.png"
                  alt="Dashboard da Automatech"
                  className="w-full"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Prova gerada com IA</p>
                  <p className="text-xs text-gray-400">em menos de 2 minutos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ───────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Desenvolvida especialmente para educadores que querem modernizar
              suas aulas e recuperar horas do dia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => {
              const c = colorMap[b.color];
              return (
                <div
                  key={i}
                  className="relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                >
                  {!b.available && (
                    <span className="absolute top-5 right-5 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
                      Em breve
                    </span>
                  )}
                  <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center mb-5`}>
                    <b.icon className={`w-6 h-6 ${c.icon}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 1 ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="bg-gray-50 rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <img src="/assets/2.png" alt="QR Code para chamada" className="w-full" />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4">
              <QrCode className="w-4 h-4" /> QR Chamada
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-5">
              Chamada em segundos,<br /> sem papel
            </h2>
            <p className="text-gray-500 text-lg mb-7 leading-relaxed">
              Seus alunos fazem a chamada escaneando um QR Code gerado na hora.
              Você economiza até 20 minutos por aula e tem o controle total da frequência.
            </p>
            <ul className="space-y-3">
              {["Chamada automática por QR Code", "Relatórios de frequência em tempo real", "Histórico completo por aluno"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 2 ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full mb-4">
              <FileText className="w-4 h-4" /> Materiais
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-5">
              Todos os seus materiais,<br /> organizados
            </h2>
            <p className="text-gray-500 text-lg mb-7 leading-relaxed">
              Crie workspaces por disciplina, suba PDFs, vídeos e apresentações.
              Seus alunos acessam tudo de forma simples e organizada.
            </p>
            <ul className="space-y-3">
              {["Workspaces por disciplina e turma", "Upload de qualquer tipo de arquivo", "Acesso mobile para os alunos"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-purple-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2 bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <img src="/assets/3.png" alt="Organização de materiais" className="w-full" />
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Depoimentos</p>
            <h2 className="text-4xl font-bold text-gray-900">
              Professores que já transformaram suas aulas
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: "Prof. Morganna Pollynne",
                subject: "Ensino Superior",
                text: "A Automatech revolucionou minhas aulas! O QR Code para chamada economiza 20 minutos por aula, e meus alunos adoram acessar os materiais pelo celular.",
              },
              {
                name: "Prof. Arthur Felipe",
                subject: "Ensino Superior",
                text: "Nunca foi tão fácil organizar conteúdos e acompanhar o progresso dos alunos. A plataforma é intuitiva e meus alunos estão muito mais engajados.",
              },
            ].map((t, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 text-base leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">
                    {t.name.split(" ")[1][0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Dúvidas</p>
            <h2 className="text-4xl font-bold text-gray-900">Perguntas frequentes</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "É necessário cartão de crédito para utilizar o plano gratuito?",
                a: "Não. O plano Gratuito não exige nenhum dado de pagamento. Basta criar sua conta e começar a usar imediatamente, sem nenhum compromisso financeiro.",
              },
              {
                q: "Posso cancelar minha assinatura a qualquer momento?",
                a: "Sim, sem burocracia. Acesse Configurações → Assinatura e cancele com um clique. Seu acesso ao plano pago permanece ativo até o fim do período já pago.",
              },
              {
                q: "Como recebo meu acesso após a contratação de um plano?",
                a: "Após a confirmação do pagamento, você receberá automaticamente um e-mail com seu login e senha de acesso. O processo é imediato e totalmente automático.",
              },
              {
                q: "A plataforma atende professores de todos os níveis de ensino?",
                a: "Sim. O Automatech foi desenvolvido para atender professores do ensino fundamental, médio, técnico e superior, de instituições públicas ou privadas, além de profissionais autônomos e cursos livres.",
              },
              {
                q: "Posso fazer upgrade ou downgrade do meu plano?",
                a: "Sim. Você pode alterar seu plano a qualquer momento pelo painel da conta. O upgrade é aplicado imediatamente e o downgrade entra em vigor no próximo ciclo de cobrança.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-4">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-10">
            Ainda tem dúvidas?{" "}
            <a
              href="https://wa.me/5583986844693"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:underline"
            >
              Fale conosco no WhatsApp
            </a>
          </p>
        </div>
      </section>
      
      

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 bg-white/10 text-blue-300 border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Crown className="w-4 h-4" /> Planos e Preços
            </span>
            <h2 className="text-4xl font-bold text-white mb-4">
              Escolha o plano ideal para você
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Comece gratuitamente e evolua conforme suas necessidades.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-12">
            {LANDING_PLANS.map((plan) => (
              <div
                key={plan.slug}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200
                  ${plan.recommended
                    ? "bg-white shadow-2xl ring-2 ring-blue-500 scale-105"
                    : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                      <Star className="w-3 h-3 fill-current" /> Mais popular
                    </span>
                  </div>
                )}

                <p className={`text-base font-bold mb-1 mt-2 ${plan.recommended ? "text-gray-900" : "text-white"}`}>
                  {plan.name}
                </p>

                <div className="mb-6">
                  {plan.price === 0 ? (
                    <p className={`text-3xl font-extrabold ${plan.recommended ? "text-gray-900" : "text-white"}`}>Grátis</p>
                  ) : (
                    <p className={`text-3xl font-extrabold ${plan.recommended ? "text-gray-900" : "text-white"}`}>
                      R$ {plan.price}
                      <span className={`text-sm font-normal ml-1 ${plan.recommended ? "text-gray-500" : "text-white/50"}`}>/mês</span>
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-center justify-between gap-2">
                      <span className={`text-sm ${plan.recommended ? "text-gray-600" : "text-white/60"}`}>{f.label}</span>
                      {typeof f.value === "boolean" ? (
                        f.value
                          ? <Check className="w-4 h-4 text-green-400 shrink-0" />
                          : <X className="w-4 h-4 text-white/20 shrink-0" />
                      ) : (
                        <span className={`text-sm font-semibold shrink-0 ${
                          f.value === "Ilimitado" ? "text-green-400" : plan.recommended ? "text-gray-800" : "text-white"
                        }`}>{f.value}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {plan.price === 0 ? (
                  <button
                    onClick={() => window.open("/login", "_self")}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
                  >
                    Começar grátis
                  </button>
                ) : (
                  <button
                    onClick={() => plan.priceId && handleSubscribe(plan.priceId, plan.slug)}
                    disabled={loadingPlan === plan.slug}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed
                      ${plan.recommended
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                        : "bg-white text-gray-900 hover:bg-gray-50"
                      }`}
                  >
                    {loadingPlan === plan.slug ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                    ) : (
                      <>Assinar agora <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400 text-sm">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Sem taxa de setup</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Cancele quando quiser</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Pagamento 100% seguro</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Suporte em português</span>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-white/5 text-white pt-14 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">Automatech</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Transformando a educação através da tecnologia. Ajudamos professores
                a economizar tempo e engajar mais seus alunos.
              </p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4 text-gray-300">Produto</p>
              <ul className="space-y-2.5 text-sm text-gray-500">
                {["QR Chamada", "Gestão de Materiais", "Provas com IA", "Relatórios"].map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4 text-gray-300">Suporte</p>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>Central de Ajuda</li>
                <li>WhatsApp: (83) 98684-4693</li>
                <li>suporte@automatech.app.br</li>
                <li>Seg–Sex: 8h às 18h</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4 text-gray-300">Conta</p>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <button onClick={() => window.open("/login", "_self")} className="hover:text-white transition-colors">
                    Acessar Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo("pricing")} className="hover:text-white transition-colors">
                    Criar conta grátis
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Automatech. Todos os direitos reservados.</p>
            <p>Feito com 💙 para professores brasileiros</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float */}
      <a
        href="https://wa.me/5583986844693?text=Olá! Tenho interesse na plataforma Automatech"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 z-50"
        target="_blank"
        rel="noopener noreferrer"
        title="Fale conosco no WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
};

export default AutomatechLandingPage;
