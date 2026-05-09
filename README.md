# Lazzat Menu Calculator

A recipe cost calculator for Lazzat, an Uzbek restaurant. Enter ingredient prices once, define recipes, and instantly see cost per portion, margin %, and whether each dish hits its target margin. When an ingredient price changes, every dish using it recalculates automatically.

## Quick Start

```bash
docker compose up --build
```

Open http://localhost:8000

The app seeds itself with a sample Pilaf recipe on first run.

## Reset Database

```bash
rm data/lazzat.db
docker compose up
```

## Run Tests

```bash
pip install -r requirements.txt pytest
pytest -q
```

## What's In Scope (MVP)

- Ingredient CRUD with price in KRW
- Menu item CRUD with recipes (ingredient + quantity + unit)
- Auto-calculated: total batch cost, cost per portion, margin %, target margin check
- Seeded Pilaf example (lamb, carrot, rice, onion, oil)
- Single-page UI with Ingredients and Menu tabs

## Not Yet Built

- Multi-user accounts / auth
- POS integration / inventory deduction
- Supplier management / purchase orders
- Price history graphs
- Multi-currency (KRW only)
- Deployment beyond localhost
