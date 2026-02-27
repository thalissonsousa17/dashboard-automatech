import React, { useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import {
  History, Users, CheckCircle, XCircle, Calendar, Trash2, Plus, UserPlus, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { QRClass } from '../../types/qr-chamada';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface QRSession {
  id: string;
  session_date: string;
  session_time: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  qr_code_data: string;
  attendanceCount: number;
  qrCodeDataURL?: string;
  students: Array<{
    id: string;
    student_name: string;
    student_registration: string;
    email?: string;
    recorded_at: string;
  }>;
}

interface QRHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: QRClass;
}

const QRHistoryModal: React.FC<QRHistoryModalProps> = ({ isOpen, onClose, classData }) => {
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRegistration, setNewStudentRegistration] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<string | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classData.id) loadQRHistory();
  }, [isOpen, classData.id]);

  const loadQRHistory = async () => {
    try {
      setLoading(true);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classData.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionsWithAttendance: QRSession[] = [];

      for (const session of sessionsData || []) {
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('id, student_name, student_registration, email, recorded_at')
          .eq('session_id', session.id)
          .order('recorded_at', { ascending: true });

        const sessionWithAttendance: QRSession = {
          id: session.id,
          session_date: session.session_date,
          session_time: session.session_time,
          is_active: session.is_active,
          expires_at: session.expires_at,
          created_at: session.created_at,
          qr_code_data: session.qr_code_data,
          attendanceCount: attendanceData?.length || 0,
          students: attendanceData || [],
        };

        if (session.qr_code_data) {
          try {
            sessionWithAttendance.qrCodeDataURL = await QRCodeLib.toDataURL(session.qr_code_data, { width: 160, margin: 2 });
          } catch { /* ignora erro de QR */ }
        }

        sessionsWithAttendance.push(sessionWithAttendance);
      }

      setSessions(sessionsWithAttendance);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar histórico: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = (session: QRSession) => {
    if (session.is_active) {
      const now = new Date();
      const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
      if (expiresAt && now > expiresAt) return { label: 'Expirado', color: 'bg-red-100 text-red-700', Icon: XCircle };
      return { label: 'Ativo', color: 'bg-green-100 text-green-700', Icon: CheckCircle };
    }
    return { label: 'Finalizado', color: 'bg-gray-100 text-gray-600', Icon: XCircle };
  };

  const formatDateTime = (date: string, time: string) => {
    return new Date(date + 'T' + time).toLocaleString('pt-BR');
  };

  const formatTimeAgo = (dateString: string) => {
    const diffMs = new Date().getTime() - new Date(dateString).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return 'há poucos minutos';
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await supabase.from('attendance_records').delete().eq('session_id', sessionId);
      await supabase.from('attendance_sessions').delete().eq('id', sessionId);
      toast.success('Sessão deletada com sucesso!');
      setConfirmDeleteSession(null);
      if (expandedSession === sessionId) setExpandedSession(null);
      loadQRHistory();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao deletar sessão: ' + msg);
    }
  };

  const handleAddAttendanceRecord = async (sessionId: string) => {
    if (!newStudentName.trim() || !newStudentRegistration.trim()) {
      toast.error('Nome e matrícula são obrigatórios');
      return;
    }
    try {
      const { error } = await supabase.from('attendance_records').insert({
        session_id: sessionId,
        student_name: newStudentName.trim(),
        student_registration: newStudentRegistration.trim(),
        email: newStudentEmail.trim() || null,
      });
      if (error) throw error;
      toast.success('Registro de presença adicionado!');
      setNewStudentName('');
      setNewStudentRegistration('');
      setNewStudentEmail('');
      loadQRHistory();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao adicionar registro: ' + msg);
    }
  };

  const handleDeleteAttendanceRecord = async (recordId: string) => {
    try {
      const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
      if (error) throw error;
      toast.success('Registro removido!');
      setConfirmDeleteRecord(null);
      loadQRHistory();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao deletar registro: ' + msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de QR Codes — {classData.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} encontrada{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto w-12 h-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900 mb-1">Nenhuma sessão encontrada</h3>
              <p className="text-sm text-gray-500">Esta turma ainda não teve sessões de QR Code.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const status = getSessionStatus(session);
                const StatusIcon = status.Icon;
                const isExpanded = expandedSession === session.id;

                return (
                  <div key={session.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Session header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDateTime(session.session_date, session.session_time)}
                          </p>
                          <p className="text-xs text-gray-500">Criado {formatTimeAgo(session.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          <Users className="w-3 h-3" />
                          {session.attendanceCount} presente{session.attendanceCount !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteSession(session.id); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Deletar
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Session details (expanded) */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                        {/* Add attendance record */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1.5 mb-3">
                            <UserPlus className="w-4 h-4" />
                            Adicionar Registro de Presença
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                              <input
                                value={newStudentName}
                                onChange={e => setNewStudentName(e.target.value)}
                                placeholder="Nome completo"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Matrícula *</label>
                              <input
                                value={newStudentRegistration}
                                onChange={e => setNewStudentRegistration(e.target.value)}
                                placeholder="Número"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail (opcional)</label>
                              <input
                                type="email"
                                value={newStudentEmail}
                                onChange={e => setNewStudentEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => handleAddAttendanceRecord(session.id)}
                                disabled={!newStudentName.trim() || !newStudentRegistration.trim()}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Adicionar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Students table */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              Alunos Presentes ({session.students.length})
                            </h4>
                          </div>
                          {session.students.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">Nenhum aluno registrou presença nesta sessão.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Nome</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Matrícula</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">E-mail</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Horário</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Ação</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {session.students.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 font-medium text-gray-900">{student.student_name}</td>
                                      <td className="px-4 py-2 text-gray-600">{student.student_registration}</td>
                                      <td className="px-4 py-2 text-gray-500">{student.email || '—'}</td>
                                      <td className="px-4 py-2 text-gray-500 text-xs">{new Date(student.recorded_at).toLocaleString('pt-BR')}</td>
                                      <td className="px-4 py-2">
                                        <button
                                          onClick={() => setConfirmDeleteRecord(student.id)}
                                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* QR Code da sessão */}
                        {session.qrCodeDataURL && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">QR Code da Sessão</h4>
                            <div className="flex items-start gap-4">
                              <div className="border-2 border-gray-200 rounded-lg p-2 bg-white flex-shrink-0">
                                <img src={session.qrCodeDataURL} alt="QR Code" className="w-28 h-28" />
                              </div>
                              <div>
                                <p className={`text-xs font-medium mb-1 ${status.label === 'Ativo' ? 'text-green-700' : 'text-gray-600'}`}>
                                  {status.label === 'Ativo' ? '✅ Sessão ativa' : `📋 Sessão ${status.label.toLowerCase()}`}
                                </p>
                                <div className="bg-gray-100 rounded p-2 text-xs font-mono break-all text-gray-600 max-w-xs">
                                  {session.qr_code_data}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm delete session */}
      {confirmDeleteSession && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja deletar esta sessão QR? Todos os registros de presença associados também serão removidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteSession(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => handleDeleteSession(confirmDeleteSession)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Deletar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete record */}
      {confirmDeleteRecord && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-600 mb-5">Tem certeza que deseja remover este registro de presença?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteRecord(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => handleDeleteAttendanceRecord(confirmDeleteRecord)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRHistoryModal;
