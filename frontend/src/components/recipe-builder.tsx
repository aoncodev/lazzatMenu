import { useState } from "react"
import { useI18n } from "@/lib/i18n"
import { type Ingredient, type RecipeItemIn } from "@/lib/api"
import { cn, fmt } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command"
import { Plus, Trash2, ChevronsUpDown, Check } from "lucide-react"

const UNIT_OPTIONS: Record<string, string[]> = {
  weight: ["kg", "g"],
  volume: ["L", "ml"],
  count: ["piece"],
}

const UNIT_TO_BASE: Record<string, number> = {
  g: 1, kg: 1000, ml: 1, L: 1000, piece: 1,
}

export interface RecipeRow {
  ingredient_id: string
  quantity: string
  input_unit: string
}

type RowUpdater = RecipeRow[] | ((prev: RecipeRow[]) => RecipeRow[])

interface Props {
  rows: RecipeRow[]
  onChange: (updater: RowUpdater) => void
  ingredients: Ingredient[]
  portions: number
  sellPrice: number
}

function IngredientCombobox({
  value,
  onSelect,
  ingredients,
  placeholder,
}: {
  value: string
  onSelect: (id: string) => void
  ingredients: Ingredient[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const selected = ingredients.find(i => String(i.id) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 px-3"
        >
          <span className="truncate">
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>—</CommandEmpty>
            {ingredients.map(ing => (
              <CommandItem
                key={ing.id}
                value={ing.name}
                onSelect={() => {
                  onSelect(String(ing.id))
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === String(ing.id) ? "opacity-100" : "opacity-0")} />
                <span className="flex-1">{ing.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {fmt(ing.price_in_display_unit)}/{ing.display_unit}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function RecipeBuilder({ rows, onChange, ingredients, portions, sellPrice }: Props) {
  const { t } = useI18n()

  function addRow() {
    onChange(prev => [...prev, { ingredient_id: "", quantity: "", input_unit: "" }])
  }

  function removeRow(idx: number) {
    onChange(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof RecipeRow, value: string) {
    onChange(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const next = { ...r, [field]: value }
      if (field === "ingredient_id") {
        const ing = ingredients.find(ig => String(ig.id) === value)
        if (ing) {
          const units = UNIT_OPTIONS[ing.category] || []
          next.input_unit = units[0] || ""
        }
      }
      return next
    }))
  }

  function getLineCost(row: RecipeRow): number | null {
    if (!row.ingredient_id || !row.quantity || !row.input_unit) return null
    const ing = ingredients.find(i => String(i.id) === row.ingredient_id)
    if (!ing) return null
    const qty = parseFloat(row.quantity)
    if (isNaN(qty)) return null
    const factor = UNIT_TO_BASE[row.input_unit] || 1
    return qty * factor * ing.price_per_base_unit
  }

  const totalCost = rows.reduce((sum, r) => sum + (getLineCost(r) || 0), 0)
  const costPerPortion = portions > 0 ? totalCost / portions : 0
  const foodCostPct = sellPrice > 0 ? (costPerPortion / sellPrice) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t("recipe")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} data-testid="add-recipe-row">
          <Plus className="h-3 w-3" />
          {t("add_ingredient_row")}
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 text-xs text-muted-foreground font-medium px-1">
            <span>{t("ingredient")}</span>
            <span>{t("quantity")}</span>
            <span>{t("unit")}</span>
            <span className="text-right">{t("line_cost")}</span>
            <span></span>
          </div>

          {rows.map((row, idx) => {
            const selectedIng = ingredients.find(i => String(i.id) === row.ingredient_id)
            const unitOptions = selectedIng ? (UNIT_OPTIONS[selectedIng.category] || []) : []
            const lineCost = getLineCost(row)

            return (
              <div key={idx} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-center" data-testid={`recipe-row-${idx}`}>
                <IngredientCombobox
                  value={row.ingredient_id}
                  onSelect={v => updateRow(idx, "ingredient_id", v)}
                  ingredients={ingredients}
                  placeholder={t("select_ingredient")}
                />

                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={row.quantity}
                  onChange={e => updateRow(idx, "quantity", e.target.value)}
                  data-testid={`recipe-qty-${idx}`}
                />

                <Select value={row.input_unit} onValueChange={v => updateRow(idx, "input_unit", v)} disabled={!selectedIng}>
                  <SelectTrigger data-testid={`recipe-unit-${idx}`}>
                    <SelectValue placeholder={t("unit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-right text-sm font-mono tabular-nums" data-testid={`recipe-linecost-${idx}`}>
                  {lineCost != null ? fmt(lineCost) : "—"}
                </span>

                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(idx)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Live cost preview */}
      {rows.length > 0 && totalCost > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm" data-testid="recipe-preview">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("total_batch_cost")}</span>
            <span className="font-semibold font-mono">{fmt(totalCost)} KRW</span>
          </div>
          {portions > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("cost_per_portion")}</span>
              <span className="font-semibold font-mono">{fmt(costPerPortion)} KRW</span>
            </div>
          )}
          {sellPrice > 0 && portions > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("food_cost_pct")}</span>
              <span className={`font-semibold font-mono ${foodCostPct <= 30 ? "text-green-600" : foodCostPct <= 40 ? "text-yellow-600" : "text-red-600"}`}>
                {foodCostPct.toFixed(1)}%
              </span>
            </div>
          )}
          {sellPrice > 0 && portions > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("profit_margin")}</span>
              <span className="font-semibold font-mono text-green-600">
                +{fmt(sellPrice - costPerPortion)} KRW
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function toRecipeItemsIn(rows: RecipeRow[]): RecipeItemIn[] {
  return rows
    .filter(r => r.ingredient_id && r.quantity && r.input_unit)
    .map(r => ({
      ingredient_id: parseInt(r.ingredient_id),
      quantity: parseFloat(r.quantity),
      input_unit: r.input_unit,
    }))
}
