"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, RotateCcw, CheckCircle2, UserCheck, Stethoscope, Settings2 } from 'lucide-react'
import {
  useRolePermissionsStore,
  ALL_NAV_ITEMS,
  type UserRole,
} from '@/stores/role-permissions-store'

export function RolePermissionsConfig() {
  const { currentRole, rolePermissions, setRole, togglePermission, resetPermissions } =
    useRolePermissionsStore()

  const roles: Array<{ id: UserRole; name: string; icon: any; color: string }> = [
    { id: 'admin', name: 'Administrateur', icon: Shield, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
    { id: 'secretary', name: 'Secrétaire (Accueil)', icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    { id: 'radiologist', name: 'Médecin Radiologue', icon: Stethoscope, color: 'bg-sky-500/10 text-sky-600 border-sky-200' },
  ]

  return (
    <Card className="mt-8 border-2 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Personnalisation des Accès & Menu Navbar par Rôle
          </CardTitle>
          <CardDescription>
            Configurez les éléments de navigation visibles pour chaque profil (Secrétaire, Médecin, Administrateur).
          </CardDescription>
        </div>
        <Button
          data-testid="reset-role-permissions-btn"
          variant="outline"
          size="sm"
          onClick={resetPermissions}
          className="cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Réinitialiser par défaut
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Role Switcher Section */}
        <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Profil actif actuellement
              </span>
              <h4 className="text-base font-bold text-foreground flex items-center gap-2 mt-0.5">
                <span>{roles.find((r) => r.id === currentRole)?.name}</span>
                <Badge variant="outline" className={roles.find((r) => r.id === currentRole)?.color}>
                  Rôle Actif
                </Badge>
              </h4>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground">Changer de Rôle:</span>
              <Select value={currentRole} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger data-testid="role-switcher-btn" className="w-[220px] cursor-pointer bg-background">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" data-testid="role-option-admin">🛡️ Administrateur</SelectItem>
                  <SelectItem value="secretary" data-testid="role-option-secretary">📋 Secrétaire (Accueil)</SelectItem>
                  <SelectItem value="radiologist" data-testid="role-option-radiologist">🩺 Médecin Radiologue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Selection Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
            {roles.map((r) => {
              const Icon = r.icon
              const isActive = currentRole === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className={`p-2 rounded-md ${r.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {isActive ? '✓ Sélectionné' : 'Cliquer pour activer'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Permissions Grid Matrix */}
        <div className="overflow-x-auto border rounded-xl bg-card">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-bold text-muted-foreground uppercase">
                <th className="p-3.5">Élément de Navigation / Page</th>
                <th className="p-3.5">Catégorie</th>
                {roles.map((r) => (
                  <th key={r.id} className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <r.icon className="h-3.5 w-3.5" />
                      <span>{r.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ALL_NAV_ITEMS.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{item.url}</span>
                  </td>
                  <td className="p-3.5 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.group}
                    </Badge>
                  </td>
                  {roles.map((r) => {
                    const isChecked = r.id === 'admin' || (rolePermissions[r.id] || []).includes(item.url)
                    return (
                      <td key={r.id} className="p-3.5 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            data-testid={`perm-${r.id}-${item.id}`}
                            checked={isChecked}
                            disabled={r.id === 'admin'}
                            onCheckedChange={() => togglePermission(r.id, item.url)}
                            className="cursor-pointer"
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
