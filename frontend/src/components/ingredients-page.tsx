import { useState, useEffect, useCallback } from "react"
import { api, type Ingredient } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { fmt } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2 } from "lucide-react"

const UNIT_OPTIONS: Record<string, string[]> = {
  weight: ["kg", "g"],
  volume: ["L", "ml"],
  count: ["piece"],
}

interface Props {
  onError: (msg: string) => void
}

export function IngredientsPage({ onError }: Props) {
  const { t } = useI18n()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState("")

  // Form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState("weight")
  const [displayUnit, setDisplayUnit] = useState("kg")
  const [price, setPrice] = useState("")

  const load = useCallback(async () => {
    try {
      setIngredients(await api.listIngredients())
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }, [onError])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setName("")
    setCategory("weight")
    setDisplayUnit("kg")
    setPrice("")
    setEditingId(null)
  }

  function openAdd() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(ing: Ingredient) {
    setName(ing.name)
    setCategory(ing.category)
    setDisplayUnit(ing.display_unit)
    setPrice(String(ing.price_in_display_unit))
    setEditingId(ing.id)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateIngredient(editingId, {
          name,
          category,
          display_unit: displayUnit,
          price_in_display_unit: parseFloat(price),
        })
      } else {
        await api.createIngredient({
          name,
          category,
          display_unit: displayUnit,
          price_in_display_unit: parseFloat(price),
        })
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
      await api.deleteIngredient(id)
      load()
    } catch (e: unknown) {
      onError((e as Error).message)
    }
  }

  async function saveInlinePrice(id: number) {
    const val = parseFloat(editingPriceValue)
    if (isNaN(val)) {
      setEditingPriceId(null)
      return
    }
    try {
      await api.updateIngredient(id, { price_in_display_unit: val })
      load()
    } catch (e: unknown) {
      onError((e as Error).message)
    }
    setEditingPriceId(null)
  }

  const categoryBadge = (cat: string) => {
    const variant = cat === "weight" ? "default" : cat === "volume" ? "secondary" : "outline"
    return <Badge variant={variant}>{t(cat as "weight" | "volume" | "count")}</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("ingredients")}</h2>
        <Button onClick={openAdd} data-testid="add-ingredient-btn">
          <Plus className="h-4 w-4" />
          {t("add_ingredient")}
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("no_ingredients")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="ingredients-table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">{t("name")}</th>
                    <th className="text-left px-4 py-3 font-medium">{t("category")}</th>
                    <th className="text-left px-4 py-3 font-medium">{t("display_unit")}</th>
                    <th className="text-right px-4 py-3 font-medium">{t("price_krw")}</th>
                    <th className="text-right px-4 py-3 font-medium">{t("updated")}</th>
                    <th className="text-right px-4 py-3 font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`ingredient-row-${ing.id}`}>
                      <td className="px-4 py-3 font-medium">{ing.name}</td>
                      <td className="px-4 py-3">{categoryBadge(ing.category)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ing.display_unit}</td>
                      <td className="px-4 py-3 text-right">
                        {editingPriceId === ing.id ? (
                          <Input
                            type="number"
                            step="any"
                            value={editingPriceValue}
                            onChange={e => setEditingPriceValue(e.target.value)}
                            onBlur={() => saveInlinePrice(ing.id)}
                            onKeyDown={e => { if (e.key === "Enter") saveInlinePrice(ing.id) }}
                            className="w-28 ml-auto text-right"
                            autoFocus
                            data-testid="inline-price-input"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-primary transition-colors font-mono"
                            onClick={() => {
                              setEditingPriceId(ing.id)
                              setEditingPriceValue(String(ing.price_in_display_unit))
                            }}
                            data-testid={`price-${ing.id}`}
                          >
                            {fmt(ing.price_in_display_unit)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {new Date(ing.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ing)} data-testid={`edit-ingredient-${ing.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ing.id)} data-testid={`delete-ingredient-${ing.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("edit_ingredient") : t("add_ingredient")}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="ingredient-form">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required data-testid="ingredient-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("category")}</Label>
                <Select value={category} onValueChange={v => { setCategory(v); setDisplayUnit(UNIT_OPTIONS[v][0]) }}>
                  <SelectTrigger data-testid="ingredient-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">{t("weight")}</SelectItem>
                    <SelectItem value="volume">{t("volume")}</SelectItem>
                    <SelectItem value="count">{t("count")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("display_unit")}</Label>
                <Select value={displayUnit} onValueChange={setDisplayUnit}>
                  <SelectTrigger data-testid="ingredient-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(UNIT_OPTIONS[category] || []).map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("price_krw")} {t("per")} {displayUnit}</Label>
              <Input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} required data-testid="ingredient-price" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" data-testid="ingredient-submit">{editingId ? t("save") : t("add")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
