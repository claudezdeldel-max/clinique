import { useState, useEffect } from 'react'
import { fetchApi, getDoctors, getRooms } from '@/lib/api'

// ===== Clinic Domain Interfaces =====

export interface ClinicMetric {
  key: string
  label: string
  value: string
  change?: string
  trend?: string
  description?: string
}

export interface Patient {
  id: number
  name: string
  email: string
  grade: string // maps to age in DB
  status: string
  attendance_rate: number
  parent_phone?: string // maps to phone in DB
  enrollment_date: string // maps to created_at in DB
}

export interface Radiologist {
  id: number
  name: string
  email: string
  subject: string // maps to specialization in DB
  department: string
  status: string
  phone: string
}

export interface ExamModality {
  id: number
  name: string
  code: string
  teacher: string // maps to doctor in DB
  room: string
  student_count: number // maps to patient_count in DB
  schedule: string
}

export interface ExamAppointment {
  id: number
  student_name: string
  student_email: string
  grade: string
  amount: string
  payment_status: string
  date: string
}

export interface ExamPayment {
  fiscal_json?: string | null
  id: number
  receipt_no: string
  student_id: number
  student_name: string
  grade: string
  period: string
  total_fee: number
  paid_amount: number
  due_balance: number
  payment_status: string
  payment_method: string
  date: string
}

export interface ExamVolumeLog {
  id: number
  month: string
  present_count: number
  absent_count: number
  percentage: number
}

// Backward-compatible aliases (legacy names → new names)
export type SchoolMetric = ClinicMetric
export type Student = Patient
export type Teacher = Radiologist
export type SchoolClass = ExamModality
export type Enrollment = ExamAppointment
export type StudentPayment = ExamPayment
export type AttendanceLog = ExamVolumeLog

const API_BASE = '/api'

export function useSchoolData() {
  const [metrics, setMetrics] = useState<Record<string, SchoolMetric>>({
    total_students: { key: 'total_students', label: 'Patients Traités', value: '0', change: 'Nouveau cycle', trend: 'neutral', description: 'Examens d imagerie réalisés ce mois' },
    active_teachers: { key: 'active_teachers', label: 'Radiologues & Staff', value: '0', change: '100% actifs', trend: 'neutral', description: 'Médecins radiologues et manipulateurs radio' },
    active_classes: { key: 'active_classes', label: 'Salles d Imagerie', value: '0', change: 'Salles Haute Précision', trend: 'neutral', description: 'IRM, Scanner, Écho, X-Ray, Mammo' },
    avg_attendance: { key: 'avg_attendance', label: 'Taux d Occupation IRM', value: '—', change: 'Optimisé', trend: 'up', description: 'Calculé sur les équipements IRM & Scanner' },
  })

  const [students, setStudents] = useState<Student[]>([])

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])

  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([])

  const [attendance, setAttendance] = useState<AttendanceLog[]>([])

  const [loading, setLoading] = useState(true)
  const [isLiveDB, setIsLiveDB] = useState(false)

  const fetchData = async () => {
    try {
      const [metrics, patients, doctors, rooms, payments] = await Promise.all([
        fetchApi<Record<string, SchoolMetric>>('/metrics'), fetchApi<Student[]>('/students'),
        getDoctors(), getRooms(), fetchApi<StudentPayment[]>('/student-payments'),
      ])
      setMetrics(metrics); setStudents(patients); setStudentPayments(payments)
      setTeachers(doctors.map(d => ({ ...d, subject: 'Radiologie', department: '', status: 'Actif', phone: '' })))
      setClasses(rooms.map(r => ({ id: r.id, name: r.type, code: String(r.id), teacher: '', room: r.name, student_count: 0, schedule: '' })))
      setEnrollments([]); setAttendance([]); setIsLiveDB(true)
    } catch { setIsLiveDB(false) } finally { setLoading(false) }
  }

  const addStudent = async (newStudent: { name: string; email?: string; grade?: string; birth_date?: string; requested_exam?: string; parent_phone?: string }) => {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      })
      if (!res.ok) {
        const failure = await res.json()
        throw new Error(failure.error || "Erreur d’enregistrement du patient")
      }
      const created = await res.json()
      await fetchData()
      return created
  }

  const addPayment = async (paymentData: {
    student_id?: number
    student_name: string
    grade?: string
    period?: string
    total_fee?: number
    paid_amount: number
    payment_method?: string
  }) => {
    const receipt = await fetchApi<StudentPayment>('/student-payments', { method: 'POST', body: JSON.stringify(paymentData) })
    await fetchData(); return receipt
  }

  const enrollInClass = async (enrollData: { student_id?: number; student_name: string; class_id?: number; class_name: string }) => {
    await fetchApi('/course-enrollments', { method: 'POST', body: JSON.stringify(enrollData) })
    await fetchData()
  }
  const addTeacher = async (teacherData: { name: string; email?: string; subject?: string; department?: string; status?: string; phone?: string }) => {
    await fetchApi('/accounts', { method: 'POST', body: JSON.stringify({ name: teacherData.name, email: teacherData.email, role: 'radiologist' }) })
    await fetchData()
  }
  const deleteTeacher = async (id: number) => {
    await fetchApi(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify({ active: false }) })
    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    metrics,
    students,
    teachers,
    classes,
    enrollments,
    studentPayments,
    attendance,
    loading,
    isLiveDB,
    addStudent,
    addTeacher,
    deleteTeacher,
    addPayment,
    enrollInClass,
    enrollInCourse: enrollInClass,
    refetch: fetchData,
  }
}

// Backward-compatible alias
export const useClinicData = useSchoolData
