import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, User, TrendingUp, X } from 'lucide-react';
import { QRClass, QRStudent, QRAttendanceRecord } from '../../types/qr-chamada';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: QRClass;
  students: QRStudent[];
  attendanceRecords: QRAttendanceRecord[];
}

interface StudentStats {
  name: string;
  registration: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
}

interface SessionStats {
  sessionId: string;
  date: string;
  time: string;
  isActive: boolean;
  expiresAt: string | null;
  totalAttendees: number;
}

type TabKey = 'students' | 'sessions' | 'summary';

const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, classData }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('students');
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalAttendanceRecords, setTotalAttendanceRecords] = useState(0);

  useEffect(() => {
    if (isOpen && classData.id) loadReportsData();
  }, [isOpen, classData.id]);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      const { data: sessions, error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select('id, session_date, session_time, is_active, expires_at')
        .eq('class_id', classData.id)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      setTotalSessions(sessions?.length || 0);

      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) {
        setStudentStats([]);
        setSessionStats([]);
        setTotalAttendanceRecords(0);
        return;
      }

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, student_name, student_registration, recorded_at, session_id')
        .in('session_id', sessionIds)
        .order('recorded_at', { ascending: false });

      if (attendanceError) throw attendanceError;

      setTotalAttendanceRecords(attendanceData?.length || 0);

      // Estatísticas por aluno
      const statsMap = new Map<string, StudentStats>();
      (attendanceData || []).forEach(record => {
        const key = record.student_registration;
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            name: record.student_name,
            registration: record.student_registration,
            totalSessions: sessions?.length || 0,
            attendedSessions: 0,
            attendanceRate: 0,
          });
        }
        const s = statsMap.get(key)!;
        s.attendedSessions++;
      });

      const finalStudentStats = Array.from(statsMap.values()).map(s => ({
        ...s,
        attendanceRate: s.totalSessions > 0 ? Math.round((s.attendedSessions / s.totalSessions) * 100) : 0,
      }));
      setStudentStats(finalStudentStats);

      // Estatísticas por sessão
      const sessionStatsData = (sessions || []).map(session => ({
        sessionId: session.id,
        date: session.session_date,
        time: session.session_time,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        totalAttendees: (attendanceData || []).filter(r => r.session_id === session.id).length,
      }));
      setSessionStats(sessionStatsData);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar relatórios: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 text-green-800';
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSessionStatusColor = (isActive: boolean, expiresAt: string | null) => {
    if (isActive && (!expiresAt || new Date(expiresAt) > new Date())) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-600';
  };

  const getSessionStatusText = (isActive: boolean, expiresAt: string | null) => {
    if (isActive && (!expiresAt || new Date(expiresAt) > new Date())) return 'Ativa';
    return 'Finalizada';
  };

  const overallRate = totalSessions > 0 && studentStats.length > 0
    ? Math.round(studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentStats.length)
    : 0;

  const handleExport = () => {
    const csvContent = [
      ['Nome', 'Matrícula', 'Total de Aulas', 'Presenças', 'Taxa de Frequência'].join(','),
      ...studentStats.map(s => [s.name, s.registration, s.totalSessions, s.attendedSessions, `${s.attendanceRate}%`].join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frequencia-${classData.code}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'students', label: 'Por Aluno' },
    { key: 'sessions', label: 'Por Aula' },
    { key: 'summary', label: 'Resumo' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Relatórios — {classData.name}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>Total de aulas: {totalSessions}</span>
              <span>Alunos únicos: {studentStats.length}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getAttendanceColor(overallRate)}`}>
                {overallRate}% freq. média
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-2 text-sm text-gray-500">Carregando relatórios...</span>
          </div>
        ) : (
          <div className="px-6 py-5">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-5">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Por Aluno */}
            {activeTab === 'students' && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                  <User className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Frequência por Aluno</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {studentStats.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">Nenhum registro encontrado.</p>
                  ) : (
                    studentStats.map(student => (
                      <div key={student.registration} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">Mat: {student.registration}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            <span className="text-green-600 font-medium">{student.attendedSessions}</span>/{student.totalSessions}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getAttendanceColor(student.attendanceRate)}`}>
                            {student.attendanceRate}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Por Aula */}
            {activeTab === 'sessions' && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Frequência por Aula</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {sessionStats.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">Nenhuma aula registrada.</p>
                  ) : (
                    sessionStats.map(session => (
                      <div key={session.sessionId} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(session.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500">{session.time} — {session.totalAttendees} alunos presentes</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSessionStatusColor(session.isActive, session.expiresAt)}`}>
                          {getSessionStatusText(session.isActive, session.expiresAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Resumo */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total de Aulas', value: totalSessions, color: 'text-gray-900' },
                    { label: 'Frequência Média', value: `${overallRate}%`, color: 'text-green-600' },
                    { label: 'Total de Presenças', value: totalAttendanceRecords, color: 'text-green-600' },
                    { label: 'Alunos Únicos', value: studentStats.length, color: 'text-blue-600' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">Estatísticas Detalhadas</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-green-600">{totalAttendanceRecords}</p>
                      <p className="text-xs text-gray-500">Total de Presenças</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-600">{studentStats.length}</p>
                      <p className="text-xs text-gray-500">Alunos Cadastrados</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-purple-600">{totalSessions}</p>
                      <p className="text-xs text-gray-500">Sessões Criadas</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-orange-600">
                        {sessionStats.filter(s => s.isActive && (!s.expiresAt || new Date(s.expiresAt) > new Date())).length}
                      </p>
                      <p className="text-xs text-gray-500">Sessões Ativas</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
