"use client"

import { BaseLayout } from "@/components/layouts/base-layout"
import { useSchoolData } from "@/hooks/use-school-data"
import { StatCards } from "./components/stat-cards"
import { DataTable } from "./components/data-table"

interface User {
  id: number
  name: string
  email: string
  avatar: string
  role: string
  plan: string
  billing: string
  status: string
  joinedDate: string
  lastLogin: string
}

interface UserFormValues {
  name: string
  email: string
  role: string
  plan: string
  billing: string
  status: string
}

export default function UsersPage() {
  const { teachers, addTeacher, deleteTeacher } = useSchoolData()

  const generateAvatar = (name: string) => {
    const names = name.split(" ")
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return (name || "DR").substring(0, 2).toUpperCase()
  }

  // Map DB teachers to table users format
  const mappedUsers: User[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email || `${t.name.toLowerCase().replace(/[^a-z]/g, '')}@radiomed.fr`,
    avatar: generateAvatar(t.name),
    role: t.subject || t.department || "Radiologue",
    plan: "Titulaire",
    billing: t.phone || "Interne",
    status: t.status || "Actif",
    joinedDate: "2024-01-15",
    lastLogin: "Aujourd'hui",
  }))

  const handleAddUser = async (userData: UserFormValues) => {
    await addTeacher({
      name: userData.name,
      email: userData.email,
      subject: userData.role,
      department: userData.plan,
      status: userData.status || "Actif",
      phone: userData.billing,
    })
  }

  const handleDeleteUser = async (id: number) => {
    await deleteTeacher(id)
  }

  const handleEditUser = (user: User) => {
    console.log("Edit user:", user)
  }

  return (
    <BaseLayout 
      title="Personnel & Médecins Radiologues" 
      description="Gestion des médecins radiologues, manipulateurs et personnel médical connecté à la BD"
    >
      <div className="flex flex-col gap-4">
        <div className="@container/main px-4 lg:px-6">
          <StatCards />
        </div>
        
        <div className="@container/main px-4 lg:px-6 mt-8 lg:mt-12">
          <DataTable 
            users={mappedUsers}
            onDeleteUser={handleDeleteUser}
            onEditUser={handleEditUser}
            onAddUser={handleAddUser}
          />
        </div>
      </div>
    </BaseLayout>
  )
}
