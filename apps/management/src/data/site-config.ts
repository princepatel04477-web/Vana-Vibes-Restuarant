import { getCustomerFrontendBaseUrl } from '@/lib/qr-url';

const parsedCuisines = process.env.NEXT_PUBLIC_CAFE_CUISINES
  ? process.env.NEXT_PUBLIC_CAFE_CUISINES.split(',').map((c) => c.trim()).filter(Boolean)
  : [];

const morningHours = process.env.NEXT_PUBLIC_CAFE_MORNING_HOURS || '';
const breakHours = process.env.NEXT_PUBLIC_CAFE_BREAK_HOURS || '';
const eveningHours = process.env.NEXT_PUBLIC_CAFE_EVENING_HOURS || '';
const defaultHoursSummary = [morningHours, eveningHours].filter(Boolean).join(', ');
const cafeHours = process.env.NEXT_PUBLIC_CAFE_HOURS || defaultHoursSummary;

export const SiteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || '',
  hindiName: process.env.NEXT_PUBLIC_CAFE_HINDI_NAME || '',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || '',
  title: process.env.NEXT_PUBLIC_APP_TITLE || process.env.NEXT_PUBLIC_APP_NAME || '',
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || '',
  get url(): string {
    return getCustomerFrontendBaseUrl();
  },
  address: process.env.NEXT_PUBLIC_CAFE_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_CAFE_PHONE || '',
  gstin: process.env.NEXT_PUBLIC_CAFE_GSTIN || '',
  email: {
    contact: process.env.NEXT_PUBLIC_CAFE_EMAIL || '',
    orders: process.env.NEXT_PUBLIC_CAFE_ORDERS_EMAIL || '',
  },
  operatingHours: cafeHours,
  openingHours: cafeHours,
  schedule: {
    morning: morningHours,
    break: breakHours,
    evening: eveningHours,
    display: [
      morningHours ? `Morning: ${morningHours}` : '',
      breakHours ? `Break: ${breakHours}` : '',
      eveningHours ? `Evening: ${eveningHours}` : '',
    ]
      .filter(Boolean)
      .join(' • '),
  },
  cuisine: parsedCuisines,
};
