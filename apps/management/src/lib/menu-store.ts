/**
 * The live menu: the built-in rate card (`vaan-vibes-menu.ts`) plus every dish and category an
 * admin has added, edited or removed. Admin changes are saved through the store repo, so they
 * survive restarts and every server instance (QR ordering, billing, add-items) sees the same menu.
 */
import { MenuCategory, MenuItem } from '@/types/cafe';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { MenuEntry, MenuEntryKind, withRead, withWrite } from './db/repo';
// Registers the default tables used for first-run seeding before this module touches the store.
import './cafe-store';

export class MenuError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'MenuError';
  }
}

function applyEntries<T extends { id: string }>(base: T[], entries: MenuEntry[], kind: MenuEntryKind): T[] {
  const changes = new Map<string, T | null>();
  for (const e of entries) {
    if (e.kind === kind) changes.set(e.id, e.data as T | null);
  }
  const result: T[] = [];
  for (const item of base) {
    if (!changes.has(item.id)) result.push(item);
    else if (changes.get(item.id)) result.push(changes.get(item.id)!);
  }
  const baseIds = new Set(base.map((b) => b.id));
  for (const [id, data] of changes) {
    if (!baseIds.has(id) && data) result.push(data);
  }
  return result;
}

/** The built-in menu with the saved admin changes applied. */
export function buildMenu(entries: MenuEntry[]) {
  return {
    items: applyEntries<MenuItem>(MENU_ITEMS, entries, 'item'),
    categories: applyEntries<MenuCategory>(MENU_CATEGORIES, entries, 'category'),
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base || 'item';
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Checks and normalizes the editable fields of a dish; throws a 422 MenuError listing bad fields. */
function validateItemFields(input: Partial<MenuItem>, categories: MenuCategory[]) {
  const fieldErrors: Record<string, string> = {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) fieldErrors.name = 'Dish name is required.';
  const category = typeof input.category === 'string' ? input.category : '';
  if (!categories.some((c) => c.slug === category && c.slug !== 'all')) {
    fieldErrors.category = 'Please select a valid category.';
  }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 1) fieldErrors.price = 'Price must be a valid number greater than 0.';
  if (Object.keys(fieldErrors).length > 0) {
    throw new MenuError(Object.values(fieldErrors)[0], 422, fieldErrors);
  }
  return { name, category, price: Math.round(price * 100) / 100 };
}

export const MenuStore = {
  async getMenu(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }> {
    return withRead(async (repo) => buildMenu(await repo.listMenuEntries()));
  },

  async getItems(): Promise<MenuItem[]> {
    return (await this.getMenu()).items;
  },

  async getCategories(): Promise<MenuCategory[]> {
    return (await this.getMenu()).categories;
  },

  async createItem(input: Partial<MenuItem>): Promise<MenuItem> {
    return withWrite(async (repo) => {
      const { items, categories } = buildMenu(await repo.listMenuEntries());
      const { name, category, price } = validateItemFields(input, categories);
      if (items.some((i) => sameName(i.name, name))) {
        throw new MenuError(`"${name}" is already on the menu.`, 422, { name: `"${name}" is already on the menu.` });
      }
      const item: MenuItem = {
        id: uniqueId(slugify(name), new Set(items.map((i) => i.id))),
        name,
        category,
        price,
        description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : undefined,
        isVeg: input.isVeg !== false,
        popular: Boolean(input.popular),
        isAvailable: input.isAvailable !== false,
      };
      await repo.saveMenuEntry({ kind: 'item', id: item.id, data: item });
      return item;
    });
  },

  async updateItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    return withWrite(async (repo) => {
      const { items, categories } = buildMenu(await repo.listMenuEntries());
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new MenuError('Dish not found', 404);
      const merged = { ...existing, ...updates, id: existing.id };
      const { name, category, price } = validateItemFields(merged, categories);
      if (items.some((i) => i.id !== id && sameName(i.name, name))) {
        throw new MenuError(`"${name}" is already on the menu.`, 422, { name: `"${name}" is already on the menu.` });
      }
      const item: MenuItem = {
        ...existing,
        name,
        category,
        price,
        description: typeof merged.description === 'string' && merged.description.trim() ? merged.description.trim() : undefined,
        isVeg: merged.isVeg !== false,
        popular: Boolean(merged.popular),
        isAvailable: merged.isAvailable !== false,
      };
      await repo.saveMenuEntry({ kind: 'item', id, data: item });
      return item;
    });
  },

  async setAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    return withWrite(async (repo) => {
      const { items } = buildMenu(await repo.listMenuEntries());
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new MenuError('Dish not found', 404);
      const item = { ...existing, isAvailable };
      await repo.saveMenuEntry({ kind: 'item', id, data: item });
      return item;
    });
  },

  async deleteItem(id: string): Promise<void> {
    return withWrite(async (repo) => {
      const { items } = buildMenu(await repo.listMenuEntries());
      if (!items.some((i) => i.id === id)) throw new MenuError('Dish not found', 404);
      await repo.saveMenuEntry({ kind: 'item', id, data: null });
    });
  },

  async createCategory(input: Partial<MenuCategory>): Promise<MenuCategory> {
    return withWrite(async (repo) => {
      const { categories } = buildMenu(await repo.listMenuEntries());
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (!name) throw new MenuError('Category name cannot be empty.');
      const slug = slugify(typeof input.slug === 'string' && input.slug ? input.slug : name);
      if (!slug || categories.some((c) => sameName(c.name, name) || c.slug === slug || c.id === slug)) {
        throw new MenuError(`Category "${name}" already exists.`, 409);
      }
      const category: MenuCategory = {
        id: slug,
        name,
        slug,
        icon: typeof input.icon === 'string' && input.icon ? input.icon : '🍽️',
        page: Number.isFinite(Number(input.page)) ? Number(input.page) : 2,
      };
      await repo.saveMenuEntry({ kind: 'category', id: category.id, data: category });
      return category;
    });
  },

  async deleteCategory(id: string): Promise<void> {
    return withWrite(async (repo) => {
      const { items, categories } = buildMenu(await repo.listMenuEntries());
      const category = categories.find((c) => c.id === id || c.slug === id);
      if (!category || category.slug === 'all') throw new MenuError('Category not found', 404);
      const dishCount = items.filter((i) => i.category === category.slug).length;
      if (dishCount > 0) {
        throw new MenuError(
          `"${category.name}" still has ${dishCount} dish${dishCount === 1 ? '' : 'es'}. Move or delete them first.`,
          409
        );
      }
      await repo.saveMenuEntry({ kind: 'category', id: category.id, data: null });
    });
  },
};
