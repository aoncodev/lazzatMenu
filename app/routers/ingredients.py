from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ingredient
from app.schemas import IngredientCreate, IngredientUpdate, IngredientOut
from app.units import to_base, validate_unit

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])


def _price_to_base(price_in_display_unit: float, display_unit: str, category: str) -> float:
    """Convert e.g. 20000 KRW/kg to 20 KRW/g."""
    base_per_display = to_base(1, display_unit, category)
    return price_in_display_unit / base_per_display


def _price_to_display(price_per_base_unit: float, display_unit: str, category: str) -> float:
    base_per_display = to_base(1, display_unit, category)
    return price_per_base_unit * base_per_display


def _to_out(ing: Ingredient) -> IngredientOut:
    return IngredientOut(
        id=ing.id,
        name=ing.name,
        category=ing.category,
        display_unit=ing.display_unit,
        price_per_base_unit=ing.price_per_base_unit,
        price_in_display_unit=_price_to_display(ing.price_per_base_unit, ing.display_unit, ing.category),
        updated_at=ing.updated_at,
    )


@router.get("", response_model=list[IngredientOut])
def list_ingredients(db: Session = Depends(get_db)):
    return [_to_out(i) for i in db.query(Ingredient).order_by(Ingredient.name).all()]


@router.post("", response_model=IngredientOut, status_code=201)
def create_ingredient(body: IngredientCreate, db: Session = Depends(get_db)):
    validate_unit(body.display_unit, body.category)
    ing = Ingredient(
        name=body.name,
        category=body.category,
        display_unit=body.display_unit,
        price_per_base_unit=_price_to_base(body.price_in_display_unit, body.display_unit, body.category),
    )
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return _to_out(ing)


@router.patch("/{ingredient_id}", response_model=IngredientOut)
def update_ingredient(ingredient_id: int, body: IngredientUpdate, db: Session = Depends(get_db)):
    ing = db.get(Ingredient, ingredient_id)
    if not ing:
        raise HTTPException(404, "Ingredient not found")

    if body.name is not None:
        ing.name = body.name
    if body.category is not None:
        ing.category = body.category
    if body.display_unit is not None:
        validate_unit(body.display_unit, body.category or ing.category)
        ing.display_unit = body.display_unit

    if body.price_in_display_unit is not None:
        display_unit = body.display_unit or ing.display_unit
        category = body.category or ing.category
        ing.price_per_base_unit = _price_to_base(body.price_in_display_unit, display_unit, category)

    ing.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ing)
    return _to_out(ing)


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    ing = db.get(Ingredient, ingredient_id)
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    if ing.recipe_items:
        raise HTTPException(409, f"Cannot delete '{ing.name}': used in {len(ing.recipe_items)} recipe(s)")
    db.delete(ing)
    db.commit()
