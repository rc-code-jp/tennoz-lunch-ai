import type { FoodTruckData } from "@/types/lunch";

/**
 * 店舗用のプロンプトを生成する
 * Google Search Groundingと組み合わせて使用される
 */
export function buildStorePrompt(
  selectedRestaurant: string,
  name: string,
  mood: string,
  weather: string,
): string {
  return `${selectedRestaurant}をおすすめして。
ユーザー: ${name} / 気分: ${mood} / 天気: ${weather}

出力形式:
{"recommendation":{"name":"${selectedRestaurant}","cuisine":"ジャンル","reason":"90文字以内","atmosphere":"50文字以内","recommendedMenu":"メニュー名"},"message":"こんにちは${name}さん！50文字以内"}`;
}

/**
 * キッチンカー用のプロンプトを生成する
 * CSVから取得した詳細情報を含める
 * Google Search Groundingは使用しない
 */
export function buildFoodTruckPrompt(
  truckData: FoodTruckData,
  name: string,
  mood: string,
  weather: string,
): string {
  return `${truckData.店名}をおすすめして。
ユーザー: ${name} / 気分: ${mood} / 天気: ${weather}

キッチンカー情報:
- 店名: ${truckData.店名}
- ジャンル: ${truckData.ジャンル}
- おすすめメニュー: ${truckData.メニュー}
- 会場: ${truckData.会場}
- 営業時間: ${truckData.営業時間}

出力形式:
{"recommendation":{"name":"${truckData.店名}","cuisine":"${truckData.ジャンル}","reason":"90文字以内","atmosphere":"${truckData.会場}で営業中","recommendedMenu":"${truckData.メニュー}","venue":"${truckData.会場}","hours":"${truckData.営業時間}"},"message":"こんにちは${name}さん！50文字以内"}`;
}
