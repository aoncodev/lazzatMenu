# GOAL.md — Lazzat Menu Calculator

## Why this exists
Lazzat is an Uzbek restaurant. Ingredient prices in Korea (lamb, rice, oil, vegetables) shift week to week. When they shift, food cost per dish shifts, and our margins quietly erode unless we recalculate every recipe by hand. Nobody does that, so we lose money without knowing.

This app fixes that. We enter ingredient prices once. We enter each menu item's recipe once. From then on, when an ingredient price changes, every dish that uses it updates automatically — cost per portion, margin %, and whether the current sell price still hits our target margin.

## What success looks like
A cook or owner opens the app on a laptop or phone (it runs locally in Docker), and within 10 seconds can answer:

- "What does one portion of Pilaf cost us right now?"
- "If lamb goes from 20,000 to 25,000 KRW/kg, what happens to my Pilaf margin?"
- "Which dishes are below our target margin this week?"

## Concrete first milestone (MVP)
Seed the database with the Pilaf recipe from the brief:
- Ingredients: lamb (20,000 KRW/kg), carrot (3,000 KRW/kg), rice (4,000 KRW/kg), onion (2,000 KRW/kg), oil (5,000 KRW/L)
- Recipe: 2 kg lamb + 2 kg carrot + 2 kg rice + 500 g onion + 500 ml oil → 20 portions
- Sell price: 13,000 KRW/portion
- Expected output: cost/portion ≈ 2,875 KRW, margin ≈ 78%

If that displays correctly and updating any ingredient price recalculates everything, the MVP is done.

## Non-goals (for now)
- No multi-user accounts, no auth — local app
- No POS integration, no inventory deduction on orders
- No supplier management, no purchase orders
- No price history graphs (maybe later)
- No multi-currency — KRW only
- No deployment beyond `docker compose up` on localhost

## Who uses it
One or two people: the owner and maybe the head cook. Korean and/or Russian/Uzbek speakers — keep UI labels simple English, no jargon.