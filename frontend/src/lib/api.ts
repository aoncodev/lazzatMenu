const API = "/api"

export interface Ingredient {
  id: number
  name: string
  category: "weight" | "volume" | "count"
  display_unit: string
  price_per_base_unit: number
  price_in_display_unit: number
  updated_at: string
}

export interface RecipeItemOut {
  ingredient: string
  ingredient_id: number
  quantity: number
  unit: string
  line_cost: number
}

export interface MenuItemSummary {
  id: number
  name: string
  portions: number
  sell_price: number
  target_margin_pct: number | null
  total_cost: number
  cost_per_portion: number
  margin_pct: number | null
  hits_target: boolean | null
}

export interface MenuItemDetail extends MenuItemSummary {
  notes: string | null
  recipe: RecipeItemOut[]
}

export interface RecipeItemIn {
  ingredient_id: number
  quantity: number
  input_unit: string
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Error ${res.status}`)
  }
  if (res.status === 204) return null as T
  return res.json()
}

export const api = {
  // Ingredients
  listIngredients: () => request<Ingredient[]>("/ingredients"),

  createIngredient: (data: { name: string; category: string; display_unit: string; price_in_display_unit: number }) =>
    request<Ingredient>("/ingredients", { method: "POST", body: JSON.stringify(data) }),

  updateIngredient: (id: number, data: { name?: string; category?: string; display_unit?: string; price_in_display_unit?: number }) =>
    request<Ingredient>(`/ingredients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteIngredient: (id: number) =>
    request<null>(`/ingredients/${id}`, { method: "DELETE" }),

  // Menu
  listMenu: () => request<MenuItemSummary[]>("/menu"),

  getMenuItem: (id: number) => request<MenuItemDetail>(`/menu/${id}`),

  createMenuItem: (data: { name: string; portions: number; sell_price: number; target_margin_pct?: number | null; recipe: RecipeItemIn[] }) =>
    request<MenuItemDetail>("/menu", { method: "POST", body: JSON.stringify(data) }),

  updateMenuItem: (id: number, data: { name?: string; portions?: number; sell_price?: number; target_margin_pct?: number | null; recipe?: RecipeItemIn[] }) =>
    request<MenuItemDetail>(`/menu/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteMenuItem: (id: number) =>
    request<null>(`/menu/${id}`, { method: "DELETE" }),
}
