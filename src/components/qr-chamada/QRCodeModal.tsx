import React, { useState, useEffect } from 'react';
import { QrCode, Timer, X, CheckCircle } from 'lucide-react';
import { QRClass, QRStudent, QRAttendanceRecord } from '../../types/qr-chamada';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: QRClass;
  students: QRStudent[];
  onSaveAttendance: (records: QRAttendanceRecord[]) => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  classData,
  students,
  onSaveAttendance,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [attendedStudents, setAttendedStudents] = useState<Set<string>>(new Set());
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionId, setSessionId] = useState<string>('');
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [expirationMinutes, setExpirationMinutes] = useState<string>('30');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [neverExpires, setNeverExpires] = useState(false);

  const attendanceURL = sessionId ? `${window.location.origin}/attendance/${sessionId}` : '';

  // Timer
  useEffect(() => {
    if (!isActive || !expiresAt) return;
    if (neverExpires) { setTimeRemaining('Sem expiração'); return; }

    const timer = setInterval(() => {
      const now = new Date();
      const timeLeft = expiresAt.getTime() - now.getTime();
      if (timeLeft <= 0) { setTimeRemaining('Expirado'); setIsActive(false); return; }
      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, expiresAt, neverExpires]);

  // Monitoramento em tempo real
  useEffect(() => {
    if (!sessionId || !isActive || !classData.id) return;

    const channel = supabase
      .channel(`attendance-changes-${classData.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.new && payload.new.student_registration) {
            setAttendedStudents(prev => new Set([...prev, payload.new.student_registration]));
            toast.success(`Presença registrada: ${payload.new.student_name}`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, isActive, classData.id]);

  // Carregar sessão ativa quando modal abre
  useEffect(() => {
    if (!isOpen || !classData.id) return;

    const loadActiveSession = async () => {
      try {
        const { data: activeSession, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('class_id', classData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !activeSession) return;

        const now = new Date();
        const expiry = new Date(activeSession.expires_at);
        const sessionNeverExpires = expiry.getFullYear() > 2100;

        if (sessionNeverExpires || expiry > now) {
          setSessionId(activeSession.id);
          setIsActive(true);
          setExpiresAt(expiry);
          setNeverExpires(sessionNeverExpires);

          const qrData = activeSession.qr_code_data || `${window.location.origin}/attendance/${activeSession.id}`;
          const dataURL = await QRCodeLib.toDataURL(qrData, { width: 256, margin: 2 });
          setQrCodeDataURL(dataURL);

          const { data: records } = await supabase
            .from('attendance_records')
            .select('student_registration')
            .eq('session_id', activeSession.id);

          if (records) {
            setAttendedStudents(new Set(records.map(r => r.student_registration)));
          }
        } else {
          await supabase.from('attendance_sessions').update({ is_active: false }).eq('id', activeSession.id);
        }
      } catch (err) {
        console.error('Erro ao carregar sessão ativa:', err);
      }
    };

    loadActiveSession();

    return () => {
      if (!isOpen) {
        setIsActive(false);
        setAttendedStudents(new Set());
        setSessionId('');
        setQrCodeDataURL('');
        setExpiresAt(null);
        setTimeRemaining('');
        setIsStartingSession(false);
        setNeverExpires(false);
      }
    };
  }, [isOpen, classData.id]);

  const handleStartSession = async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);

    try {
      let expiration: Date;
      let minMinutes: number;

      if (neverExpires) {
        expiration = new Date();
        expiration.setFullYear(expiration.getFullYear() + 100);
        minMinutes = 0;
      } else {
        minMinutes = Math.max(parseInt(expirationMinutes), 10);
        expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + minMinutes);
      }

      // Desativar sessões anteriores desta turma
      await supabase.from('attendance_sessions').update({ is_active: false })
        .eq('class_id', classData.id).eq('is_active', true);

      const { data: createdSession, error: sessionError } = await supabase
        .from('attendance_sessions')
        .insert({
          class_id: classData.id,
          session_date: currentDate,
          session_time: new Date().toTimeString().split(' ')[0],
          is_active: true,
          qr_code_data: '',
          expires_at: expiration.toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const newSessionId = createdSession.id;
      const qrData = `${window.location.origin}/attendance/${newSessionId}`;

      await supabase.from('attendance_sessions').update({ qr_code_data: qrData }).eq('id', newSessionId);
      await new Promise(resolve => setTimeout(resolve, 500));

      setSessionId(newSessionId);
      setIsActive(true);
      setExpiresAt(expiration);
      setAttendedStudents(new Set());

      const dataURL = await QRCodeLib.toDataURL(qrData, { width: 256, margin: 2 });
      setQrCodeDataURL(dataURL);

      toast.success(`Sessão iniciada para ${classData.name}! ${neverExpires ? '(Sem expiração)' : `(${minMinutes} min)`}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao iniciar sessão: ' + msg);
      setIsActive(false);
      setSessionId('');
      setQrCodeDataURL('');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await supabase.from('attendance_sessions').update({ is_active: false }).eq('id', sessionId);

      const { data: attendanceRecords } = await supabase
        .from('attendance_records').select('*').eq('session_id', sessionId);

      if (attendanceRecords && attendanceRecords.length > 0) {
        const records: QRAttendanceRecord[] = students.map(student => ({
          id: `${student.id}-${currentDate}-${Date.now()}`,
          studentId: student.id,
          classId: classData.id,
          date: currentDate,
          status: attendanceRecords.some(r => r.student_registration === student.registration) ? 'present' : 'absent',
          method: 'qr-code',
        }));
        onSaveAttendance(records);
      }

      setIsActive(false);
      setAttendedStudents(new Set());
      setQrCodeDataURL('');
      setSessionId('');
      setExpiresAt(null);
      setTimeRemaining('');
      setNeverExpires(false);

      toast.success(`Sessão de ${classData.name} finalizada!`);
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao finalizar sessão: ' + msg);
    }
  };

  const expirationOptions = ['10', '20', '30', '40', '50', '60'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chamada via QR Code — {classData.name}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>Data: {new Date(currentDate).toLocaleDateString('pt-BR')}</span>
              {isActive && timeRemaining && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  <Timer className="w-3 h-3" />
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-gray-700" />
              <h3 className="font-medium text-gray-900">QR Code da Aula — {classData.name}</h3>
            </div>

            {!isActive ? (
              <div className="text-center py-6 space-y-4">
                <QrCode className="mx-auto w-14 h-14 text-gray-300" />

                {/* Sem expiração */}
                <label className="flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={neverExpires}
                    onChange={e => setNeverExpires(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">QR Code sem expiração</span>
                </label>

                {/* Tempo de validade */}
                {!neverExpires && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Tempo de validade (mínimo 10 min)
                    </label>
                    <select
                      value={expirationMinutes}
                      onChange={e => setExpirationMinutes(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {expirationOptions.map(opt => (
                        <option key={opt} value={opt}>{opt} minutos</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleStartSession}
                  disabled={isStartingSession}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isStartingSession ? 'Iniciando...' : `Iniciar Sessão para ${classData.name}`}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                {qrCodeDataURL && (
                  <div className="inline-block border-2 border-gray-200 rounded-xl p-4 bg-white">
                    <img src={qrCodeDataURL} alt={`QR Code ${classData.name}`} className="w-64 h-64 mx-auto" />
                  </div>
                )}
                <p className="text-sm font-medium text-gray-700">
                  QR Code exclusivo para: <span className="text-blue-600">{classData.name}</span>
                </p>
                <p className="text-xs text-gray-500">Projete este QR Code para os alunos escanearem</p>
                <div className="bg-gray-100 rounded-lg p-2 text-xs font-mono break-all text-gray-600">
                  {attendanceURL}
                </div>

                {/* Presenças em tempo real */}
                {attendedStudents.size > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-left">
                    <p className="text-sm font-medium text-green-800 flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      {attendedStudents.size} presença{attendedStudents.size !== 1 ? 's' : ''} registrada{attendedStudents.size !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">✅ QR Code Ativo</p>
                  <p className="text-xs text-green-600 mt-0.5">Os alunos podem escanear para registrar presença</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          {isActive && (
            <button
              onClick={handleEndSession}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Finalizar Sessão de {classData.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
