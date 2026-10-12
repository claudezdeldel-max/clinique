import { BaseLayout } from '@/components/layouts/base-layout'
import { AccountManagement } from '../components/account-management'

export default function AccountSettings() {
  return <BaseLayout title="Paramètres des comptes" description="Comptes, fonctions et droits d’appel par examen"><div className="px-4 lg:px-6"><AccountManagement /></div></BaseLayout>
}
