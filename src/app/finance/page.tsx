"use client"

import { useState,useEffect } from 'react'
import {
DollarSign,
TrendingUp,
TrendingDown,
CreditCard,
Plus,
Download,
PieChart as PieChartIcon,
FileSpreadsheet,
ArrowUpRight,
ArrowDownRight,
Tag,
Edit,
Trash2
} from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card,CardContent,CardHeader,CardTitle,CardDescription } from '@/components/ui/card'
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/clinic/kpi-card'
import { usePaymentMethods } from '@/stores/clinic-preferences-store'
import { toast } from 'sonner'
import { getFinanceSummary,getTransactions,createTransaction,getTariffs,fetchApi } from '@/lib/api'

export default function FinancePage() {
  const paymentMethods = usePaymentMethods()
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [tariffs, setTariffs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('mois')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  // New Transaction modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [newTx, setNewTx] = useState({
    type: 'revenue',
    category: 'IRM',
    description: '',
    amount: '',
    method: paymentMethods[0] || 'Espèces',
    party: '',
    note: '',
  })
  useEffect(() => { if (!paymentMethods.includes(newTx.method)) setNewTx(tx => ({ ...tx, method: paymentMethods[0] || '' })) }, [paymentMethods.join('|'), newTx.method])

  const [submitting, setSubmitting] = useState(false)

  // Tariff Modal State
  const [tariffModalOpen, setTariffModalOpen] = useState(false)
  const [editingTariff, setEditingTariff] = useState<any>(null)
  const [tariffForm, setTariffForm] = useState({
    code: '',
    label: '',
    modality: 'IRM',
    price: '',
  })
  const [submittingTariff, setSubmittingTariff] = useState(false)

  const fetchFinanceData = async () => {
    setLoading(true)
    try {
      const [sum, txs, tars] = await Promise.all([
        getFinanceSummary(),
        getTransactions({ type: typeFilter !== 'all' ? typeFilter : undefined, search: search || undefined }),
        getTariffs().catch(() => [
          { id: 1, code: 'IRM-CER', label: 'IRM Cérébrale 3T', modality: 'IRM', price: 8500 },
          { id: 2, code: 'CT-ABD', label: 'Scanner CT Abdomen', modality: 'Scanner (CT)', price: 7000 },
          { id: 3, code: 'RAD-THO', label: 'Radiographie Thorax', modality: 'Radiographie', price: 2500 },
          { id: 4, code: 'ECH-VAS', label: 'Échographie Doppler', modality: 'Échographie', price: 6000 },
          { id: 5, code: 'MAM-BIL', label: 'Mammographie Bilatérale', modality: 'Mammographie', price: 5500 },
        ]),
      ])
      setSummary(sum)
      setTransactions(txs || [])
      setTariffs(tars || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinanceData()
  }, [typeFilter, search])

  const handleCreateTransaction = async () => {
    if (!newTx.description.trim() || !newTx.amount) return
    setSubmitting(true)
    try {
      await createTransaction(newTx)
      setModalOpen(false)
      setNewTx({ type: 'revenue', category: 'IRM', description: '', amount: '', method: paymentMethods[0] || 'Espèces', party: '', note: '' })
      toast.success('Transaction financière enregistrée avec succès !')
      await fetchFinanceData()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'enregistrement de la transaction.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenNewTariff = () => {
    setEditingTariff(null)
    setTariffForm({
      code: `EXAM-${Math.floor(100 + Math.random() * 900)}`,
      label: '',
      modality: 'IRM',
      price: '8500',
    })
    setTariffModalOpen(true)
  }

  const handleOpenEditTariff = (t: any) => {
    setEditingTariff(t)
    setTariffForm({
      code: t.code,
      label: t.label,
      modality: t.modality,
      price: String(t.price),
    })
    setTariffModalOpen(true)
  }

  const handleSaveTariff = async () => {
    if (!tariffForm.label.trim() || !tariffForm.price) {
      toast.error('Veuillez saisir le nom de l\'examen et son prix.')
      return
    }
    setSubmittingTariff(true)
    try {
      if (editingTariff) {
        await fetchApi(`/tariffs/${editingTariff.id}`, {
          method: 'PUT',
          body: JSON.stringify(tariffForm),
        })
        toast.success(`Le tarif pour "${tariffForm.label}" a été mis à jour !`)
      } else {
        await fetchApi('/tariffs', {
          method: 'POST',
          body: JSON.stringify(tariffForm),
        })
        toast.success(`Nouveau tarif "${tariffForm.label}" ajouté (${tariffForm.price} DA) !`)
      }
      setTariffModalOpen(false)
      await fetchFinanceData()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde du tarif.')
    } finally {
      setSubmittingTariff(false)
    }
  }

  const handleDeleteTariff = async (id: number) => {
    try {
      await fetchApi(`/tariffs/${id}`, { method: 'DELETE' })
      toast.success('Tarif d\'examen supprimé.')
      await fetchFinanceData()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la suppression du tarif.')
    }
  }

  const handleExportCsv = () => {
    window.open('/api/finance/export.csv', '_blank')
  }

  const kpis = summary || {
    revenue: 350000,
    expenses: 60000,
    profit: 290000,
    unpaid: 12000,
  }

  return (
    <BaseLayout title="Finance, Comptabilité & Tarification" description="Gestion des recettes, bilan financier, tarification des examens et journal comptable">
      <div className="space-y-6 px-4 md:px-6">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-muted rounded-xl p-1 text-xs font-semibold">
            {(['jour', 'semaine', 'mois', 'annee'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg capitalize transition-all ${
                  period === p ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button data-testid="finance-export-csv" variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-1" /> Exporter CSV
            </Button>

            <Button size="sm" variant="outline" onClick={handleOpenNewTariff} className="gap-1 border-primary/40 text-primary font-bold hover:bg-primary/10 cursor-pointer">
              <Tag className="h-4 w-4" /> Tarification Examens
            </Button>

            <Button data-testid="finance-new-tx-btn" size="sm" onClick={() => setModalOpen(true)} className="bg-primary text-primary-foreground font-semibold cursor-pointer">
              <Plus className="h-4 w-4 mr-1" /> Saisir Transaction
            </Button>
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Chiffre d'Affaires Brut"
            value={`${kpis.revenue.toLocaleString('fr-FR')} DA`}
            change="+18% vs mois dernier"
            trend="up"
            icon={TrendingUp}
          />
          <KpiCard
            title="Dépenses & Charges"
            value={`${kpis.expenses.toLocaleString('fr-FR')} DA`}
            change="Maintenances & Fournitures"
            trend="down"
            icon={TrendingDown}
          />
          <KpiCard
            title="Bénéfice Net"
            value={`${kpis.profit.toLocaleString('fr-FR')} DA`}
            change="Marge 82%"
            trend="up"
            icon={DollarSign}
          />
          <KpiCard
            title="Reliquat Reste à Recouvrer"
            value={`${kpis.unpaid.toLocaleString('fr-FR')} DA`}
            change="Tiers payant en cours"
            trend="neutral"
            icon={CreditCard}
          />
        </div>

        {/* SECTION TARIFS & PRIX DES EXAMENS RADIOLOGIQUES */}
        <Card className="border-2 border-primary/20 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b bg-primary/5">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                <Tag className="h-5 w-5" /> Tarification & Prix des Examens Radiologiques
              </CardTitle>
              <CardDescription>
                Définissez et modifiez les tarifs appliqués lors des encaissements des patients de la file d'attente.
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleOpenNewTariff} className="gap-1.5 font-bold bg-primary text-primary-foreground cursor-pointer">
              <Plus className="h-4 w-4" /> Ajouter un Prix d'Examen
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-28 font-semibold">Code Examen</TableHead>
                  <TableHead className="font-semibold">Examen / Libellé Radiologique</TableHead>
                  <TableHead className="font-semibold">Modalité</TableHead>
                  <TableHead className="text-right font-semibold">Prix Public (DA)</TableHead>
                  <TableHead className="text-right font-semibold">Estimation Prise en Charge CNAS (80%)</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tariffs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Aucun tarif configuré. Cliquez sur "Ajouter un Prix d'Examen".
                    </TableCell>
                  </TableRow>
                ) : (
                  tariffs.map((t) => {
                    const cnasEst = (t.price * 0.8).toFixed(0)
                    return (
                      <TableRow key={t.id || t.code} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {t.code}
                        </TableCell>
                        <TableCell className="font-bold text-sm text-foreground">
                          {t.label}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold text-xs">
                            {t.modality || 'Imagerie'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-base text-emerald-600 font-mono">
                          {Number(t.price).toLocaleString('fr-FR')} DA
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-500 font-mono">
                          ~ {Number(cnasEst).toLocaleString('fr-FR')} DA
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditTariff(t)}
                              className="h-8 text-2xs px-2.5 font-bold cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1 text-primary" /> Modifier Prix
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTariff(t.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Supprimer tarif"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts & Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-2 shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Évolution du Chiffre d'Affaires par Jour (DA)
              </CardTitle>
              <CardDescription>Revenus de la clinique sur la semaine</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Visual SVG Bar Chart */}
              <div className="h-48 flex items-end justify-between gap-4 pt-6 px-4 border-b pb-2">
                {[
                  { label: 'Lun', val: 24000 },
                  { label: 'Mar', val: 32000 },
                  { label: 'Mer', val: 28000 },
                  { label: 'Jeu', val: 45000 },
                  { label: 'Ven', val: 38000 },
                  { label: 'Sam', val: 19000 },
                ].map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-[10px] font-bold text-muted-foreground">{item.val / 1000}k</div>
                    <div className="w-full bg-primary/20 rounded-t-lg overflow-hidden flex items-end h-32">
                      <div
                        className="w-full bg-primary rounded-t-lg transition-all"
                        style={{ height: `${(item.val / 45000) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs font-bold text-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" /> Recettes par Examen
              </CardTitle>
              <CardDescription>Répartition des recettes d'imagerie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'IRM Cérébrale', pct: 45, color: 'bg-sky-500' },
                { name: 'Scanner CT', pct: 30, color: 'bg-indigo-500' },
                { name: 'Radiographie', pct: 15, color: 'bg-emerald-500' },
                { name: 'Échographie', pct: 10, color: 'bg-amber-500' },
              ].map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{c.name}</span>
                    <span>{c.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="border-2 shadow-xs overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Journal Comptable & Transactions
              </CardTitle>
              <CardDescription>Flux de trésorerie de la clinique</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Rechercher par libellé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[200px] text-xs"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="revenue">Encaissements (+)</SelectItem>
                  <SelectItem value="expense">Dépenses (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Montant (DA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement des transactions...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune transaction répertoriée.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => {
                  const isRev = t.type === 'revenue'
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${
                            isRev ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {isRev ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isRev ? 'Recette' : 'Dépense'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{t.date}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-primary">{t.reference}</TableCell>
                      <TableCell className="text-xs font-semibold">{t.category}</TableCell>
                      <TableCell className="text-xs">{t.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.method}</TableCell>
                      <TableCell className={`text-right font-bold text-sm ${isRev ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isRev ? '+' : '-'}{t.amount.toLocaleString('fr-FR')} DA
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* New Transaction Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Saisie d'une Transaction Comptable</DialogTitle>
            <DialogDescription>Enregistrez une recette ou une charge dans la trésorerie.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type de Flux</Label>
                <Select value={newTx.type} onValueChange={(val) => setNewTx({ ...newTx, type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Encaissement / Recette (+)</SelectItem>
                    <SelectItem value="expense">Dépense / Charge (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={newTx.category} onValueChange={(val) => setNewTx({ ...newTx, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IRM">IRM</SelectItem>
                    <SelectItem value="Scanner">Scanner</SelectItem>
                    <SelectItem value="Radiographie">Radiographie</SelectItem>
                    <SelectItem value="Échographie">Échographie</SelectItem>
                    <SelectItem value="Maintenance">Maintenance Équipement</SelectItem>
                    <SelectItem value="Fournitures">Fournitures Médicales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx_desc">Description / Motif *</Label>
              <Input
                id="tx_desc"
                placeholder="Ex: Prestation IRM Cérébrale M. Benali"
                value={newTx.description}
                onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx_amount">Montant (DA) *</Label>
                <Input
                  id="tx_amount"
                  type="number"
                  placeholder="15000"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mode de Règlement</Label>
                <Select value={newTx.method} onValueChange={(val) => setNewTx({ ...newTx, method: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateTransaction} disabled={submitting}>
              {submitting ? 'Validation...' : 'Valider Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Create Tariff Modal */}
      <Dialog open={tariffModalOpen} onOpenChange={setTariffModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Tag className="h-5 w-5" />
              {editingTariff ? 'Modification du Tarif Examen' : 'Nouveau Tarif Examen Radiologique'}
            </DialogTitle>
            <DialogDescription>
              Ajustez le tarif public appliqué lors des encaissements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tariff_code">Code Tarif</Label>
                <Input
                  id="tariff_code"
                  value={tariffForm.code}
                  disabled={!!editingTariff}
                  onChange={(e) => setTariffForm({ ...tariffForm, code: e.target.value })}
                  placeholder="EXAM-101"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Modalité</Label>
                <Select value={tariffForm.modality} onValueChange={(val) => setTariffForm({ ...tariffForm, modality: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Modalité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IRM">IRM</SelectItem>
                    <SelectItem value="Scanner (CT)">Scanner (CT)</SelectItem>
                    <SelectItem value="Radiographie">Radiographie</SelectItem>
                    <SelectItem value="Échographie">Échographie</SelectItem>
                    <SelectItem value="Mammographie">Mammographie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tariff_label">Nom / Libellé de l'Examen *</Label>
              <Input
                id="tariff_label"
                value={tariffForm.label}
                onChange={(e) => setTariffForm({ ...tariffForm, label: e.target.value })}
                placeholder="Ex: IRM Cérébrale & Médullaire 3T"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tariff_price">Prix Public (DA) *</Label>
              <Input
                id="tariff_price"
                type="number"
                value={tariffForm.price}
                onChange={(e) => setTariffForm({ ...tariffForm, price: e.target.value })}
                placeholder="8500"
                className="font-mono text-base font-bold text-emerald-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTariffModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveTariff} disabled={submittingTariff} className="bg-primary text-primary-foreground font-bold">
              {submittingTariff ? 'Enregistrement...' : 'Enregistrer le Tarif'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
