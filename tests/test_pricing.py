from types import SimpleNamespace
from pytest import approx
from app.units import to_base
from app.pricing import recipe_total_cost, cost_per_portion, margin_pct, hits_target


def _ingredient(name, category, price_per_base_unit):
    return SimpleNamespace(name=name, category=category, price_per_base_unit=price_per_base_unit)


def _recipe_item(ingredient, quantity, input_unit):
    return SimpleNamespace(ingredient=ingredient, quantity=quantity, input_unit=input_unit)


def _pilaf():
    lamb = _ingredient("Lamb", "weight", 20.0)       # 20 KRW/g = 20,000 KRW/kg
    carrot = _ingredient("Carrot", "weight", 3.0)
    rice = _ingredient("Rice", "weight", 4.0)
    onion = _ingredient("Onion", "weight", 2.0)
    oil = _ingredient("Oil", "volume", 5.0)           # 5 KRW/ml = 5,000 KRW/L

    return SimpleNamespace(
        name="Uzbek Pilaf",
        portions=20,
        sell_price=13000,
        target_margin_pct=70.0,
        recipe_items=[
            _recipe_item(lamb, 2, "kg"),
            _recipe_item(carrot, 2, "kg"),
            _recipe_item(rice, 2, "kg"),
            _recipe_item(onion, 500, "g"),
            _recipe_item(oil, 500, "ml"),
        ],
    )


def test_pilaf_cost_per_portion():
    pilaf = _pilaf()
    assert cost_per_portion(pilaf) == approx(2875, abs=1)


def test_pilaf_total_cost():
    pilaf = _pilaf()
    assert recipe_total_cost(pilaf) == approx(57500, abs=1)


def test_pilaf_margin():
    pilaf = _pilaf()
    assert margin_pct(pilaf) == approx(77.88, abs=0.1)


def test_pilaf_hits_target():
    pilaf = _pilaf()
    assert hits_target(pilaf) is True


def test_doubling_lamb_doubles_contribution():
    pilaf = _pilaf()
    original = recipe_total_cost(pilaf)
    lamb_contribution = 2 * 1000 * 20.0  # 2kg * 1000g/kg * 20 KRW/g = 40000
    pilaf.recipe_items[0].ingredient.price_per_base_unit = 40.0
    new_total = recipe_total_cost(pilaf)
    assert new_total == approx(original + lamb_contribution, abs=1)


def test_unit_conversion_weight():
    assert to_base(2, "kg", "weight") == 2000
    assert to_base(500, "g", "weight") == 500


def test_unit_conversion_volume():
    assert to_base(0.5, "L", "volume") == 500
    assert to_base(500, "ml", "volume") == 500
