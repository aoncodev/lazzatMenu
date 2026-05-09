const WEIGHT_TO_GRAMS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME_TO_ML: Record<string, number> = { ml: 1, L: 1000, l: 1000 };
const COUNT_UNITS = new Set(["piece", "pcs", "ea"]);

const CATEGORY_UNITS: Record<string, Set<string>> = {
  weight: new Set(Object.keys(WEIGHT_TO_GRAMS)),
  volume: new Set(Object.keys(VOLUME_TO_ML)),
  count: COUNT_UNITS,
};

export function toBase(quantity: number, unit: string, category: string): number {
  if (category === "weight") return quantity * (WEIGHT_TO_GRAMS[unit] ?? 1);
  if (category === "volume") return quantity * (VOLUME_TO_ML[unit] ?? 1);
  if (category === "count") return quantity;
  throw new Error(`unknown category ${category}`);
}

export function validateUnit(unit: string, category: string): void {
  const allowed = CATEGORY_UNITS[category];
  if (!allowed) throw new Error(`unknown category ${category}`);
  if (!allowed.has(unit)) throw new Error(`unit '${unit}' not valid for category '${category}'`);
}
