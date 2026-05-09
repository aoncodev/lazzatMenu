from app.db import SessionLocal
from app.models import Ingredient, MenuItem, RecipeItem


def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Ingredient).count() > 0:
            return

        ingredients = {
            "Lamb": Ingredient(name="Lamb", category="weight", price_per_base_unit=20.0, display_unit="kg"),
            "Carrot": Ingredient(name="Carrot", category="weight", price_per_base_unit=3.0, display_unit="kg"),
            "Rice": Ingredient(name="Rice", category="weight", price_per_base_unit=4.0, display_unit="kg"),
            "Onion": Ingredient(name="Onion", category="weight", price_per_base_unit=2.0, display_unit="kg"),
            "Oil": Ingredient(name="Oil", category="volume", price_per_base_unit=5.0, display_unit="L"),
        }
        for ing in ingredients.values():
            db.add(ing)
        db.flush()

        pilaf = MenuItem(
            name="Uzbek Pilaf",
            portions=20,
            sell_price=13000,
            target_margin_pct=70.0,
        )
        db.add(pilaf)
        db.flush()

        recipe = [
            RecipeItem(menu_item_id=pilaf.id, ingredient_id=ingredients["Lamb"].id, quantity=2, input_unit="kg"),
            RecipeItem(menu_item_id=pilaf.id, ingredient_id=ingredients["Carrot"].id, quantity=2, input_unit="kg"),
            RecipeItem(menu_item_id=pilaf.id, ingredient_id=ingredients["Rice"].id, quantity=2, input_unit="kg"),
            RecipeItem(menu_item_id=pilaf.id, ingredient_id=ingredients["Onion"].id, quantity=500, input_unit="g"),
            RecipeItem(menu_item_id=pilaf.id, ingredient_id=ingredients["Oil"].id, quantity=500, input_unit="ml"),
        ]
        for ri in recipe:
            db.add(ri)

        db.commit()
    finally:
        db.close()
