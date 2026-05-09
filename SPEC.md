# SPEC.md - Lazzat Menu Calculator

## Stack
- Backend: Python 3.11, FastAPI, SQLAlchemy, SQLite
- Frontend: Single-page app served by FastAPI. HTML + Tailwind (via CDN) + vanilla JS. No build step.
- Container: Single Dockerfile, docker-compose for one-command run. SQLite file mounted as a volume so data persists across container restarts.

## Project layout
```
lazzat/
  docker-compose.yml
  Dockerfile
  requirements.txt
  README.md
  data/                    # mounted volume, holds lazzat.db
  app/
    main.py                # FastAPI app, route registration, static mount
    db.py                  # SQLAlchemy engine, session, Base
    models.py              # ORM models
    schemas.py             # Pydantic request/response models
    units.py               # unit conversion logic + constants
    pricing.py             # cost calculation (pure functions)
    seed.py                # seeds Pilaf example on first run
    routers/
      ingredients.py
      menu.py
    static/
      index.html
      app.js
      styles.css
```

## Data model

### Ingredient
- id: int PK
- name: str unique (e.g. "Lamb", "Rice")
- category: enum - weight | volume | count
- price_per_base_unit: float (KRW per gram, ml, or piece)
- display_unit: str (preferred unit for UI: "kg", "L", "piece")
- updated_at: datetime (auto-updated when price changes)

Why store price per base unit (gram/ml/piece) internally: users enter "20,000 KRW per kg" but we convert and store price_per_base_unit = 20.0 (KRW/g). Recipe quantities also normalize to grams/ml/pieces. This eliminates the entire class of unit-mismatch bugs.

### MenuItem
- id: int PK
- name: str unique (e.g. "Uzbek Pilaf")
- portions: int (yield from one batch)
- sell_price: float (KRW per portion)
- target_margin_pct: float nullable (e.g. 70.0 means we want >=70%)
- notes: str nullable

### RecipeItem (join: MenuItem <-> Ingredient)
- id: int PK
- menu_item_id: FK MenuItem (cascade delete)
- ingredient_id: FK Ingredient (restrict delete - block if used in any recipe)
- quantity: float (in input_unit)
- input_unit: str ("kg", "g", "L", "ml", "piece")

We keep the user's original unit for display, convert on the fly when calculating cost. Easier to debug recipes that way.

## Unit system (units.py)
Hardcoded - no fancy unit library:

```python
WEIGHT_TO_GRAMS = {"g": 1, "kg": 1000}
VOLUME_TO_ML    = {"ml": 1, "L": 1000, "l": 1000}
COUNT_UNITS     = {"piece", "pcs", "ea"}

def to_base(quantity: float, unit: str, category: str) -> float:
    if category == "weight":  return quantity * WEIGHT_TO_GRAMS[unit]
    if category == "volume":  return quantity * VOLUME_TO_ML[unit]
    if category == "count":   return quantity
    raise ValueError(f"unknown category {category}")
```

Validate at write time: a `weight` ingredient's recipe items must use a weight unit. Reject mismatches with a clear 400.

## Pricing logic (pricing.py)
Pure functions, no DB access - take ORM objects, return numbers. Easy to unit-test.

```python
def recipe_total_cost(menu_item) -> float:
    return sum(
        to_base(ri.quantity, ri.input_unit, ri.ingredient.category)
        * ri.ingredient.price_per_base_unit
        for ri in menu_item.recipe_items
    )

def cost_per_portion(menu_item) -> float:
    return recipe_total_cost(menu_item) / menu_item.portions

def margin_pct(menu_item) -> float | None:
    if not menu_item.sell_price: return None
    cost = cost_per_portion(menu_item)
    return (menu_item.sell_price - cost) / menu_item.sell_price * 100

def hits_target(menu_item) -> bool | None:
    if menu_item.target_margin_pct is None: return None
    return margin_pct(menu_item) >= menu_item.target_margin_pct
```

## API

All under `/api`. JSON in, JSON out.

### Ingredients
- GET    /api/ingredients
- POST   /api/ingredients - body: {name, category, display_unit, price_in_display_unit}. Server converts to price_per_base_unit.
- PATCH  /api/ingredients/{id} - partial; recompute base price if price provided
- DELETE /api/ingredients/{id} - 409 if used in any recipe

### Menu
- GET    /api/menu - list with computed cost_per_portion, margin_pct, hits_target
- GET    /api/menu/{id} - full detail with recipe breakdown
- POST   /api/menu - {name, portions, sell_price, target_margin_pct, recipe: [{ingredient_id, quantity, input_unit}, ...]}
- PATCH  /api/menu/{id} - same body; replaces recipe items if `recipe` present
- DELETE /api/menu/{id}

### Menu detail response shape
```json
{
  "id": 1,
  "name": "Uzbek Pilaf",
  "portions": 20,
  "sell_price": 13000,
  "target_margin_pct": 70,
  "recipe": [
    {"ingredient": "Lamb",   "quantity": 2, "unit": "kg", "line_cost": 40000},
    {"ingredient": "Carrot", "quantity": 2, "unit": "kg", "line_cost": 6000}
  ],
  "total_cost": 57500,
  "cost_per_portion": 2875,
  "margin_pct": 77.9,
  "hits_target": true
}
```

## UI

Two pages, top tabs.

1. Ingredients - table: name, category, display unit, price per display unit, updated. Inline edit price (click -> input -> save on Enter/blur). Small form at top to add new.
2. Menu - cards, one per item: name, sell price, cost/portion, margin % (green if >= target, red if below, gray if no target). Click to expand recipe. "Add menu item" button opens a form with dynamic ingredient rows.

Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>` - acceptable for a local app.

JS: plain `fetch`, no framework. One `app.js`. Re-render after each mutation; the dataset is tiny.

## Seeding
On startup, if `ingredients` is empty, run `seed.py` to insert the Pilaf example from GOAL.md. Idempotent.

## Docker

Dockerfile:
- Base python:3.11-slim
- Copy requirements.txt, install
- Copy app/
- Expose 8000
- CMD: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

docker-compose.yml:
- One service `web`, port 8000:8000
- Volume `./data:/app/data` so the SQLite file survives rebuilds
- Env `DATABASE_URL=sqlite:////app/data/lazzat.db`

## Testing
`tests/test_pricing.py` minimum:
- Pilaf scenario gives cost_per_portion approx 2875
- Doubling lamb price doubles lamb's contribution
- Margin % calculation correct
- Unit conversion: 2 kg = 2000 g, 0.5 L = 500 ml

## Acceptance
1. `docker compose up` -> http://localhost:8000
2. Pilaf shows cost approx 2,875, margin approx 78%, green badge
3. Change lamb 20,000 -> 25,000 KRW/kg, refresh -> Pilaf cost approx 3,375
4. Delete an ingredient that's used in a recipe -> 409 + clear UI error