import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { QRClass, QRStudent, QRAttendanceRecord } from '../types/qr-chamada';
import ClassCard from '../components/qr-chamada/ClassCard';
import CreateClassModal from '../components/qr-chamada/CreateClassModal';
import DeleteClassModal from '../components/qr-chamada/DeleteClassModal';
import QRCodeModal from '../components/qr-chamada/QRCodeModal';
import ReportsModal from '../components/qr-chamada/ReportsModal';
import QRHistoryModal from '../components/qr-chamada/QRHistoryModal';

const QRChamada: React.FC = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<QRClass[]>([]);
  const [students, setStudents] = useState<QRStudent[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<QRAttendanceRecord[]>([]);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState<QRClass | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showDeleteClass, setShowDeleteClass] = useState(false);
  const [showQRHistory, setShowQRHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Professor';

  useEffect(() => {
    if (user) loadClasses();
  }, [user]);

  useEffect(() => {
    if (classes.length > 0) loadStudents();
  }, [classes]);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedClasses: QRClass[] = (data || []).map(dbClass => ({
        id: dbClass.id,
        name: dbClass.name,
        code: `CLS${dbClass.id.slice(0, 3).toUpperCase()}`,
        description: dbClass.description || '',
        schedule: '',
        studentCount: 0,
        attendanceRate: 0,
      }));

      setClasses(formattedClasses);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar turmas: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const classIds = classes.map(c => c.id);
      if (classIds.length === 0) return;

      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id, class_id')
        .in('class_id', classIds);

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) return;

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('student_name, student_registration, session_id, recorded_at')
        .in('session_id', sessionIds)
        .order('recorded_at', { ascending: false });

      const uniqueStudents = new Map<string, QRStudent>();
      (attendanceData || []).forEach(record => {
        const session = sessions?.find(s => s.id === record.session_id);
        const classId = session?.class_id;
        if (classId && record.student_name && record.student_registration) {
          const key = `${record.student_registration}-${classId}`;
          if (!uniqueStudents.has(key)) {
            uniqueStudents.set(key, {
              id: `student-${record.student_registration}-${classId}`,
              name: record.student_name,
              registration: record.student_registration,
              classId,
            });
          }
        }
      });

      const formattedStudents = Array.from(uniqueStudents.values());
      setStudents(formattedStudents);

      setClasses(prev =>
        prev.map(c => ({
          ...c,
          studentCount: formattedStudents.filter(s => s.classId === c.id).length,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const handleCreateClass = async (newClass: Omit<QRClass, 'id' | 'studentCount' | 'attendanceRate'>) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{ name: newClass.name, description: newClass.description, teacher_id: user?.id }])
        .select()
        .single();

      if (error) throw error;

      const formattedClass: QRClass = {
        id: data.id,
        name: data.name,
        code: `CLS${data.id.slice(0, 3).toUpperCase()}`,
        description: data.description || '',
        schedule: newClass.schedule || '',
        studentCount: 0,
        attendanceRate: 0,
      };

      setClasses(prev => [formattedClass, ...prev]);
      toast.success('Turma criada com sucesso!');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao criar turma: ' + msg);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!selectedClass) return;
    try {
      await supabase.from('attendance_sessions').delete().eq('class_id', selectedClass.id);
      await supabase.from('classes').delete().eq('id', selectedClass.id);
      setClasses(prev => prev.filter(c => c.id !== selectedClass.id));
      setStudents(prev => prev.filter(s => s.classId !== selectedClass.id));
      setShowDeleteClass(false);
      setSelectedClass(null);
      toast.success('Turma excluída com sucesso!');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao excluir turma: ' + msg);
    }
  };

  const handleSaveAttendance = (records: QRAttendanceRecord[]) => {
    setAttendanceRecords(prev => [...prev, ...records]);
    if (selectedClass) {
      const classStudents = students.filter(s => s.classId === selectedClass.id);
      const presentCount = records.filter(r => r.status === 'present').length;
      const rate = classStudents.length > 0 ? Math.round((presentCount / classStudents.length) * 100) : 0;
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, attendanceRate: rate } : c));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Chamada</h1>
        <p className="text-gray-500 mt-1">Olá, {displayName}! Gerencie suas turmas e chamadas via QR Code.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm font-medium text-blue-100">Total de Turmas</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-bold">{classes.length}</span>
            <BookOpen className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total de Alunos</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-bold text-gray-900">{students.length}</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">👥</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Presenças Registradas</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-bold text-gray-900">{attendanceRecords.length}</span>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div>
        <button
          onClick={() => setShowCreateClass(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Turma
        </button>
      </div>

      {/* Classes section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Suas Turmas</h2>
          <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            {classes.length} turma{classes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma criada</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Comece criando sua primeira turma para gerenciar a presença via QR Code.
            </p>
            <button
              onClick={() => setShowCreateClass(true)}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Turma
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(classItem => (
              <ClassCard
                key={classItem.id}
                classData={classItem}
                onGenerateQR={c => { setSelectedClass(c); setShowQRCode(true); }}
                onViewReports={c => { setSelectedClass(c); setShowReports(true); }}
                onDeleteClass={c => { setSelectedClass(c); setShowDeleteClass(true); }}
                onViewQRHistory={c => { setSelectedClass(c); setShowQRHistory(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateClassModal
        isOpen={showCreateClass}
        onClose={() => setShowCreateClass(false)}
        onCreateClass={handleCreateClass}
      />

      <DeleteClassModal
        isOpen={showDeleteClass}
        onClose={() => { setShowDeleteClass(false); setSelectedClass(null); }}
        onConfirm={handleConfirmDeleteClass}
        className={selectedClass?.name || ''}
      />

      {selectedClass && (
        <>
          <QRCodeModal
            isOpen={showQRCode}
            onClose={() => { setShowQRCode(false); loadStudents(); }}
            classData={selectedClass}
            students={students.filter(s => s.classId === selectedClass.id)}
            onSaveAttendance={handleSaveAttendance}
          />
          <ReportsModal
            isOpen={showReports}
            onClose={() => setShowReports(false)}
            classData={selectedClass}
            students={students.filter(s => s.classId === selectedClass.id)}
            attendanceRecords={attendanceRecords.filter(r => r.classId === selectedClass.id)}
          />
          <QRHistoryModal
            isOpen={showQRHistory}
            onClose={() => setShowQRHistory(false)}
            classData={selectedClass}
          />
        </>
      )}
    </div>
  );
};

export default QRChamada;
