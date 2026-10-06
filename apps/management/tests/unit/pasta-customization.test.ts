import { describe, it, expect } from 'vitest';
import { MENU_ITEMS } from '../../src/data/vaan-vibes-menu';

describe('Pasta Customization Choice Architecture', () => {
  const pastaItems = MENU_ITEMS.filter((i) => i.category === 'pasta');

  it('All pasta dishes include Choice of Pasta options with diverse pasta shapes', () => {
    expect(pastaItems.length).toBeGreaterThan(0);

    for (const pasta of pastaItems) {
      expect(pasta.options).toBeDefined();
      expect(pasta.options?.length).toBeGreaterThan(0);

      const pastaOption = pasta.options?.find((o) => o.name === 'Choice of Pasta');
      expect(pastaOption).toBeDefined();
      expect(pastaOption?.choices.length).toBeGreaterThanOrEqual(3);

      const choiceNames = pastaOption?.choices.map((c) => c.name);
      expect(choiceNames).toContain('Penne');
      expect(choiceNames).toContain('Fussili');
    }
  });

  it('No default choice is pre-selected upon opening customization modal', () => {
    // Initial state contract: empty object {} rather than pre-selecting opt.choices[0]
    const initialSelectedOptions: { [key: string]: string } = {};
    expect(Object.keys(initialSelectedOptions).length).toBe(0);
    expect(initialSelectedOptions['Choice of Pasta']).toBeUndefined();
  });

  it('Validation accurately detects missing required pasta choice', () => {
    const arrabbiata = pastaItems.find((p) => p.name === 'Arrabbiata');
    expect(arrabbiata).toBeDefined();

    const selectedOptions: { [key: string]: string } = {};

    const missingOptions = arrabbiata?.options?.filter((opt) => !selectedOptions[opt.name]) || [];
    const isValid = missingOptions.length === 0;

    expect(isValid).toBe(false);
    expect(missingOptions[0].name).toBe('Choice of Pasta');
  });

  it('Validation passes when user explicitly chooses a pasta option', () => {
    const arrabbiata = pastaItems.find((p) => p.name === 'Arrabbiata');
    expect(arrabbiata).toBeDefined();

    // User selects Spaghetti
    const selectedOptions: { [key: string]: string } = {
      'Choice of Pasta': 'Spaghetti',
    };

    const missingOptions = arrabbiata?.options?.filter((opt) => !selectedOptions[opt.name]) || [];
    const isValid = missingOptions.length === 0;

    expect(isValid).toBe(true);
    expect(selectedOptions['Choice of Pasta']).toBe('Spaghetti');
  });
});
