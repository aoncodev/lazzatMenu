import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

const translations = {
  en: {
    title: "Lazzat Menu Calculator",
    ingredients: "Ingredients",
    menu: "Menu",
    add_ingredient: "Add Ingredient",
    edit_ingredient: "Edit Ingredient",
    name: "Name",
    category: "Category",
    weight: "Weight",
    volume: "Volume",
    count: "Count",
    display_unit: "Unit",
    price_krw: "Price (KRW)",
    price: "Price",
    updated: "Updated",
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    actions: "Actions",
    add_menu_item: "Add Menu Item",
    edit_menu_item: "Edit Menu Item",
    portions: "Portions",
    sell_price: "Sell Price (KRW)",
    recipe: "Recipe",
    add_ingredient_row: "Add Ingredient",
    ingredient: "Ingredient",
    quantity: "Quantity",
    unit: "Unit",
    line_cost: "Cost",
    cost_per_portion: "Cost / portion",
    total_batch_cost: "Total batch cost",
    food_cost_pct: "Food Cost %",
    profit_margin: "Profit Margin",
    sell: "Sell",
    per_portion: "per portion",
    portions_label: "portions",
    show_recipe: "Show recipe",
    hide_recipe: "Hide recipe",
    select_ingredient: "Select ingredient",
    select_category: "Select category",
    select_unit: "Select unit",
    no_ingredients: "No ingredients yet. Add your first ingredient above.",
    no_menu_items: "No menu items yet. Create your first dish.",
    delete_confirm: "Are you sure?",
    ingredient_used_error: "Cannot delete: ingredient is used in recipes",
    notes: "Notes",
    piece: "piece",
    per: "per",
    batch_yield: "Batch yields",
    food_cost_good: "Good",
    food_cost_warning: "Watch",
    food_cost_high: "High",
  },
  ru: {
    title: "Лаззат — Калькулятор меню",
    ingredients: "Ингредиенты",
    menu: "Меню",
    add_ingredient: "Добавить ингредиент",
    edit_ingredient: "Редактировать ингредиент",
    name: "Название",
    category: "Категория",
    weight: "Вес",
    volume: "Объём",
    count: "Штуки",
    display_unit: "Единица",
    price_krw: "Цена (KRW)",
    price: "Цена",
    updated: "Обновлено",
    add: "Добавить",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Редактировать",
    actions: "Действия",
    add_menu_item: "Добавить блюдо",
    edit_menu_item: "Редактировать блюдо",
    portions: "Порции",
    sell_price: "Цена продажи (KRW)",
    recipe: "Рецепт",
    add_ingredient_row: "Добавить ингредиент",
    ingredient: "Ингредиент",
    quantity: "Количество",
    unit: "Единица",
    line_cost: "Стоимость",
    cost_per_portion: "Себестоимость / порция",
    total_batch_cost: "Стоимость партии",
    food_cost_pct: "Фудкост %",
    profit_margin: "Прибыль",
    sell: "Продажа",
    per_portion: "за порцию",
    portions_label: "порций",
    show_recipe: "Показать рецепт",
    hide_recipe: "Скрыть рецепт",
    select_ingredient: "Выберите ингредиент",
    select_category: "Выберите категорию",
    select_unit: "Выберите единицу",
    no_ingredients: "Ингредиентов пока нет. Добавьте первый ингредиент.",
    no_menu_items: "Блюд пока нет. Создайте первое блюдо.",
    delete_confirm: "Вы уверены?",
    ingredient_used_error: "Нельзя удалить: ингредиент используется в рецептах",
    notes: "Заметки",
    piece: "штука",
    per: "за",
    batch_yield: "Выход партии",
    food_cost_good: "Норма",
    food_cost_warning: "Внимание",
    food_cost_high: "Высокий",
  },
} as const

type Lang = keyof typeof translations
type Key = keyof (typeof translations)["en"]

interface I18nContextType {
  lang: Lang
  t: (key: Key) => string
  toggle: () => void
}

const I18nContext = createContext<I18nContextType>(null!)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("lazzat-lang") as Lang | null
    return saved === "ru" ? "ru" : "en"
  })

  const t = useCallback((key: Key): string => {
    return translations[lang][key] ?? translations.en[key] ?? key
  }, [lang])

  const toggle = useCallback(() => {
    setLang(prev => {
      const next = prev === "en" ? "ru" : "en"
      localStorage.setItem("lazzat-lang", next)
      return next
    })
  }, [])

  return (
    <I18nContext.Provider value={{ lang, t, toggle }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
