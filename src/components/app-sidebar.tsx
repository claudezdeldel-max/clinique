"use client"

import * as React from "react"
import {
  Activity,
  Users,
  Calendar,
  Settings,
  CreditCard,
  Stethoscope,
  Megaphone,
  MessageSquare,
  DollarSign,
} from "lucide-react"
import { Link } from "react-router-dom"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { AccountSession } from '@/components/clinic/account-session'
import { useAccountStore } from '@/stores/account-store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useRolePermissionsStore, navigationPermissions } from "@/stores/role-permissions-store"
import { useThemeSettingsStore } from '@/stores/theme-settings-store'
import { CimaNavigation } from '@/components/clinic/cima-navigation'
import { useNavigationCounts } from '@/hooks/use-navigation-counts'


const baseData = {
  navGroups: [
    {
      label: "Admission",
      items: [
        { title: "Tableau de bord", url: "/dashboard-2", icon: Activity },
        { title: "Patients", url: "/patients", icon: Users },
        { title: "File d’attente", url: "/queue-management", icon: Megaphone },
        { title: "Rendez-vous", url: "/rendez-vous", icon: Calendar },
      ],
    },
    {
      label: "Gestion",
      items: [
        { title: "Consultation", url: "/medecin", icon: Stethoscope },
        { title: "Messagerie", url: "/chat", icon: MessageSquare },
      ],
    },
    {
      label: "Administration & Finance",
      items: [
        { title: "Finance et Compta", url: "/finance", icon: DollarSign },
        { title: "Paiements", url: "/payments", icon: CreditCard },
        { title: "Paramètres", url: "/settings/user", icon: Settings },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [themeOpen, setThemeOpen] = React.useState(false)
  const designStyle = useThemeSettingsStore(state => state.designStyle)
  const { currentRole, rolePermissions } = useRolePermissionsStore()
  const account = useAccountStore(state => state.user)

  const activePermissions = navigationPermissions(account?.role || currentRole, rolePermissions)

  // Filter groups and items by active role permissions
  const filteredGroups = baseData.navGroups
    .map((group) => {
      const allowedItems = group.items.filter((item) => {
        return activePermissions.includes(item.url)
      })
      return {
        ...group,
        items: allowedItems,
      }
    })
    .filter((group) => group.items.length > 0)

  const allowedUrls = filteredGroups.flatMap(group => group.items.map(item => item.url))
  const counts = useNavigationCounts(allowedUrls)

  const activeUser = {
    name: account?.name || 'Session non connectée',
    email: account?.email || 'Connectez-vous pour utiliser vos fonctions',
    avatar: "",
  }

  if (designStyle === 'mediscan') {
    return <>
      <CimaNavigation allowedUrls={allowedUrls} counts={counts} onCustomize={() => setThemeOpen(true)} />
      <ThemeCustomizer open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  }

  return (
    <>
      <Sidebar {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard-2">
                  <div className="brand-logo flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                    <Activity className="size-5" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-foreground">RadioMed OS</span>
                    <span className="truncate text-xs text-muted-foreground">Clinique de Radiologie</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

        </SidebarHeader>

        <SidebarContent>
          {filteredGroups.map((group) => (
            <NavMain key={group.label} label={group.label} items={group.items} counts={counts} />
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                id="sidebar-customize-btn"
                onClick={() => setThemeOpen(true)}
                tooltip="Personnaliser"
                className="cursor-pointer"
              >
                <Settings className="size-4" />
                <span>Personnaliser</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <NavUser user={activeUser} />
          <AccountSession />
        </SidebarFooter>
      </Sidebar>

      <ThemeCustomizer open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  )
}
