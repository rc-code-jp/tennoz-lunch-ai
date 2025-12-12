export type LunchType = 'store' | 'food-truck';

export const LUNCH_TYPES = {
  STORE: 'store' as const,
  FOOD_TRUCK: 'food-truck' as const,
} as const;
