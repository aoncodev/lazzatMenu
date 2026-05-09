# CLAUDE.md - Instructions for Claude Code

You are building the Lazzat Menu Calculator. Read these files in order before writing any code:

1. **GOAL.md** - what we're building and why
2. **SPEC.md** - the technical contract (data model, API, file layout)
3. **RULES.md** - coding standards and architectural constraints

If anything in SPEC.md conflicts with GOAL.md, GOAL.md wins — flag the conflict.

## Build order

Follow this sequence. Do NOT jump ahead. After each step, run what you can run and verify it works before moving on.

### Step 1 — Skeleton & tooling
- Create the folder structure from SPEC.md.
- Write `requirements.txt`: fastapi, uvicorn[standard], sqlalchemy, pydantic.
- Write `Dockerfile` and `docker-compose.yml` per SPEC.md.
- Write a stub `app/main.py` with a `GET /api/health` returning `{"ok": true}`.
- Verify: `docker compose up` starts the app, `curl localhost:8000/api/health` returns ok.

### Step 2 — DB layer
- `app/db.py`: engine, SessionLocal, Base, `get_db()` dependency. Set WAL + foreign_keys pragmas via SQLAlchemy event listener.
- `app/models.py`: Ingredient, MenuItem, RecipeItem with relationships per SPEC.md.
- Create tables on startup with `Base.metadata.create_all()`.
- Verify: app starts, `data/lazzat.db` is created.

### Step 3 — Units & pricing (pure logic, with tests)
- `app/units.py` per SPEC.md.
- `app/pricing.py` per SPEC.md.
- `tests/test_pricing.py` covering the cases in SPEC.md's Testing section.
- Verify: `pytest -q` passes.

### Step 4 — Schemas & ingredient CRUD
- `app/schemas.py`: Pydantic models for ingredient input/output.
- `app/routers/ingredients.py`: GET/POST/PATCH/DELETE per SPEC.md.
- Wire router into `main.py`.
- Verify: full CRUD works via curl. Try to delete an ingredient that doesn't yet exist in any recipe — should succeed.

### Step 5 — Menu CRUD with cost calculation
- Add MenuItem/RecipeItem schemas.
- `app/routers/menu.py`: GET (list + detail), POST, PATCH, DELETE.
- Detail endpoint must compute and return total_cost, cost_per_portion, margin_pct, hits_target via `pricing.py`.
- Verify: create the Pilaf recipe via curl; GET /api/menu/1 returns cost ≈ 2875.

### Step 6 — Seeding
- `app/seed.py`: insert Pilaf + its 5 ingredients exactly per GOAL.md.
- Hook into startup: only run if `Ingredient` table is empty.
- Verify: `rm data/lazzat.db && docker compose up` recreates a working seeded DB.

### Step 7 — Frontend
- `app/static/index.html`: top tabs (Ingredients / Menu), Tailwind CDN, container divs.
- `app/static/app.js`: fetch helpers, render functions, form handlers.
- Mount at `/` in `main.py` via `StaticFiles`.
- Acceptance check (from SPEC.md):
  1. App live at http://localhost:8000
  2. Pilaf shows cost ≈ 2,875, margin ≈ 78%, green badge
  3. Edit lamb 20,000 -> 25,000 KRW/kg, refresh, Pilaf cost ≈ 3,375
  4. Try deleting an in-use ingredient -> clear error in UI

### Step 8 — README
Write a `README.md`: what it is, how to run (`docker compose up`), how to reset (`rm data/lazzat.db`), how to run tests, what's in scope vs out of scope (lift from GOAL.md non-goals).

## Working principles for this project
- **Match the spec, don't expand it.** If you find yourself wanting to add a feature, write it as a TODO in the README instead.
- **Test the math, not the framework.** Trust FastAPI and SQLAlchemy; test our pricing and unit conversion thoroughly.
- **Ship a working slice early.** It's better to have an end-to-end-working Pilaf flow on day one than half of every feature.
- **One commit per step above.** Makes it easy to roll back if something breaks.

## Things that will trip you up — read these
- SQLite needs `PRAGMA foreign_keys=ON` per connection. Do this in a SQLAlchemy event listener on `connect`. Without it, restrict-on-delete silently does nothing.
- SQLAlchemy 2.x relationship loading: configure `lazy="selectin"` or eagerly load `recipe_items` and their `ingredient` to avoid N+1 in the menu list endpoint.
- Tailwind CDN: don't use the `@apply` directive — it requires a build. Stick to utility classes inline.
- `display_unit` and `input_unit` must validate against the ingredient's `category`. Don't let "L" sneak in for a weight ingredient.
- Floating-point: when comparing costs in tests, use `pytest.approx` with a small tolerance.
- Don't expose the SQLAlchemy session outside dependency-injected routes. Keep `pricing.py` DB-free.

## When you finish
1. All tests green: `pytest -q`
2. `docker compose up --build` produces a working app
3. The four acceptance checks from SPEC.md all pass manually
4. README explains how to run, reset, and what's not yet built