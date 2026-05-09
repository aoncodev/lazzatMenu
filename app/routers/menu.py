from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import MenuItem, RecipeItem, Ingredient
from app.schemas import (
    MenuItemCreate, MenuItemUpdate, MenuItemSummary, MenuItemDetail, RecipeItemOut,
)
from app.pricing import recipe_total_cost, cost_per_portion, margin_pct, hits_target
from app.units import to_base, validate_unit

router = APIRouter(prefix="/api/menu", tags=["menu"])


def _summary(item: MenuItem) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "portions": item.portions,
        "sell_price": item.sell_price,
        "target_margin_pct": item.target_margin_pct,
        "total_cost": recipe_total_cost(item),
        "cost_per_portion": cost_per_portion(item),
        "margin_pct": margin_pct(item),
        "hits_target": hits_target(item),
    }


def _detail(item: MenuItem) -> dict:
    d = _summary(item)
    d["notes"] = item.notes
    d["recipe"] = [
        RecipeItemOut(
            ingredient=ri.ingredient.name,
            ingredient_id=ri.ingredient.id,
            quantity=ri.quantity,
            unit=ri.input_unit,
            line_cost=to_base(ri.quantity, ri.input_unit, ri.ingredient.category) * ri.ingredient.price_per_base_unit,
        )
        for ri in item.recipe_items
    ]
    return d


def _validate_and_create_recipe(db: Session, menu_item_id: int, recipe_items: list) -> None:
    for ri in recipe_items:
        ing = db.get(Ingredient, ri.ingredient_id)
        if not ing:
            raise HTTPException(400, f"Ingredient {ri.ingredient_id} not found")
        validate_unit(ri.input_unit, ing.category)
        db.add(RecipeItem(
            menu_item_id=menu_item_id,
            ingredient_id=ri.ingredient_id,
            quantity=ri.quantity,
            input_unit=ri.input_unit,
        ))


@router.get("", response_model=list[MenuItemSummary])
def list_menu(db: Session = Depends(get_db)):
    items = db.query(MenuItem).order_by(MenuItem.name).all()
    return [_summary(i) for i in items]


@router.get("/{item_id}", response_model=MenuItemDetail)
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    return _detail(item)


@router.post("", response_model=MenuItemDetail, status_code=201)
def create_menu_item(body: MenuItemCreate, db: Session = Depends(get_db)):
    item = MenuItem(
        name=body.name,
        portions=body.portions,
        sell_price=body.sell_price,
        target_margin_pct=body.target_margin_pct,
        notes=body.notes,
    )
    db.add(item)
    db.flush()
    _validate_and_create_recipe(db, item.id, body.recipe)
    db.commit()
    db.refresh(item)
    return _detail(item)


@router.patch("/{item_id}", response_model=MenuItemDetail)
def update_menu_item(item_id: int, body: MenuItemUpdate, db: Session = Depends(get_db)):
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")

    if body.name is not None:
        item.name = body.name
    if body.portions is not None:
        item.portions = body.portions
    if body.sell_price is not None:
        item.sell_price = body.sell_price
    if body.target_margin_pct is not None:
        item.target_margin_pct = body.target_margin_pct
    if body.notes is not None:
        item.notes = body.notes

    if body.recipe is not None:
        for ri in item.recipe_items:
            db.delete(ri)
        db.flush()
        _validate_and_create_recipe(db, item.id, body.recipe)

    db.commit()
    db.refresh(item)
    return _detail(item)


@router.delete("/{item_id}", status_code=204)
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    db.delete(item)
    db.commit()
