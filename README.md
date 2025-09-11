# 📊 Dashboard AutomaTech

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

> Um dashboard moderno e responsivo para automação e gerenciamento de processos tecnológicos, desenvolvido com React e Supabase.

## 🚀 Experimente Online

🌐 **[Acesse a Demonstração Online](https://seu-projeto.vercel.app)** *(Adicionar link de produção)*

## 📸 Demonstração

<!-- Adicione aqui um GIF ou imagem demonstrando o uso do dashboard -->
![Dashboard Demo](./assets/demo.gif)

*Se você ainda não possui uma imagem/GIF de demonstração, considere capturar uma tela do seu dashboard em funcionamento para mostrar as principais funcionalidades.*

## ✨ Funcionalidades Principais

| Funcionalidade | Descrição | Status |
|---|---|---|
| 📊 Dashboard Responsivo | Interface adaptável para desktop e mobile | ✅ |
| 🔐 Autenticação | Sistema de login e registro seguro | ✅ |
| 📈 Visualização de Dados | Gráficos e métricas em tempo real | ✅ |
| ⚙️ Automação | Ferramentas para automatizar processos | 🚧 |
| 📱 PWA Ready | Aplicação web progressiva | 📋 |
| 🌙 Modo Escuro | Alternância entre temas claro e escuro | 📋 |

**Legenda:** ✅ Implementado | 🚧 Em desenvolvimento | 📋 Planejado

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18+ com TypeScript
- **Backend:** Supabase (Database + Auth + Storage)
- **Styling:** CSS Modules / Styled Components
- **Build:** Vite
- **Deploy:** Vercel / Netlify

## 📦 Instalação e Configuração

### Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Conta no Supabase

### 1️⃣ Clone o repositório

```bash
# Clone o projeto
git clone https://github.com/thalissonsousa17/dashboard-automatech.git

# Entre no diretório
cd dashboard-automatech
```

### 2️⃣ Instale as dependências

```bash
# Com npm
npm install

# Ou com yarn
yarn install
```

### 3️⃣ Configure as variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite o arquivo .env.local com suas credenciais do Supabase
# VITE_SUPABASE_URL=sua_url_do_supabase
# VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 4️⃣ Execute o projeto

```bash
# Modo desenvolvimento
npm run dev

# O projeto estará disponível em http://localhost:5173
```

### 5️⃣ Build para produção

```bash
# Gerar build de produção
npm run build

# Preview do build
npm run preview
```

## 🤝 Como Contribuir

Contribuições são sempre bem-vindas! Siga os passos abaixo para contribuir com o projeto:

### 🔧 Configuração para Desenvolvimento

1. **Fork este repositório**
   - Clique no botão "Fork" no canto superior direito do GitHub

2. **Clone seu fork localmente:**
```bash
git clone https://github.com/SEU_USERNAME/dashboard-automatech.git
cd dashboard-automatech
```

3. **Adicione o repositório original como upstream:**
```bash
git remote add upstream https://github.com/thalissonsousa17/dashboard-automatech.git
```

4. **Instale as dependências:**
```bash
npm install
```

### 🔄 Desenvolvimento

1. **Crie uma branch para sua feature:**
```bash
git checkout -b feature/minha-nova-feature
```

2. **Faça suas alterações e commits:**
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

3. **Mantenha seu fork atualizado:**
```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 📤 Pull Request

1. **Push da sua branch:**
```bash
git push origin feature/minha-nova-feature
```

2. **Abra um Pull Request:**
   • Vá para o repositório original no GitHub
   • Clique em "New Pull Request"
   • Selecione sua branch e descreva as mudanças

3. **Aguarde o review:**
   • Responda aos comentários se houver
   • Faça ajustes se necessário

### 📝 Diretrizes para Contribuição

- ✅ Siga o padrão de código existente
- ✅ Adicione testes para novas funcionalidades
- ✅ Atualize a documentação se necessário
- ✅ Use mensagens de commit claras e descritivas
- ✅ Teste suas alterações antes de enviar o PR

#### Padrão de Commits

Usamos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` alterações na documentação
- `style:` formatação, pontos e vírgulas ausentes, etc.
- `refactor:` refatoração de código
- `test:` adição de testes
- `chore:` atualizações de build, configurações, etc.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Thalisson Sousa**
- GitHub: [@thalissonsousa17](https://github.com/thalissonsousa17)
- LinkedIn: [Adicionar perfil LinkedIn](https://linkedin.com/in/seu-perfil)
- Email: [Adicionar email de contato](mailto:seu-email@exemplo.com)

---

<div align="center">
  <sub>Desenvolvido com ❤️ por <a href="https://github.com/thalissonsousa17">Thalisson Sousa</a></sub>
</div>

<div align="center">
  
⭐ **Se este projeto te ajudou, considere dar uma estrela!** ⭐
  
</div>
