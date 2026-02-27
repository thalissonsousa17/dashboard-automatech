import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

const QRAttendance: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [studentForm, setStudentForm] = useState({ name: '', registration: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [className, setClassName] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('attendance_sessions')
      .select('classes(name)')
      .eq('id', sessionId)
      .maybeSingle()
      .then(({ data }: { data: { classes: { name: string } } | null }) => {
        const name = data?.classes?.name;
        if (name) setClassName(name);
      });
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!sessionId || !studentForm.name.trim() || !studentForm.registration.trim() || !studentForm.email.trim()) {
        setError('Por favor, preencha todos os campos.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentForm.email)) {
        setError('Por favor, digite um e-mail válido.');
        return;
      }

      // Buscar sessão
      const { data: sessionData } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, session_date, session_time, is_active, expires_at, classes(id, name)')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionData && sessionData.is_active === false) {
        setError('Esta sessão de chamada foi encerrada pelo professor.');
        return;
      }

      if (sessionData?.expires_at) {
        const expiresAt = new Date(sessionData.expires_at);
        const isNeverExpires = expiresAt.getFullYear() > 2100;
        if (!isNeverExpires && expiresAt < new Date()) {
          setError('O QR Code desta chamada expirou. Solicite um novo ao seu professor.');
          return;
        }
      }

      // Verificar duplicata
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('id, recorded_at')
        .eq('session_id', sessionId)
        .eq('student_registration', studentForm.registration.trim())
        .maybeSingle();

      if (existingRecord) {
        const recordDate = new Date(existingRecord.recorded_at).toLocaleString('pt-BR');
        setError(`Presença já registrada para a matrícula ${studentForm.registration.trim()} em ${recordDate}.`);
        return;
      }

      // Inserir registro
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_name: studentForm.name.trim(),
          student_registration: studentForm.registration.trim(),
          email: studentForm.email.trim(),
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '42501' || insertError.message?.includes('policy')) {
          setError('Sessão expirada ou inválida. Solicite um novo QR Code ao seu professor.');
        } else if (insertError.code === '23505') {
          setError('Presença já registrada para esta matrícula nesta sessão.');
        } else {
          setError('Erro ao registrar presença. Verifique se o QR Code está válido.');
        }
        return;
      }

      // Enviar email de confirmação (opcional)
      if (sessionData?.classes && sessionData.session_date && sessionData.session_time) {
        try {
          await supabase.functions.invoke('send-attendance-confirmation', {
            body: {
              studentName: studentForm.name.trim(),
              studentEmail: studentForm.email.trim(),
              studentRegistration: studentForm.registration.trim(),
              className: (sessionData.classes as { name: string }).name || 'Turma',
              sessionDate: new Date(sessionData.session_date).toLocaleDateString('pt-BR'),
              sessionTime: sessionData.session_time,
            },
          });
        } catch {
          // Não bloqueia o sucesso se o email falhar
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error('Erro geral:', err);
      setError('Erro inesperado. Tente novamente ou entre em contato com seu professor.');
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <CheckCircle className="mx-auto w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Presença Confirmada!</h2>
          <p className="text-green-600 font-medium mb-5">Seu registro foi realizado com sucesso</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
            <p className="text-sm text-green-800 mb-1.5">
              <strong>Nome:</strong> {studentForm.name}
            </p>
            <p className="text-sm text-green-800 mb-1.5">
              <strong>Matrícula:</strong> {studentForm.registration}
            </p>
            <p className="text-sm text-green-800 mb-1.5">
              <strong>E-mail:</strong> {studentForm.email}
            </p>
            <p className="text-xs text-green-600 mt-2">
              Registrado em: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de registro
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {className || 'Registro de Presença'}
          </h1>
          <p className="text-blue-100 text-sm mt-1">Preencha seus dados para registrar presença</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={studentForm.name}
              onChange={e => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Digite seu nome completo"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Matrícula
            </label>
            <input
              type="text"
              value={studentForm.registration}
              onChange={e => setStudentForm(prev => ({ ...prev, registration: e.target.value }))}
              placeholder="Digite sua matrícula"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={studentForm.email}
              onChange={e => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Digite seu e-mail"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Registrar Presença
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Sessão: {sessionId}
          </p>
        </form>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()}{' '}
            <a href="https://automatech.app.br" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
              AutomaTech
            </a>{' '}
            — Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRAttendance;
