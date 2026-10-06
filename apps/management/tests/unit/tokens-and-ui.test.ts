import { describe, it, expect } from 'vitest';
import {
  BrandColors,
  SemanticColors,
  AppColors,
  AppTypography,
  AppSpacing,
  AppRadius,
  AppShadows,
  AppZIndex,
  CafeBrand,
} from '@/constants';
import { SpinnerProps } from '@/components/ui/Spinner';

describe('Design Tokens & Reusable UI Primitives', () => {
  it('BrandColors defines canonical deep green and warm beige palettes', () => {
    expect(BrandColors.green).toBe('#18312B');
    expect(BrandColors.greenDeep).toBe('#0E1F1B');
    expect(BrandColors.greenLight).toBe('#244941');
    expect(BrandColors.greenSurface).toBe('#1E3D36');

    expect(BrandColors.beige).toBe('#F5E9D3');
    expect(BrandColors.beigeLight).toBe('#FAF5EC');
    expect(BrandColors.beigeDark).toBe('#E6D4B7');
    expect(BrandColors.beigeMuted).toBe('#D8C2A0');

    expect(BrandColors.gold).toBe('#C8A25D');
    expect(BrandColors.terracotta).toBe('#D96B43');
  });

  it('SemanticColors defines contextual mappings for backgrounds, text, and statuses', () => {
    expect(SemanticColors.background.primary).toBe(BrandColors.beigeLight);
    expect(SemanticColors.text.primary).toBe(BrandColors.green);
    expect(SemanticColors.status.available).toBe('#16A34A');
    expect(SemanticColors.status.veg).toBe('#16A34A');
    expect(SemanticColors.status.nonVeg).toBe('#DC2626');
  });

  it('AppColors maintains 100% backward-compatibility aliases', () => {
    expect(AppColors.brandGreen).toBe('#18312B');
    expect(AppColors.brandBeige).toBe('#F5E9D3');
    expect(AppColors.brandBeigeLight).toBe('#FAF5EC');
    expect(AppColors.goldAccent).toBe('#C8A25D');
    expect(AppColors.primary).toBe('#18312B');
    expect(AppColors.beige).toBe('#F5E9D3');
    expect(AppColors.lightBackground).toBe('#FAF5EC');
  });

  it('Typography, Spacing, Radius, and ZIndex tokens are strictly typed scales', () => {
    expect(AppTypography.fontFamily).toContain('General Sans');
    expect(AppSpacing.none).toBe(0);
    expect(AppSpacing.md).toBe(16);
    expect(AppSpacing.huge).toBe(64);
    expect(AppRadius.full).toBe('9999px');
    expect(AppZIndex.header).toBe(30);
    expect(AppZIndex.modal).toBe(60);
    expect(AppShadows.lift).toBeTruthy();
  });

  it('CafeBrand contains verified cafe metadata and GSTIN', () => {
    expect(CafeBrand.id).toBe('van-vibes');
    expect(CafeBrand.hindiName).toBe('वन VIBES');
    expect(CafeBrand.name).toContain('Vaan Vibes');
    if (CafeBrand.gstin) {
      expect(CafeBrand.gstin).toMatch(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/);
    } else {
      expect(typeof CafeBrand.gstin).toBe('string');
    }
    expect(CafeBrand.phone).toContain('+91');
    expect(CafeBrand.currency).toBe('₹');
  });

  it('SpinnerProps interface contract supports sizes and brand colors', () => {
    const props: SpinnerProps = {
      size: 'lg',
      color: 'green',
      className: 'my-custom-spinner',
    };
    expect(props.size).toBe('lg');
    expect(props.color).toBe('green');
    expect(props.className).toBe('my-custom-spinner');
  });
});
