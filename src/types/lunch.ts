export type LunchType = "store" | "food-truck";

export const LUNCH_TYPES = {
  STORE: "store" as const,
  FOOD_TRUCK: "food-truck" as const,
} as const;

export type FoodTruckData = {
  曜日: string;
  会場: string;
  店名: string;
  ジャンル: string;
  メニュー: string;
  営業時間: string;
};
