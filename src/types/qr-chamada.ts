export interface QRClass {
  id: string;
  name: string;
  code: string;
  description?: string;
  schedule: string;
  studentCount: number;
  attendanceRate: number;
}

export interface QRStudent {
  id: string;
  name: string;
  registration: string;
  email?: string;
  classId: string;
}

export interface QRAttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'justified';
  notes?: string;
  method: 'manual' | 'qr-code';
}
