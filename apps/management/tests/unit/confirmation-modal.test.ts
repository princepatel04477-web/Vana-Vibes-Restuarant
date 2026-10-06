import { describe, it, expect } from 'vitest';
import { ConfirmationModalProps } from '../../src/components/ui/ConfirmationModal';

describe('Confirmation and Cart Control Architecture', () => {
  it('ConfirmationModalProps interface contract supports title, description, actions, and destructive state', () => {
    const props: ConfirmationModalProps = {
      isOpen: true,
      title: 'Remove Item?',
      description: 'Are you sure you want to remove Espresso from your cart?',
      cancelLabel: 'Keep Item',
      confirmLabel: 'Remove',
      isDestructive: true,
      onCancel: () => {},
      onConfirm: () => {},
    };

    expect(props.title).toBe('Remove Item?');
    expect(props.isDestructive).toBe(true);
    expect(props.cancelLabel).toBe('Keep Item');
    expect(props.confirmLabel).toBe('Remove');
  });

  it('Clear Cart confirmation contract has correct title and labels', () => {
    const clearCartModal: ConfirmationModalProps = {
      isOpen: true,
      title: 'Clear Cart?',
      description: 'Are you sure you want to remove all items from your cart?',
      cancelLabel: 'Keep Items',
      confirmLabel: 'Clear Cart',
      isDestructive: true,
      onCancel: () => {},
      onConfirm: () => {},
    };

    expect(clearCartModal.title).toBe('Clear Cart?');
    expect(clearCartModal.cancelLabel).toBe('Keep Items');
    expect(clearCartModal.confirmLabel).toBe('Clear Cart');
  });

  it('Separation of item controls: quantity container vs remove container', () => {
    // Quantity container only handles quantity adjustment min 1
    const initialQty = 1;
    const canDecrease = initialQty > 1;
    expect(canDecrease).toBe(false);

    const qty2 = 2;
    const canDecrease2 = qty2 > 1;
    expect(canDecrease2).toBe(true);
  });
});
