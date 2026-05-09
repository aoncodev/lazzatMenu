from datetime import datetime
from pydantic import BaseModel


# --- Ingredients ---

class IngredientCreate(BaseModel):
    name: str
    category: str  # weight | volume | count
    display_unit: str
    price_in_display_unit: float


class IngredientUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    display_unit: str | None = None
    price_in_display_unit: float | None = None


class IngredientOut(BaseModel):
    id: int
    name: str
    category: str
    display_unit: str
    price_per_base_unit: float
    price_in_display_unit: float
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Recipe Items ---

class RecipeItemIn(BaseModel):
    ingredient_id: int
    quantity: float
    input_unit: str


class RecipeItemOut(BaseModel):
    ingredient: str
    ingredient_id: int
    quantity: float
    unit: str
    line_cost: float


# --- Menu Items ---

class MenuItemCreate(BaseModel):
    name: str
    portions: int
    sell_price: float
    target_margin_pct: float | None = None
    notes: str | None = None
    recipe: list[RecipeItemIn]


class MenuItemUpdate(BaseModel):
    name: str | None = None
    portions: int | None = None
    sell_price: float | None = None
    target_margin_pct: float | None = None
    notes: str | None = None
    recipe: list[RecipeItemIn] | None = None


class MenuItemSummary(BaseModel):
    id: int
    name: str
    portions: int
    sell_price: float
    target_margin_pct: float | None
    total_cost: float
    cost_per_portion: float
    margin_pct: float | None
    hits_target: bool | None

    model_config = {"from_attributes": True}


class MenuItemDetail(MenuItemSummary):
    notes: str | None
    recipe: list[RecipeItemOut]
