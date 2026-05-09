import { Router, json } from "express";
import type Database from "better-sqlite3";
import { toBase, validateUnit } from "./units";

// --- Pricing helpers ---
interface RecipeItemRow {
  quantity: number;
  input_unit: string;
  category: string;
  price_per_base_unit: number;
  ingredient_name: string;
  ingredient_id: number;
}

function getRecipeItems(db: Database.Database, menuItemId: number): RecipeItemRow[] {
  return db.prepare(`
    SELECT ri.quantity, ri.input_unit, i.category, i.price_per_base_unit, i.name as ingredient_name, i.id as ingredient_id
    FROM recipe_items ri JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.menu_item_id = ?
  `).all(menuItemId) as RecipeItemRow[];
}

function recipeTotalCost(items: RecipeItemRow[]): number {
  return items.reduce((sum, ri) => sum + toBase(ri.quantity, ri.input_unit, ri.category) * ri.price_per_base_unit, 0);
}

function priceToBase(priceInDisplayUnit: number, displayUnit: string, category: string): number {
  return priceInDisplayUnit / toBase(1, displayUnit, category);
}

function priceToDisplay(pricePerBaseUnit: number, displayUnit: string, category: string): number {
  return pricePerBaseUnit * toBase(1, displayUnit, category);
}

// --- Build router ---
export function createRouter(db: Database.Database): Router {
  const router = Router();
  router.use(json());

  // ===== INGREDIENTS =====
  router.get("/api/ingredients", (_req, res) => {
    const rows = db.prepare("SELECT * FROM ingredients ORDER BY name").all() as any[];
    res.json(rows.map(r => ({
      ...r,
      price_in_display_unit: priceToDisplay(r.price_per_base_unit, r.display_unit, r.category),
    })));
  });

  router.post("/api/ingredients", (req, res) => {
    const { name, category, display_unit, price_in_display_unit } = req.body;
    try {
      validateUnit(display_unit, category);
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
      return;
    }
    const price_per_base_unit = priceToBase(price_in_display_unit, display_unit, category);
    const result = db.prepare(
      "INSERT INTO ingredients (name, category, display_unit, price_per_base_unit, updated_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).run(name, category, display_unit, price_per_base_unit);
    const row = db.prepare("SELECT * FROM ingredients WHERE id = ?").get(result.lastInsertRowid) as any;
    res.status(201).json({ ...row, price_in_display_unit: priceToDisplay(row.price_per_base_unit, row.display_unit, row.category) });
  });

  router.patch("/api/ingredients/:id", (req, res) => {
    const row = db.prepare("SELECT * FROM ingredients WHERE id = ?").get(req.params.id) as any;
    if (!row) { res.status(404).json({ detail: "Ingredient not found" }); return; }

    const name = req.body.name ?? row.name;
    const category = req.body.category ?? row.category;
    const display_unit = req.body.display_unit ?? row.display_unit;

    if (req.body.display_unit) {
      try { validateUnit(display_unit, category); } catch (e: any) { res.status(400).json({ detail: e.message }); return; }
    }

    let price_per_base_unit = row.price_per_base_unit;
    if (req.body.price_in_display_unit != null) {
      price_per_base_unit = priceToBase(req.body.price_in_display_unit, display_unit, category);
    }

    db.prepare(
      "UPDATE ingredients SET name=?, category=?, display_unit=?, price_per_base_unit=?, updated_at=datetime('now') WHERE id=?"
    ).run(name, category, display_unit, price_per_base_unit, req.params.id);

    const updated = db.prepare("SELECT * FROM ingredients WHERE id = ?").get(req.params.id) as any;
    res.json({ ...updated, price_in_display_unit: priceToDisplay(updated.price_per_base_unit, updated.display_unit, updated.category) });
  });

  router.delete("/api/ingredients/:id", (req, res) => {
    const row = db.prepare("SELECT * FROM ingredients WHERE id = ?").get(req.params.id) as any;
    if (!row) { res.status(404).json({ detail: "Ingredient not found" }); return; }
    const used = db.prepare("SELECT COUNT(*) as c FROM recipe_items WHERE ingredient_id = ?").get(req.params.id) as any;
    if (used.c > 0) { res.status(409).json({ detail: `Cannot delete '${row.name}': used in ${used.c} recipe(s)` }); return; }
    db.prepare("DELETE FROM ingredients WHERE id = ?").run(req.params.id);
    res.status(204).send();
  });

  // ===== MENU =====
  function buildSummary(item: any) {
    const recipeItems = getRecipeItems(db, item.id);
    const totalCost = recipeTotalCost(recipeItems);
    const costPerPortion = item.portions > 0 ? totalCost / item.portions : 0;
    const marginPct = item.sell_price > 0 ? (item.sell_price - costPerPortion) / item.sell_price * 100 : null;
    const hitsTarget = item.target_margin_pct != null && marginPct != null ? marginPct >= item.target_margin_pct : null;
    return { ...item, total_cost: totalCost, cost_per_portion: costPerPortion, margin_pct: marginPct, hits_target: hitsTarget };
  }

  function buildDetail(item: any) {
    const recipeItems = getRecipeItems(db, item.id);
    const summary = buildSummary(item);
    summary.recipe = recipeItems.map(ri => ({
      ingredient: ri.ingredient_name,
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.input_unit,
      line_cost: toBase(ri.quantity, ri.input_unit, ri.category) * ri.price_per_base_unit,
    }));
    return summary;
  }

  router.get("/api/menu", (_req, res) => {
    const items = db.prepare("SELECT * FROM menu_items ORDER BY name").all();
    res.json(items.map(buildSummary));
  });

  router.get("/api/menu/:id", (req, res) => {
    const item = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
    if (!item) { res.status(404).json({ detail: "Menu item not found" }); return; }
    res.json(buildDetail(item));
  });

  router.post("/api/menu", (req, res) => {
    const { name, portions, sell_price, target_margin_pct, notes, recipe } = req.body;
    const insertMenu = db.prepare("INSERT INTO menu_items (name, portions, sell_price, target_margin_pct, notes) VALUES (?, ?, ?, ?, ?)");
    const insertRecipe = db.prepare("INSERT INTO recipe_items (menu_item_id, ingredient_id, quantity, input_unit) VALUES (?, ?, ?, ?)");

    const txn = db.transaction(() => {
      const result = insertMenu.run(name, portions, sell_price, target_margin_pct ?? null, notes ?? null);
      const menuItemId = result.lastInsertRowid;
      for (const ri of recipe || []) {
        const ing = db.prepare("SELECT category FROM ingredients WHERE id = ?").get(ri.ingredient_id) as any;
        if (!ing) throw new Error(`Ingredient ${ri.ingredient_id} not found`);
        validateUnit(ri.input_unit, ing.category);
        insertRecipe.run(menuItemId, ri.ingredient_id, ri.quantity, ri.input_unit);
      }
      return menuItemId;
    });

    try {
      const menuItemId = txn();
      const item = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(menuItemId);
      res.status(201).json(buildDetail(item));
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
    }
  });

  router.patch("/api/menu/:id", (req, res) => {
    const item = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id) as any;
    if (!item) { res.status(404).json({ detail: "Menu item not found" }); return; }

    const txn = db.transaction(() => {
      const name = req.body.name ?? item.name;
      const portions = req.body.portions ?? item.portions;
      const sell_price = req.body.sell_price ?? item.sell_price;
      const target_margin_pct = req.body.target_margin_pct !== undefined ? req.body.target_margin_pct : item.target_margin_pct;
      const notes = req.body.notes !== undefined ? req.body.notes : item.notes;

      db.prepare("UPDATE menu_items SET name=?, portions=?, sell_price=?, target_margin_pct=?, notes=? WHERE id=?")
        .run(name, portions, sell_price, target_margin_pct, notes, req.params.id);

      if (req.body.recipe != null) {
        db.prepare("DELETE FROM recipe_items WHERE menu_item_id = ?").run(req.params.id);
        const insertRecipe = db.prepare("INSERT INTO recipe_items (menu_item_id, ingredient_id, quantity, input_unit) VALUES (?, ?, ?, ?)");
        for (const ri of req.body.recipe) {
          const ing = db.prepare("SELECT category FROM ingredients WHERE id = ?").get(ri.ingredient_id) as any;
          if (!ing) throw new Error(`Ingredient ${ri.ingredient_id} not found`);
          validateUnit(ri.input_unit, ing.category);
          insertRecipe.run(req.params.id, ri.ingredient_id, ri.quantity, ri.input_unit);
        }
      }
    });

    try {
      txn();
      const updated = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
      res.json(buildDetail(updated));
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
    }
  });

  router.delete("/api/menu/:id", (req, res) => {
    const item = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
    if (!item) { res.status(404).json({ detail: "Menu item not found" }); return; }
    db.prepare("DELETE FROM menu_items WHERE id = ?").run(req.params.id);
    res.status(204).send();
  });

  // Health
  router.get("/api/health", (_req, res) => res.json({ ok: true }));

  return router;
}
