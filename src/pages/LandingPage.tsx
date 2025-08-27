import React, { useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  BookOpen,
  QrCode,
  FileText,
  Users,
  Star,
  MessageCircle,
  Play,
  Clock,
  Zap,
  Award
} from 'lucide-react';

const AutomatechLandingPage: React.FC = () => {
  const benefits = [
    {
      icon: QrCode,
      title: "QR Chamada Automática",
      description: "Seus alunos fazem a chamada escaneando um QR Code. Sem perda de tempo, sem papel, tudo digital e automático."
    },
    {
      icon: FileText,
      title: "Materiais Organizados",
      description: "Centralize PDFs, vídeos, apresentações e atividades em um só lugar. Seus alunos acessam tudo facilmente."
    },
    {
      icon: Zap,
      title: "Correção Automatizada",
      description: "Sistema inteligente que ajuda na correção de trabalhos e fornece feedback personalizado para cada aluno."
    },
    {
      icon: Users,
      title: "Gestão de Turmas",
      description: "Organize suas disciplinas, acompanhe o progresso dos alunos e tenha relatórios completos de desempenho."
    },
    {
      icon: Clock,
      title: "Economia de Tempo",
      description: "Automatize tarefas repetitivas e foque no que realmente importa: ensinar e inspirar seus alunos."
    }
  ];

  const testimonials = [
    {
      name: "Prof. Morganna Pollynne",
      subject: "Ensino Superior",
      text: "A Automatech revolucionou minhas aulas! O QR Code para chamada economiza 20 minutos por aula, e meus alunos adoram acessar os materiais pelo celular.",
      rating: 5
    },
    {
      name: "Prof. Arthur Felipe",
      subject: "Ensino Superior",
      text: "Nunca foi tão fácil organizar conteúdos e acompanhar o progresso dos alunos. A plataforma é intuitiva e meus alunos estão mais engajados.",
      rating: 5
    }
  ];

  useEffect(() => {
    const yearElement = document.getElementById('current-year');
  const currentYear = new Date().getFullYear();
  if (yearElement) {
    yearElement.textContent = currentYear.toString();
  }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-700 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Automatech</h1>
                <p className="text-xs text-gray-500">Plataforma Educacional</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('/login', '_self')}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Acessar Dashboard
              </button>
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-br from-blue-600 to-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all font-medium"
              >
                Quero Assinar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Organize suas aulas e 
                <span className="block text-green-600">engaje seus alunos</span>
                com a Automatech
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Plataforma prática com QR Chamada, materiais digitais organizados e automação da correção de trabalhos. 
                Economize tempo e torne suas aulas mais dinâmicas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition-all font-semibold text-lg flex items-center justify-center shadow-lg"
                >
                  Quero Assinar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border-2 border-blue-600 text-green-600 px-8 py-4 rounded-xl hover:bg-green-50 transition-all font-semibold text-lg flex items-center justify-center"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Ver Demonstração
                </button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span>Sem taxa de setup</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span>Cancele quando quiser</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span>Suporte incluído</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <img 
                  src="/assets/1.png" 
                  alt="Dashboard da Automatech" 
                  className="w-full rounded-lg shadow-lg"
                />
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-blue-600 to-green-700 text-white px-4 py-2 rounded-full font-semibold text-sm">
                  ✨ Novo!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que professores escolhem a Automatech?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Desenvolvida especialmente para educadores que querem modernizar suas aulas e otimizar seu tempo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                  <benefit.icon className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Veja a Automatech em ação
            </h2>
            <p className="text-xl text-gray-600">
              Descubra como nossa plataforma pode transformar suas aulas
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-white rounded-2xl shadow-xl p-4">
                <img 
                  src="/assets/2.png" 
                  alt="QR Code para chamada" 
                  className="w-full rounded-lg"
                />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                QR Chamada: Rápido e Prático
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Seus alunos fazem a chamada em segundos escaneando o QR Code. 
                Você economiza tempo e tem controle total da frequência.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span>Chamada automática por QR Code</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span>Relatórios de frequência em tempo real</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span>Histórico completo por aluno</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-20">
            <div className="order-2 lg:order-1">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Organize todos os seus materiais
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Centralize PDFs, vídeos, apresentações e atividades. 
                Seus alunos acessam tudo de forma organizada e intuitiva.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span>Upload de arquivos ilimitado</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span>Organização por disciplina e turma</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span>Acesso mobile para os alunos</span>
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-white rounded-2xl shadow-xl p-4">
                <img 
                  src="/assets/3.png" 
                  alt="Organização de materiais" 
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              O que os professores estão dizendo
            </h2>
            <p className="text-xl text-gray-600">
              Mais de 100 educadores já transformaram suas aulas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6 italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Comece hoje mesmo por apenas
          </h2>
          
          <div className="bg-white rounded-3xl p-12 shadow-2xl mb-8">
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-gray-900 mb-2">
                R$ 50
                <span className="text-2xl text-gray-600 font-normal">/mês</span>
              </div>
              <p className="text-xl text-gray-600">
                Acesso completo à plataforma
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span>QR Chamada ilimitada</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span>Upload de materiais sem limite</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span>Gestão completa de turmas</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span>Correção automatizada</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span>Relatórios detalhados</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span>Suporte prioritário</span>
              </div>
            </div>

            <button
              onClick={() => window.open('https://wa.me/5583986844693?text=Olá! Quero assinar a Automatech por R$ 50/mês', '_blank')}
              className="w-full bg-green-600 text-white py-4 px-8 rounded-xl hover:bg-gradient-to-br from-blue-600 to-green-700 transition-all font-bold text-xl shadow-lg"
            >
              Quero Assinar Agora
            </button>

            <p className="text-gray-500 text-sm mt-4">
              Sem taxa de setup • Cancele quando quiser • Suporte incluído
            </p>
          </div>

          <p className="text-green-100 text-lg">
            Junte-se a mais de 100 professores que já transformaram suas aulas
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-800 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Automatech</h3>
                  <p className="text-gray-400 text-sm">Plataforma Educacional</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Transformando a educação através da tecnologia. 
                Ajudamos professores a economizar tempo e engajar mais seus alunos.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Funcionalidades</h4>
              <ul className="space-y-2 text-gray-400">
                <li>QR Chamada</li>
                <li>Gestão de Materiais</li>
                <li>Correção Automatizada</li>
                <li>Relatórios</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Central de Ajuda</li>
                <li>WhatsApp: (83) 98684-4693</li>
                <li>Email: suporte@automatech.com</li>
                <li>Horário: 8h às 18h</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy;<span id='current-year'></span> Automatech. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <a 
        href="https://wa.me/5583986844693?text=Olá! Tenho interesse na plataforma Automatech" 
        className="fixed bottom-6 right-6 p-4 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors z-50 animate-pulse"
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
};

export default AutomatechLandingPage;