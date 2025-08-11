import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import LoginForm from './components/Auth/LoginForm';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import EspacoDocente from './pages/EspacoDocente';
import StudentSubmissions from './pages/StudentSubmissions';
import PublicarPost from './pages/PublicarPost';
import AITest from './pages/AITest';
import AIAssistant from './pages/AIAssistant';
import SubmitWork from './pages/SubmitWork';
import TeacherProfile from './pages/TeacherProfile';
import MyProfile from './pages/MyProfile';
import FloatingAssistant from './components/AI/FloatingAssistant';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/dashboard" replace />} />
      <Route path="/submit/:folderId" element={<SubmitWork />} />
      <Route path="/espaco-docente" element={<EspacoDocente />} />
      <Route path="/professor/:slug" element={<TeacherProfile />} />
      
      {/* Rotas Protegidas (Dashboard) */}
      <Route path="/dashboard/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/publicar-post" element={<PublicarPost />} />
              <Route path="/espaco-docente" element={<EspacoDocente />} />
              <Route path="/student-submissions" element={<StudentSubmissionsWithAssistant />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/meu-perfil" element={<MyProfile />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Redirect para landing page */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// Componente wrapper para Student Submissions com assistente IA
const StudentSubmissionsWithAssistant: React.FC = () => {
  const [selectedText, setSelectedText] = useState('');

  // Detectar seleção de texto apenas nesta página
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 10) {
        setSelectedText(selection.toString());
      }
    };

    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, []);

  return (
    <>
      <StudentSubmissions />
      <FloatingAssistant 
        selectedText={selectedText} 
        onClose={() => setSelectedText('')} 
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;