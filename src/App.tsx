import React from "react";
import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import Layout from "./components/Layout/Layout";
import LandingPage from "./pages/LandingPage";
import LoginForm from "./components/Auth/LoginForm";
import Dashboard from "./pages/Dashboard";
import EspacoDocente from "./pages/EspacoDocente";
import StudentSubmissions from "./pages/StudentSubmissions";
import PublicarPost from "./pages/PublicarPost";
import AIAssistant from "./pages/AIAssistant";
import SubmitWork from "./pages/SubmitWork";
import TeacherProfile from "./pages/TeacherProfile";
import MyProfile from "./pages/MyProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserLogs from "./pages/AdminUserLogs";
import SubscriptionPage from "./pages/SubscriptionPage";
import FloatingAssistant from "./components/AI/FloatingAssistant";
import AdminRoute from "./components/Auth/AdminRoute";
import UpgradeModal from "./components/UpgradeModal";
import ExamGenerator from "./pages/ExamGenerator";
import Suporte from "./pages/Suporte";
import WorkspacePage from "./modules/workspace/pages/WorkspacePage";
import ExamEditorPage from "./modules/editor/pages/ExamEditorPage";
import DocumentsPage from "./modules/editor/pages/DocumentsPage";
import StandaloneEditorPage from "./modules/editor/pages/StandaloneEditorPage";
import { NotificationProvider } from "./contexts/NotificationContext";
import { TicketProvider } from "./contexts/TicketContext";

// Redireciona para /dashboard/subscription se vier da landing page com ?redirect=subscription
const LoginRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  const dest = redirect === "subscription" ? "/dashboard/subscription" : "/dashboard";
  return <Navigate to={dest} replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
  const { loading } = useAuth();

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
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/submit/:folderId" element={<SubmitWork />} />
      <Route path="/espaco-docente" element={<EspacoDocente />} />
      <Route path="/professor/:slug" element={<TeacherProfile />} />

      {/* Rotas Protegidas (Dashboard) */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <NotificationProvider>
            <TicketProvider>
            <SubscriptionProvider>
              {/* UpgradeModal é global — renderizado uma vez no topo */}
              <UpgradeModal />
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/publicar-post" element={<PublicarPost />} />
                  <Route path="/espaco-docente" element={<EspacoDocente />} />
                  <Route
                    path="/student-submissions"
                    element={<StudentSubmissionsWithAssistant />}
                  />
                  <Route path="/ai-assistant" element={<AIAssistant />} />
                  <Route path="/gerador-provas" element={<ExamGenerator />} />
                  {/* Premium: Workspaces, Pastas, Editor */}
                  <Route path="/workspaces" element={<WorkspacePage />} />
                  <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
                  <Route path="/workspaces/:workspaceId/folder/:folderId" element={<WorkspacePage />} />
                  <Route path="/editor/:examId" element={<ExamEditorPage />} />
                  {/* Editor de Documentos Standalone */}
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/documents/:docId" element={<StandaloneEditorPage />} />
                  {/* Suporte */}
                  <Route path="/suporte" element={<Suporte />} />
                  <Route path="/meu-perfil" element={<MyProfile />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/logs"
                    element={
                      <AdminRoute>
                        <AdminUserLogs />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </SubscriptionProvider>
            </TicketProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      />

      {/* Redirect para landing page */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// Componente wrapper para Student Submissions com assistente IA
const StudentSubmissionsWithAssistant: React.FC = () => {
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 10) {
        setSelectedText(selection.toString());
      }
    };

    document.addEventListener("mouseup", handleTextSelection);
    return () => document.removeEventListener("mouseup", handleTextSelection);
  }, []);

  return (
    <>
      <StudentSubmissions />
      <FloatingAssistant
        selectedText={selectedText}
        onClose={() => setSelectedText("")}
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
