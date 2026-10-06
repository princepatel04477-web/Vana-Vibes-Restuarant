export const BEVERAGE_DESSERT_CATEGORIES = new Set([
  'hot-coffee',
  'iced-coffee',
  'non-coffee',
  'manual-brew',
  'shake',
  'frappe',
  'dessert',
]);

const BEVERAGE_KEYWORDS = [
  'coffee',
  'espresso',
  'latte',
  'cappuccino',
  'americano',
  'macchiato',
  'mocha',
  'cortado',
  'flat white',
  'affogato',
  'frappe',
  'shake',
  'brew',
  'tea',
  'mojito',
  'cooler',
  'soda',
  'drink',
  'beverage',
  'lassi',
  'butter milk',
  'chaas',
  'juice',
  'smoothie',
  'water',
  'sparkling',
  'brownie',
  'cheesecake',
  'croissant',
  'dessert',
  'cake',
  'pastry',
  'fondue',
  'waffle',
  'cookie',
];

export function isBeverageOrDessertItem(item: { name?: string; item_name?: string; category?: string }): boolean {
  if (item.category && BEVERAGE_DESSERT_CATEGORIES.has(item.category.toLowerCase().trim())) {
    return true;
  }
  const name = (item.name || item.item_name || '').toLowerCase();
  return BEVERAGE_KEYWORDS.some((kw) => name.includes(kw));
}

export function isFoodItem(item: { name?: string; item_name?: string; category?: string }): boolean {
  return !isBeverageOrDessertItem(item);
}
