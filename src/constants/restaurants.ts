// 天王洲アイルエリアの店舗
export const TENNOZ_RESTAURANTS = [
  "breadworks TENNOZ",
  "T.Y. HARBOR",
  "炭火×薪火×レストラン RIDE 品川 天王洲",
  "PIZZA SALVATORE CUOMO 天王洲",
  "常喜房",
  "個室と旬菜魚 銘酒 味喜庵（みきあん）",
  "かっぽうぎ 天王洲",
  "凪 天王洲アイル",
  "おでんと日本酒 みつぼし",
  "天厨菜館 天王洲アイル店",
  "健康中華青蓮 天王洲スフィアタワー店",
  "朝霞刀削麺",
  "スパイス ラウンジ",
  "すぺっつぃえ 天王洲アイル店",
  "韓国料理潤ちゃん",
  "AROI～アロイ～ 天王洲アイル店",
  "カナピナ 天王洲アイル店",
  "サブウェイ 天王洲シーフォートスクエア店",
  "寿司酒場 スシイチ 天王洲アイル店",
  "てけてけ 天王洲アイル店",
] as const;

export type TennozRestaurant = (typeof TENNOZ_RESTAURANTS)[number];
