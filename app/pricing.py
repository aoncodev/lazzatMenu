from app.units import to_base


def recipe_total_cost(menu_item) -> float:
    return sum(
        to_base(ri.quantity, ri.input_unit, ri.ingredient.category)
        * ri.ingredient.price_per_base_unit
        for ri in menu_item.recipe_items
    )


def cost_per_portion(menu_item) -> float:
    return recipe_total_cost(menu_item) / menu_item.portions


def margin_pct(menu_item) -> float | None:
    if not menu_item.sell_price:
        return None
    cost = cost_per_portion(menu_item)
    return (menu_item.sell_price - cost) / menu_item.sell_price * 100


def hits_target(menu_item) -> bool | None:
    if menu_item.target_margin_pct is None:
        return None
    m = margin_pct(menu_item)
    if m is None:
        return None
    return m >= menu_item.target_margin_pct
