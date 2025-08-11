import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Upload, 
  Bot, 
  Globe, 
  ArrowRight,
  Home,
  Users,
  FileText,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Brain,
  Sparkles,
  CheckCircle,
  Star
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Espaço Docente",
      description: "Publique conteúdos de aula com arquivos, vídeos e carrossel de imagens.",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      route: "/espaco-docente",
      highlights: ["Arquivos PDF, PPT, DOC", "Vídeos do YouTube/Vimeo", "Galeria de imagens", "Tags e categorias"]
    },
    {
      icon: Upload,
      title: "Trabalhos dos Alunos",
      description: "Crie pastas e receba arquivos enviados pelos alunos via link compartilhável.",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      route: "/login",
      highlights: ["Links compartilháveis", "Recebimento automático", "Avaliação com IA", "Controle de prazos"]
    },
    {
      icon: Bot,
      title: "Assistente IA",
      description: "Gere atividades, revise textos e tire dúvidas usando inteligência artificial.",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      route: "/login",
      highlights: ["Powered by ChatGPT", "Revisão de textos", "Geração de atividades", "Suporte 24/7"]
    }
  ];

  const stats = [
    { number: "100+", label: "Professores Ativos", icon: Users },
    { number: "500+", label: "Conteúdos Publicados", icon: FileText },
    { number: "1000+", label: "Trabalhos Avaliados", icon: CheckCircle },
    { number: "24/7", label: "Assistente IA", icon: Bot }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Automatech</h1>
                <p className="text-xs text-gray-500">Plataforma Educacional</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Home</span>
              </button>
              <button
                onClick={() => window.open('/login', '_blank')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
              >
                Entrar no Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Plataforma Educacional
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Automatech
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Revolucione sua experiência educacional com ferramentas inteligentes para professores e alunos. 
            Publique conteúdos, receba trabalhos e conte com IA para potencializar o aprendizado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open('/login', '_blank')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold text-lg flex items-center justify-center"
            >
              Acessar Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold text-lg"
            >
              Conhecer Funcionalidades
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🧭 Funcionalidades da Plataforma
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubra todas as ferramentas disponíveis para transformar sua experiência educacional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mr-4`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
                    </div>
                  </div>

                  <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="space-y-3 mb-8">
                    {feature.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center">
                        <CheckCircle className={`w-5 h-5 ${feature.textColor} mr-3`} />
                        <span className="text-gray-700">{highlight}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/espaco-docente')}
                    className={`w-full ${feature.bgColor} ${feature.textColor} py-3 px-6 rounded-xl hover:shadow-md transition-all font-semibold flex items-center justify-center group-hover:scale-105`}
                  >
                    {feature.title === 'Espaço Docente' 
                      ? 'Ver Conteúdos Públicos' 
                      : feature.title === 'Trabalhos dos Alunos'
                      ? 'Acessar no Dashboard'
                      : 'Acessar no Dashboard'
                    }
                    {(feature.title === 'Espaço Docente' || feature.title === 'Assistente IA') && (
                      <ArrowRight className="w-4 h-4 ml-2" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para Revolucionar sua Educação?
          </h2>
          
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Junte-se a centenas de educadores que já estão usando a Automatech para 
            criar experiências de aprendizado mais eficientes e envolventes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open('/login', '_blank')}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition-all font-semibold text-lg flex items-center justify-center"
            >
              Entrar no Dashboard
              <Star className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => navigate('/espaco-docente')}
              className="border-2 border-white/30 text-white px-8 py-4 rounded-xl hover:border-white/50 hover:bg-white/10 transition-all font-semibold text-lg"
            >
              Ver Conteúdos Públicos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Automatech</h3>
                  <p className="text-gray-400 text-sm">Plataforma Educacional</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Transformando a educação através da tecnologia e inteligência artificial. 
                Criamos ferramentas que potencializam o ensino e facilitam o aprendizado.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Funcionalidades</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📚 Espaço Docente</li>
                <li>📤 Trabalhos dos Alunos</li>
                <li>🤖 Assistente IA</li>
                <li>🌐 Acesso Público</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Central de Ajuda</li>
                <li>Documentação</li>
                <li>Contato</li>
                <li>Status do Sistema</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Automatech. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;