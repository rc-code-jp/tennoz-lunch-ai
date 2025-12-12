import type { FoodTruckData } from "@/types/lunch";

/**
 * CSVファイルの内容を解析してFoodTruckData配列に変換する
 * @param csvContent - CSVファイルの文字列内容
 * @returns FoodTruckData配列
 */
export function parseFoodTruckCSV(csvContent: string): FoodTruckData[] {
  const lines = csvContent.trim().split("\n");

  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const values = line.split(",");
    return {
      曜日: values[0].trim(),
      会場: values[1].trim(),
      店名: values[2].trim(),
      ジャンル: values[3].trim(),
      メニュー: values[4].trim(),
      営業時間: values[5].trim(),
    };
  });
}

/**
 * 指定された曜日に営業しているキッチンカーのみを抽出する
 * @param trucks - FoodTruckData配列
 * @param dayOfWeek - 曜日（例: "月曜日", "火曜日"）
 * @returns フィルタリングされたFoodTruckData配列
 */
export function filterByDayOfWeek(
  trucks: FoodTruckData[],
  dayOfWeek: string,
): FoodTruckData[] {
  return trucks.filter((truck) => truck.曜日 === dayOfWeek);
}
