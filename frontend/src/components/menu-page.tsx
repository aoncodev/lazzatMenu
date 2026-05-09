import { useState, useEffect, useCallback } from "react"
import { api, type Ingredient, type MenuItemSummary, type MenuItemDetail } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { fmt } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RecipeBuilder, toRecipeItemsIn, type RecipeRow } from "@/components/recipe-builder"
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react"

function foodCostPct(costPerPortion: number, sellPrice: number): number {
  if (!sellPrice) return 0
  return (costPerPortion / sellPrice) * 100
}

function foodCostColor(pct: number): string {
  if (pct <= 30) return "text-green-600"
  if (pct <= 40) return "text-yellow-600"
  return "text-red-600"
}

function foodCostBgColor(pct: number): string {
  if (pct <= 30) return "bg-green-50 border-green-200"
  if (pct <= 40) return "bg-yellow-50 border-yellow-200"
  return "bg-red-50 border-red-200"
}

interface Props {
  onError: (msg: string) => void
}

export function MenuPage({ onError }: Props) {
  const { t } = useI18n()
  const [items, setItems] = useState<MenuItemSummary[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<MenuItemDetail | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form
  const [name, setName] = useState("")
  const [portions, setPortions] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([])

  const load = useCallback(async () => {
    try {
      const [menuItems, ings] = await Promise.all([api.listMenu(), api.listIngredients()])
      setItems(menuItems)
      setIngredients(ings)
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }, [onError])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setName("")
    setPortions("")
    setSellPrice("")
    setRecipeRows([{ ingredient_id: "", quantity: "", input_unit: "" }])
    setEditingId(null)
  }

  function openAdd() {
    resetForm()
    setDialogOpen(true)
  }

  async function openEdit(id: number) {
    try {
      const detail = await api.getMenuItem(id)
      setName(detail.name)
      setPortions(String(detail.portions))
      setSellPrice(String(detail.sell_price))
      setRecipeRows(
        detail.recipe.map(r => ({
          ingredient_id: String(r.ingredient_id),
          quantity: String(r.quantity),
          input_unit: r.unit,
        }))
      )
      setEditingId(id)
      setDialogOpen(true)
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const recipe = toRecipeItemsIn(recipeRows)
    if (recipe.length === 0) {
      onError("Add at least one ingredient to the recipe")
      return
    }
    const data = {
      name,
      portions: parseInt(portions),
      sell_price: parseFloat(sellPrice),
      recipe,
    }
    try {
      if (editingId) {
        await api.updateMenuItem(editingId, data)
      } else {
        await api.createMenuItem(data)
      }
      setDialogOpen(false)
      resetForm()
      load()
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteMenuItem(id)
      if (expandedId === id) setExpandedId(null)
      load()
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }

  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedDetail(null)
      return
    }
    try {
      const detail = await api.getMenuItem(id)
      setExpandedDetail(detail)
      setExpandedId(id)
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("menu")}</h2>
        <Button onClick={openAdd} data-testid="add-menu-btn">
          <Plus className="h-4 w-4" />
          {t("add_menu_item")}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {t("no_menu_items")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(item => {
            const fc = foodCostPct(item.cost_per_portion, item.sell_price)
            const profitPerPortion = item.sell_price - item.cost_per_portion

            return (
              <Card key={item.id} className="overflow-hidden" data-testid={`menu-card-${item.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.portions} {t("portions_label")} &middot; {t("sell")}: {fmt(item.sell_price)} KRW
                      </CardDescription>
                    </div>
                    <Badge variant={fc <= 30 ? "success" : fc <= 40 ? "warning" : "destructive"}>
                      {fc <= 30 ? t("food_cost_good") : fc <= 40 ? t("food_cost_warning") : t("food_cost_high")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Main metrics row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-lg border p-3 ${foodCostBgColor(fc)}`}>
                      <p className="text-xs text-muted-foreground font-medium">{t("food_cost_pct")}</p>
                      <p className={`text-2xl font-bold font-mono ${foodCostColor(fc)}`}>
                        {fc.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{t("cost_per_portion")}</p>
                      <p className="text-lg font-bold font-mono" data-testid={`menu-cost-${item.id}`}>{fmt(item.cost_per_portion)}</p>
                      <p className="text-xs text-muted-foreground">KRW</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{t("profit_margin")}</p>
                      <p className="text-lg font-bold font-mono text-green-600">+{fmt(profitPerPortion)}</p>
                      <p className="text-xs text-muted-foreground">KRW</p>
                    </div>
                  </div>

                  {/* Batch totals */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                    <span>{t("total_batch_cost")}: <span className="font-mono font-medium text-foreground">{fmt(item.total_cost)} KRW</span></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(item.id)} data-testid={`toggle-recipe-${item.id}`}>
                      {expandedId === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {expandedId === item.id ? t("hide_recipe") : t("show_recipe")}
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item.id)} data-testid={`edit-menu-${item.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} data-testid={`delete-menu-${item.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {expandedId === item.id && expandedDetail && (
                    <div className="border rounded-lg overflow-hidden" data-testid={`recipe-detail-${item.id}`}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-xs">
                            <th className="text-left px-3 py-2 font-medium">{t("ingredient")}</th>
                            <th className="text-right px-3 py-2 font-medium">{t("quantity")}</th>
                            <th className="text-right px-3 py-2 font-medium">{t("unit")}</th>
                            <th className="text-right px-3 py-2 font-medium">{t("line_cost")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expandedDetail.recipe.map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2">{r.ingredient}</td>
                              <td className="px-3 py-2 text-right font-mono">{r.quantity}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{r.unit}</td>
                              <td className="px-3 py-2 text-right font-mono">{fmt(r.line_cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t("edit_menu_item") : t("add_menu_item")}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="menu-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{t("name")}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required data-testid="menu-name" />
              </div>
              <div className="space-y-2">
                <Label>{t("portions")}</Label>
                <Input type="number" min="1" value={portions} onChange={e => setPortions(e.target.value)} required data-testid="menu-portions" />
              </div>
              <div className="space-y-2">
                <Label>{t("sell_price")}</Label>
                <Input type="number" step="any" value={sellPrice} onChange={e => setSellPrice(e.target.value)} required data-testid="menu-sell-price" />
              </div>
            </div>

            <RecipeBuilder
              rows={recipeRows}
              onChange={setRecipeRows}
              ingredients={ingredients}
              portions={parseInt(portions) || 0}
              sellPrice={parseFloat(sellPrice) || 0}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" data-testid="menu-submit">{editingId ? t("save") : t("add")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
