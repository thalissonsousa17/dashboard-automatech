import React, { useState } from "react";
import { useScrollReveal } from '../hooks/useScrollReveal';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  GraduationCap,
  Check,
  Zap,
  QrCode,
  Star,
  MessageCircle,
  Crown,
  X,
  Loader2,
  Brain,
  Users,
  BarChart3,
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

const colorMap: Record<string, { bg: string; icon: string; badge: string; border: string; glow: string }> = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-400",   badge: "bg-blue-500/10 text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/20" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", badge: "bg-purple-500/10 text-purple-300", border: "border-purple-500/20", glow: "shadow-purple-500/20" },
  green:  { bg: "bg-green-500/10",  icon: "text-green-400",  badge: "bg-green-500/10 text-green-300", border: "border-green-500/20", glow: "shadow-green-500/20" },
  orange: { bg: "bg-orange-500/10", icon: "text-orange-400", badge: "bg-orange-500/10 text-orange-300", border: "border-orange-500/20", glow: "shadow-orange-500/20" },
  yellow: { bg: "bg-yellow-500/10", icon: "text-yellow-400", badge: "bg-yellow-500/10 text-yellow-300", border: "border-yellow-500/20", glow: "shadow-yellow-500/20" },
  teal:   { bg: "bg-teal-500/10",   icon: "text-teal-400",   badge: "bg-teal-500/10 text-teal-300", border: "border-teal-500/20", glow: "shadow-teal-500/20" },
};

const AutomatechLandingPage: React.FC = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Initialize scroll reveal
  useScrollReveal();

  const handleSubscribe = async (priceId: string, slug: string) => {
    setLoadingPlan(slug);
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
    <div className="min-h-screen bg-slate-950 text-white font-inter selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden relative">
      {/* ── Background Overhaul ──────────────────────────── */}
      <div className="fixed inset-0 z-0 bg-mesh pointer-events-none" />
      <div className="fixed inset-0 z-[1] bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-slow-pulse" />
        <div className="absolute bottom-[20%] right-[-5%] w-[35%] h-[35%] bg-emerald-600/10 rounded-full blur-[120px] animate-slow-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] bg-purple-600/5 rounded-full blur-[100px] animate-slow-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* ── Header ────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="font-outfit">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Automatech</span>
                <p className="text-[10px] text-blue-400 font-medium tracking-widest uppercase">Elite Portal</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
              <button 
                onClick={() => scrollTo("features")} 
                className="hover:text-white transition-colors relative group"
              >
                Funcionalidades
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
              </button>
              <button 
                onClick={() => scrollTo("pricing")} 
                className="hover:text-white transition-colors relative group"
              >
                Preços
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
              </button>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.open("/login", "_self")}
                className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors px-4 py-2"
              >
                Entrar
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar agora
                  <ChevronRight className="w-4 h-4" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero section ──────────────────────────────────── */}
      <section className="relative z-10 pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center reveal-hidden">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full mb-8 hover:bg-white/10 transition-colors cursor-default group">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">v4.0 Alpha • Intelligent Neural Engine</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black font-outfit tracking-tighter mb-8 leading-[0.9] text-white">
            <span className="reveal-hidden reveal-delay-100 inline-block pointer-events-none">Domine a sua</span> <br />
            <span className="text-gradient-blue inline-block reveal-hidden reveal-delay-200 pointer-events-none">sala de aula.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/40 max-w-3xl mx-auto mb-12 font-inter font-light leading-relaxed reveal-hidden reveal-delay-300">
            A Automatech é o nexus definitivo para educadores de elite, <br className="hidden md:block" />
            unindo IA generativa e automação tática.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center reveal-hidden reveal-delay-400">
            <button
              onClick={() => scrollTo("pricing")}
              className="flex items-center justify-center gap-2 bg-white text-slate-950 font-bold text-lg px-10 py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
            >
              Experimente Grátis
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollTo("features")}
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 text-white font-semibold text-lg px-8 py-4 rounded-full transition-all hover:bg-white/10"
            >
              Ver recursos
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500 reveal-hidden reveal-delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide uppercase">Alta Precisão IA</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide uppercase">Criptografia Ponta a Ponta</span>
            </div>
          </div>
        </div>

        {/* Hero Preview */}
        <div className="relative max-w-7xl mx-auto mt-20 reveal-hidden reveal-delay-600">
          <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
          <div className="relative glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-float">
            {/* Decorative Browser Elements */}
            <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500/40 rounded-full" />
                <div className="w-3 h-3 bg-amber-500/40 rounded-full" />
                <div className="w-3 h-3 bg-emerald-500/40 rounded-full" />
              </div>
              <div className="bg-white/5 px-4 py-1 rounded text-[10px] text-white/30 border border-white/5">
                console.automatech.academy
              </div>
              <div className="w-10" />
            </div>
            
            <div className="p-1 relative">
              <img
                src="/assets/1.png"
                alt="Platform Preview"
                className="w-full opacity-90 rounded-b-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            </div>
          </div>

          {/* Floating Components */}
          <div className="absolute -bottom-6 -left-6 glass-card p-5 rounded-2xl border border-blue-500/20 shadow-2xl animate-float" style={{ animationDelay: '1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <Brain className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Neural Engine v2</h4>
                <p className="text-[10px] text-blue-400 font-medium tracking-tight">Active Automation</p>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 -right-8 glass-card p-4 rounded-2xl border border-emerald-500/20 shadow-2xl hidden xl:block animate-float" style={{ animationDelay: '2.5s' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-bold">Speed: 0.8s</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────── */}
      <section className="relative z-10 py-16 reveal-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="glass-card rounded-[2rem] border-white/5 p-12 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center overflow-hidden relative">
            <div className="absolute inset-0 bg-blue-500/5 blur-3xl -z-10" />
            {STATS.map((s, i) => (
              <div key={i} className="relative group reveal-hidden" style={{ transitionDelay: `${i * 100}ms` }}>
                <p className="text-5xl font-black font-outfit text-gradient-gold mb-2 group-hover:scale-110 transition-transform duration-300">
                  {s.value}
                </p>
                <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ───────────────────────────────────────── */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 reveal-hidden">
            <h2 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Plataforma</h2>
            <h3 className="text-4xl md:text-5xl font-extrabold font-outfit text-white mb-6">
              Ecossistema completo de <br className="hidden md:block" />
              <span className="text-gradient-blue">inovação educacional</span>
            </h3>
            <p className="text-lg text-white/50 max-w-2xl mx-auto font-inter">
              Simplifique sua rotina com ferramentas de elite desenhadas para a modernidade acadêmica.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((b, i) => {
              const c = colorMap[b.color];
              return (
                <div
                  key={i}
                  className={`group relative glass-card p-8 rounded-3xl border border-white/5 hover:border-white/20 transition-all duration-500 overflow-hidden reveal-hidden ${!b.available ? 'opacity-70 grayscale hover:grayscale-0' : ''}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${c.bg.replace('/10', '/30')} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  
                  {!b.available && (
                    <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      Beta
                    </div>
                  )}

                  <div className={`w-14 h-14 ${c.bg} rounded-2xl flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform duration-500 shadow-2xl ${c.glow}`}>
                    <b.icon className={`w-7 h-7 ${c.icon}`} />
                  </div>

                  <h4 className="text-xl font-bold font-outfit text-white mb-4 group-hover:translate-x-1 transition-transform">{b.title}</h4>
                  <p className="text-white/40 text-sm leading-relaxed font-inter mb-6">
                    {b.description}
                  </p>
                  
                  {b.available && (
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all">
                      SAIBA MAIS <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 1 ────────────────────────────── */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative group reveal-hidden">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative glass-card rounded-[2rem] border-white/10 overflow-hidden shadow-2xl">
               <img src="/assets/2.png" alt="QR Code" className="w-full opacity-80" />
               <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
            </div>
            
            {/* Floating Overlay */}
            <div className="absolute top-10 -right-6 glass-card p-6 rounded-2xl border-white/20 animate-float shadow-2xl">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Frequência</p>
                    <p className="text-[10px] text-white/40 leading-none">Sincronizado</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex flex-col reveal-hidden reveal-delay-200">
            <span className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-emerald-400 mb-6 uppercase">
              <QrCode className="w-4 h-4" /> Automação de Frequência
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-outfit text-white mb-8 leading-tight">
              Chamada inteligente,<br />
              <span className="text-emerald-400">em tempo real.</span>
            </h2>
            <p className="text-white/50 text-lg mb-10 leading-relaxed font-inter">
              Elimine a perda de tempo com listas de chamada manuais. Seus alunos confirmam presença instantaneamente via QR Code dinâmico.
            </p>
            
            <div className="space-y-6">
              {[
                { t: "Segurança Avançada", d: "Validação por geolocalização e IP do dispositivo." },
                { t: "Relatórios de ELite", d: "Gráficos detalhados de engajamento por turma e aluno." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white mb-1">{item.t}</h5>
                    <p className="text-sm text-white/40">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 2 ────────────────────────────── */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 reveal-hidden reveal-delay-200">
            <span className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-blue-400 mb-6 uppercase">
              <FileText className="w-4 h-4" /> Gestão de Conhecimento
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-outfit text-white mb-8 leading-tight">
              Seus materiais <br />
              <span className="text-blue-400">centralizados.</span>
            </h2>
            <p className="text-white/50 text-lg mb-10 leading-relaxed font-inter">
              Construa uma biblioteca digital única. Organize disciplinas em workspaces inteligentes e facilite o acesso dos seus alunos em qualquer device.
            </p>
            
            <ul className="space-y-4">
              {["Workspaces Colaborativos", "Multi-format (PDF, Video, Docs)", "Cloud Sync Automático"].map((item) => (
                <li key={item} className="flex items-center gap-4 text-white/70 font-semibold group cursor-pointer hover:text-white transition-colors">
                  <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center group-hover:border-blue-500/40 transition-all">
                    <Check className="w-4 h-4 text-blue-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 lg:order-2 relative group reveal-hidden">
            <div className="absolute -inset-4 bg-blue-600/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative glass-card rounded-[2rem] border-white/10 overflow-hidden shadow-2xl translate-y-4 group-hover:translate-y-0 transition-transform duration-1000">
               <img src="/assets/3.png" alt="Materials" className="w-full opacity-80" />
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-transparent" />
            </div>
            
            <div className="absolute -bottom-10 -right-4 glass-card p-5 rounded-2xl border-white/20 animate-float shadow-2xl">
                <div className="flex gap-1">
                   {[1,2,3].map(i => <div key={i} className="w-1.5 h-10 bg-blue-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-slate-900/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 reveal-hidden">
            <h2 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Depoimentos</h2>
            <h3 className="text-4xl md:text-5xl font-extrabold font-outfit text-white">
              A escolha dos <br className="hidden md:block" />
              <span className="text-gradient-gold">melhores educadores.</span>
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
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
              <div key={i} className="glass-card border-white/5 p-10 rounded-[2.5rem] relative group hover:border-white/20 transition-all duration-500 reveal-hidden" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                   <Star className="w-5 h-5 text-white fill-current" />
                </div>
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  ))}
                </div>
                <p className="text-white/70 text-lg leading-relaxed mb-10 font-inter italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-xl">
                    {t.name.split(" ")[1][0]}
                  </div>
                  <div>
                    <p className="font-bold text-white font-outfit">{t.name}</p>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{t.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20 reveal-hidden">
             <h2 className="text-[10px] font-black tracking-[0.4em] text-blue-400 mb-4 uppercase">Suporte</h2>
             <h3 className="text-4xl font-black font-outfit text-white">FAQ</h3>
          </div>
          <div className="space-y-4">
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
                a: "Sim. O Edu Automatech foi desenvolvido para atender professores do ensino fundamental, médio, técnico e superior, de instituições públicas ou privadas, além de profissionais autônomos e cursos livres.",
              },
              {
                q: "Posso fazer upgrade ou downgrade do meu plano?",
                a: "Sim. Você pode alterar seu plano a qualquer momento pelo painel da conta. O upgrade é aplicado imediatamente e o downgrade entra em vigor no próximo ciclo de cobrança.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-card border-white/5 rounded-2xl overflow-hidden transition-all duration-300 reveal-hidden"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <button
                  className="w-full flex items-center justify-between px-8 py-6 text-left gap-4 group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-bold text-white/80 group-hover:text-white transition-colors text-sm sm:text-base">{item.q}</span>
                  <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${openFaq === i ? "rotate-180 bg-blue-500/20" : ""}`}>
                     <ChevronDown className={`w-4 h-4 text-white/40 ${openFaq === i ? "text-blue-400" : ""}`} />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-8 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-white/40 text-sm leading-relaxed border-t border-white/5 pt-6">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-16 glass-card p-6 rounded-2xl border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 reveal-hidden">
             <p className="text-sm text-white/40">Ainda tem dúvidas? Estamos online.</p>
             <a
              href="https://wa.me/5583986844693"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
            >
              Suporte WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 relative bg-slate-900/50">
        <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20 reveal-hidden">
            <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase mb-6">
              <Crown className="w-4 h-4" /> Investimento
            </span>
            <h2 className="text-4xl md:text-6xl font-black font-outfit text-white mb-6 leading-tight">
              Escolha seu <span className="text-gradient-blue">nível de poder.</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Planos desenhados para escalar conforme sua carreira docente evolui.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
            {LANDING_PLANS.map((plan, i) => (
              <div
                key={plan.slug}
                className={`relative flex flex-col rounded-[2rem] p-8 transition-all duration-500 group overflow-hidden reveal-hidden
                  ${plan.recommended
                    ? "bg-blue-600 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] sm:scale-105 z-10 border-white/20"
                    : "glass-card border-white/5 hover:border-white/20"
                  }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 p-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/20">
                      <Star className="w-3 h-3 text-white fill-current" />
                      <span className="text-[9px] font-black text-white uppercase tracking-tighter">ELITE</span>
                    </div>
                  </div>
                )}

                <p className={`text-lg font-black font-outfit mb-4 uppercase tracking-wider ${plan.recommended ? "text-white" : "text-white/60"}`}>
                  {plan.name}
                </p>

                <div className="mb-8">
                  {plan.price === 0 ? (
                    <p className={`text-4xl font-black font-outfit ${plan.recommended ? "text-white" : "text-white"}`}>Free</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-sm font-bold ${plan.recommended ? "text-white/80" : "text-white/40"}`}>R$</span>
                      <p className={`text-5xl font-black font-outfit ${plan.recommended ? "text-white" : "text-white"}`}>
                        {plan.price}
                      </p>
                      <span className={`text-xs font-bold ${plan.recommended ? "text-white/60" : "text-white/20"}`}>/mês</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-center justify-between gap-2 group/feat">
                      <span className={`text-[11px] font-semibold tracking-wide ${plan.recommended ? "text-white/80" : "text-white/40"}`}>{f.label}</span>
                      {typeof f.value === "boolean" ? (
                        f.value
                          ? <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.recommended ? 'bg-white/20' : 'bg-emerald-500/20'}`}><Check className={`w-3 h-3 ${plan.recommended ? 'text-white' : 'text-emerald-400'}`} /></div>
                          : <X className="w-4 h-4 text-white/5" />
                      ) : (
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          f.value === "Ilimitado" 
                            ? (plan.recommended ? "bg-white/20 shadow-xl" : "bg-blue-500/20 text-blue-400 shadow-xl shadow-blue-500/10") 
                            : (plan.recommended ? "text-white" : "text-white/70")
                        }`}>{f.value}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {plan.price === 0 ? (
                  <button
                    onClick={() => window.open("/login", "_self")}
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition-all shadow-xl"
                  >
                    Ativar agora
                  </button>
                ) : (
                  <button
                    onClick={() => plan.priceId && handleSubscribe(plan.priceId, plan.slug)}
                    disabled={loadingPlan === plan.slug}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xl
                      ${plan.recommended
                        ? "bg-white text-blue-600 hover:scale-[1.02] active:scale-95"
                        : "bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-95"
                      }`}
                  >
                    {loadingPlan === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Assinar Plano <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-[10px] font-black tracking-widest text-white/30 uppercase border-t border-white/5 pt-12 reveal-hidden">
            <span className="flex items-center gap-2 grayscale opacity-50"><CheckCircle className="w-3 h-3 text-blue-400" /> No setup fee</span>
            <span className="flex items-center gap-2 grayscale opacity-50"><CheckCircle className="w-3 h-3 text-blue-400" /> Cancel anytime</span>
            <span className="flex items-center gap-2 grayscale opacity-50"><CheckCircle className="w-3 h-3 text-blue-400" /> SECURE STRIPE PAY</span>
            <span className="flex items-center gap-2 grayscale opacity-50"><CheckCircle className="w-3 h-3 text-blue-400" /> 24/7 Support</span>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-white/5 text-white pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-black font-outfit uppercase tracking-tighter">Automatech</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs">
                Empoderando educadores com tecnologia IA de ponta para transformar a sala de aula do futuro.
              </p>
              <div className="flex gap-4">
                 {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all cursor-pointer"><Star className="w-4 h-4" /></div>)}
              </div>
            </div>

            <div>
              <p className="font-black text-[10px] uppercase tracking-[0.3em] mb-8 text-blue-400">Plataforma</p>
              <ul className="space-y-4 text-sm text-white/40">
                {["Neural CRM", "Smart QR", "IA Engine", "Analytics Hub"].map(i => <li key={i} className="hover:text-white transition-colors cursor-pointer">{i}</li>)}
              </ul>
            </div>

            <div>
              <p className="font-black text-[10px] uppercase tracking-[0.3em] mb-8 text-blue-400">Nexus Hub</p>
              <ul className="space-y-4 text-sm text-white/40">
                <li className="hover:text-white transition-colors cursor-pointer">Central de Operações</li>
                <li className="hover:text-white transition-colors cursor-pointer">Webinar Series</li>
                <li className="hover:text-white transition-colors cursor-pointer">Developer API</li>
                <li className="hover:text-white transition-colors cursor-pointer">Status Nexus</li>
              </ul>
            </div>

            <div>
              <p className="font-black text-[10px] uppercase tracking-[0.3em] mb-8 text-blue-400">Terminal</p>
              <ul className="space-y-4 text-sm text-white/40">
                <li>
                  <button onClick={() => window.open("/login", "_self")} className="hover:text-white transition-colors">
                    Dashboard Access
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo("pricing")} className="hover:text-white transition-colors">
                    Initialize Account
                  </button>
                </li>
                <li className="text-blue-500 font-bold">Protocol v4.0.2</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            <p>© {new Date().getFullYear()} Automatech Corporation. Precise Academic Intelligence.</p>
            <div className="flex gap-8">
               <span className="hover:text-white transition-all cursor-pointer">Legal Protocol</span>
               <span className="hover:text-white transition-all cursor-pointer">Privacy Neural Link</span>
               <span className="hover:text-white transition-all cursor-pointer">Cookies Cache</span>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float Premium */}
      <a
        href="https://wa.me/5583986844693?text=Olá! Tenho interesse na plataforma Automatech"
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 group border border-white/20 overflow-hidden"
        target="_blank"
        rel="noopener noreferrer"
        title="Fale conosco no WhatsApp"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <MessageCircle className="w-7 h-7 relative z-10" />
      </a>
    </div>
  );
};

export default AutomatechLandingPage;
