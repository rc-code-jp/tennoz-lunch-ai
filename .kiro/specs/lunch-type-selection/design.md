# 設計書

## 概要

天王洲アイルランチAIアプリケーションに、ランチタイプ（店舗またはキッチンカー）の選択機能を追加します。この機能により、ユーザーは固定店舗での食事か、キッチンカーでの食事かを選択でき、選択に応じた適切な推薦を受けられるようになります。

キッチンカーの情報はCSVファイル（`src/assets/FOOD_TRUCK.csv`）から読み込まれ、リクエストされた曜日に基づいてフィルタリングされます。店舗とキッチンカーでは異なるプロンプト生成ロジックを使用し、キッチンカーの場合はGoogle Search Groundingを使用せず、CSVに記載された情報のみを使用します。

既存のアーキテクチャ（Next.js App Router、React 19、TypeScript、Tailwind CSS）を維持しながら、最小限の変更で機能を追加します。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────┐
│         クライアント (page.tsx)          │
│  ┌─────────────────────────────────┐   │
│  │  ランチタイプ選択UI              │   │
│  │  - 店舗 / キッチンカー           │   │
│  │  - デフォルト: 店舗              │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  フォーム送信                    │   │
│  │  { name, mood, weather,         │   │
│  │    lunchType, dayOfWeek }       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ POST /api/recommend
┌─────────────────────────────────────────┐
│      API Route (route.ts)               │
│  ┌─────────────────────────────────┐   │
│  │  リクエスト処理                  │   │
│  │  - lunchType パラメータ受信      │   │
│  │  - dayOfWeek パラメータ受信      │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  データソース選択                │   │
│  │  if (lunchType === 'store')     │   │
│  │    → TENNOZ_RESTAURANTS         │   │
│  │  else                           │   │
│  │    → CSV読み込み + 曜日フィルタ  │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  プロンプト生成                  │   │
│  │  - 店舗: buildStorePrompt()     │   │
│  │  - キッチンカー:                 │   │
│  │    buildFoodTruckPrompt()       │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  Gemini AI 推薦生成              │   │
│  │  - 店舗: Google Search ON       │   │
│  │  - キッチンカー: Search OFF     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ JSON Response
┌─────────────────────────────────────────┐
│         クライアント (page.tsx)          │
│  ┌─────────────────────────────────┐   │
│  │  推薦結果表示                    │   │
│  │  - レストラン情報                │   │
│  │  - ランチタイプ表示              │   │
│  │  - キッチンカー: マップなし      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### データフロー

1. **ユーザー入力**: 名前、気分、天気、ランチタイプ（デフォルト: 店舗）
2. **クライアント検証**: 必須項目の確認
3. **曜日取得**: クライアントで現在の曜日を取得（日本語形式: "月曜日"）
4. **API送信**: POST /api/recommend with { name, mood, weather, lunchType, dayOfWeek }
5. **サーバー処理**:
   - lunchType に基づいてデータソースを選択
     - 店舗: TENNOZ_RESTAURANTS定数
     - キッチンカー: CSVファイル読み込み → 曜日フィルタリング
   - フィルタリング後のリストからランダムに1つを選択
   - ランチタイプに応じたプロンプト生成関数を呼び出し
   - Gemini AI で推薦メッセージを生成（店舗のみGoogle Search有効）
6. **レスポンス**: 推薦情報 + ランチタイプ（キッチンカーの場合はmap=""）
7. **結果表示**: モーダルで表示、Cookie に保存

## コンポーネントとインターフェース

### 型定義

#### LunchType型

```typescript
// src/types/lunch.ts (新規作成)
export type LunchType = 'store' | 'food-truck';

export const LUNCH_TYPES = {
  STORE: 'store' as const,
  FOOD_TRUCK: 'food-truck' as const,
} as const;
```

#### 拡張されたRecommendation型

```typescript
// src/app/page.tsx
type Recommendation = {
  name: string;
  cuisine: string;
  reason: string;
  atmosphere: string;
  map: string;
  recommendedMenu: string;
  lunchType: LunchType; // 追加
};
```

#### APIリクエスト型

```typescript
// src/app/api/recommend/route.ts
type RecommendRequest = {
  name: string;
  mood: string;
  weather: string;
  lunchType: LunchType;
  dayOfWeek: string; // 追加: "月曜日", "火曜日", etc.
};
```

#### キッチンカーデータ型

```typescript
// src/types/lunch.ts
export type FoodTruckData = {
  曜日: string;
  会場: string;
  店名: string;
  ジャンル: string;
  メニュー: string;
  営業時間: string;
};
```

### UIコンポーネント

#### ランチタイプ選択UI

既存の気分選択・天気選択と同じパターンを使用：

```typescript
const lunchTypes = [
  { 
    value: 'store' as const, 
    label: '店舗',
    emoji: '🏪', 
    color: 'bg-green-100 hover:bg-green-200' 
  },
  { 
    value: 'food-truck' as const, 
    label: 'キッチンカー',
    emoji: '🚚', 
    color: 'bg-orange-100 hover:bg-orange-200' 
  },
];
```

レンダリング:

```tsx
<fieldset>
  <legend className="block text-xl font-semibold text-gray-800 mb-4">
    ランチのタイプは？
  </legend>
  <div className="grid grid-cols-2 gap-3">
    {lunchTypes.map((type) => (
      <button
        key={type.value}
        type="button"
        onClick={() => setLunchType(type.value)}
        className={`p-4 rounded-xl border-2 transition-all ${
          lunchType === type.value
            ? "border-blue-500 bg-blue-50 scale-105"
            : "border-gray-200 hover:border-gray-300"
        } ${type.color}`}
      >
        <div className="text-3xl mb-2">{type.emoji}</div>
        <div className="text-sm font-medium text-gray-800">
          {type.label}
        </div>
      </button>
    ))}
  </div>
</fieldset>
```

### APIエンドポイント

#### POST /api/recommend

**リクエスト（店舗）:**

```json
{
  "name": "太郎",
  "mood": "元気いっぱい",
  "weather": "晴れ",
  "lunchType": "store",
  "dayOfWeek": "月曜日"
}
```

**レスポンス（店舗）:**

```json
{
  "recommendation": {
    "name": "breadworks TENNOZ",
    "cuisine": "ベーカリーカフェ",
    "reason": "...",
    "atmosphere": "...",
    "map": "https://www.google.com/maps/search/...",
    "recommendedMenu": "...",
    "lunchType": "store"
  },
  "message": "こんにちは太郎さん！..."
}
```

**リクエスト（キッチンカー）:**

```json
{
  "name": "花子",
  "mood": "リラックス",
  "weather": "曇り",
  "lunchType": "food-truck",
  "dayOfWeek": "月曜日"
}
```

**レスポンス（キッチンカー）:**

```json
{
  "recommendation": {
    "name": "とらじゅ",
    "cuisine": "和食（あなごめし）",
    "reason": "...",
    "atmosphere": "天王洲オーシャンスクエアで営業中",
    "map": "https://www.google.com/maps/search/天王洲オーシャンスクエア",
    "recommendedMenu": "あなごめし 小盛",
    "lunchType": "food-truck",
    "venue": "天王洲オーシャンスクエア",
    "hours": "11:30-14:00"
  },
  "message": "こんにちは花子さん！..."
}
```

## データモデル

### レストランデータ

#### 店舗リスト

```typescript
// src/constants/restaurants.ts
export const TENNOZ_RESTAURANTS = [
  "breadworks TENNOZ",
  "T.Y. HARBOR",
  // ... 既存の店舗リスト
] as const;

export type TennozRestaurant = (typeof TENNOZ_RESTAURANTS)[number];
```

#### キッチンカーデータ（CSV）

キッチンカーの情報は`src/assets/FOOD_TRUCK.csv`に格納されます：

```csv
曜日,会場,店名,ジャンル,メニュー,営業時間
月曜日,天王洲オーシャンスクエア,とらじゅ,和食（あなごめし）,あなごめし 小盛,11:30-14:00
月曜日,天王洲オーシャンスクエア,kitchen car.halu,唐揚げ（弁当・丼）,豚丼,11:30-14:00
...
```

CSVパーサー関数:

```typescript
// src/utils/csvParser.ts (新規作成)
import { FoodTruckData } from '@/types/lunch';

export function parseFoodTruckCSV(csvContent: string): FoodTruckData[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      曜日: values[0],
      会場: values[1],
      店名: values[2],
      ジャンル: values[3],
      メニュー: values[4],
      営業時間: values[5],
    };
  });
}

export function filterByDayOfWeek(
  trucks: FoodTruckData[],
  dayOfWeek: string
): FoodTruckData[] {
  return trucks.filter(truck => truck.曜日 === dayOfWeek);
}
```

### プロンプト生成

店舗とキッチンカーで異なるプロンプト生成ロジックを使用します。

```typescript
// src/utils/promptBuilder.ts (新規作成)

export function buildStorePrompt(
  selectedRestaurant: string,
  name: string,
  mood: string,
  weather: string
): string {
  return `${selectedRestaurant}をおすすめして。
ユーザー: ${name} / 気分: ${mood} / 天気: ${weather}

出力形式:
{"recommendation":{"name":"${selectedRestaurant}","cuisine":"ジャンル","reason":"90文字以内","atmosphere":"50文字以内","recommendedMenu":"メニュー名"},"message":"こんにちは${name}さん！50文字以内"}`;
}

export function buildFoodTruckPrompt(
  truckData: FoodTruckData,
  name: string,
  mood: string,
  weather: string
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
```

### Cookie保存データ

既存のCookie構造を拡張：

```typescript
// 保存される結果
type SavedResult = {
  recommendation: {
    name: string;
    cuisine: string;
    reason: string;
    atmosphere: string;
    map: string;
    recommendedMenu: string;
    lunchType: LunchType;
    venue?: string; // キッチンカーのみ
    hours?: string; // キッチンカーのみ
  };
  message: string;
};
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティリフレクション

プレワーク分析から、以下の冗長性を特定しました：

- **1.4と1.5**: 両方とも選択状態の保持をテストしており、1つのプロパティに統合可能
- **2.1、2.2、2.3**: すべてランチタイプに基づく正しいリスト選択をテストしており、1つの包括的なプロパティに統合可能
- **5.3、5.4、5.5**: すべてCookieの往復でのlunchType保持をテストしており、1つのラウンドトリッププロパティに統合可能
- **6.2、6.3、6.4**: すべてリセット後の状態をテストしており、1つの包括的なプロパティに統合可能
- **7.2と7.3**: 両方とも曜日フィルタリングの正確性をテストしており、統合可能
- **8.2と8.3**: Google Search設定の有効/無効をテストしており、1つのプロパティに統合可能
- **9.1と9.2**: 両方ともマップリンクの生成をテストしており、1つのプロパティに統合可能
- **9.3と9.4**: UI表示ロジックをテストしており、統合可能

### 正確性プロパティ

#### プロパティ1: ランチタイプ選択の状態保持

*任意の*ランチタイプ値（'store'または'food-truck'）について、ユーザーがその値を選択した後、状態はその選択を反映しなければならない

**検証: 要件 1.4, 1.5**

#### プロパティ2: ランチタイプに基づくレストラン選択

*任意の*ランチタイプについて、システムが推薦を生成するとき、選択されたレストランは対応するリスト（店舗リストまたはキッチンカーリスト）に含まれていなければならない

**検証: 要件 2.1, 2.2, 2.3**

#### プロパティ3: APIリクエストにランチタイプを含む

*任意の*推薦リクエストについて、APIに送信されるリクエストボディにはlunchTypeフィールドが含まれていなければならない

**検証: 要件 2.4**

#### プロパティ4: APIレスポンスのランチタイプ一致

*任意の*推薦リクエストについて、APIレスポンスに含まれるlunchTypeはリクエストで送信されたlunchTypeと一致しなければならない

**検証: 要件 2.5**

#### プロパティ5: 無効なランチタイプの拒否

*任意の*'store'と'food-truck'以外の値について、システムはそれを無効なランチタイプとして拒否しなければならない

**検証: 要件 3.6**

#### プロパティ6: 選択状態の視覚的フィードバック

*任意の*選択されたランチタイプについて、対応するUI要素には選択状態を示すCSSクラス（border-blue-500、bg-blue-50、scale-105）が適用されていなければならない

**検証: 要件 1.3, 4.3**

#### プロパティ7: 推薦結果にランチタイプを含む

*任意の*推薦結果について、結果オブジェクトにはlunchTypeフィールドが含まれていなければならない

**検証: 要件 5.1**

#### プロパティ8: Cookieラウンドトリップでのランチタイプ保持

*任意の*推薦結果について、Cookieに保存してから読み込んだ後、lunchType値は元の値と同じでなければならない

**検証: 要件 5.3, 5.4, 5.5**

#### プロパティ9: リセット後の初期状態復元

*任意の*フォーム状態について、リセット操作を実行した後、すべてのフィールド（名前、気分、天気、ランチタイプ）は初期状態（空文字列またはデフォルト値）に戻り、推薦結果とエラーメッセージはクリアされなければならない

**検証: 要件 6.2, 6.3, 6.4**

#### プロパティ10: リセットボタンの条件付き表示

*任意の*フォーム状態について、少なくとも1つのフィールドに値がある場合、またはresultが存在する場合にのみ、リセットボタンが表示されなければならない

**検証: 要件 6.5**

#### プロパティ11: キッチンカーリクエストに曜日を含む

*任意の*キッチンカーの推薦リクエストについて、APIに送信されるリクエストボディにはdayOfWeekフィールドが含まれていなければならない

**検証: 要件 7.1**

#### プロパティ12: 曜日フィルタリングの正確性

*任意の*曜日とキッチンカーデータについて、フィルタリング後のリストに含まれるすべてのキッチンカーは指定された曜日に営業していなければならない

**検証: 要件 7.2, 7.3**

#### プロパティ13: フィルタリング済みリストからの選択

*任意の*キッチンカー推薦について、選択されたキッチンカーはフィルタリング済みリストに含まれていなければならない

**検証: 要件 7.5**

#### プロパティ14: ランチタイプに基づくプロンプト生成関数の選択

*任意の*ランチタイプについて、システムは対応するプロンプト生成関数（店舗: buildStorePrompt、キッチンカー: buildFoodTruckPrompt）を使用しなければならない

**検証: 要件 8.1**

#### プロパティ15: Google Search Groundingの条件付き有効化

*任意の*推薦リクエストについて、店舗の場合はGoogle Search Groundingが有効であり、キッチンカーの場合は無効でなければならない

**検証: 要件 8.2, 8.3**

#### プロパティ16: キッチンカープロンプトの完全性

*任意の*キッチンカーデータについて、生成されたプロンプトにはジャンル、メニュー、営業時間、会場のすべての情報が含まれていなければならない

**検証: 要件 8.4**

#### プロパティ17: すべての推薦結果にマップリンクを含む

*任意の*推薦結果について、店舗の場合は店舗名に基づいたGoogle Mapsの検索URL、キッチンカーの場合は会場名に基づいたGoogle Mapsの検索URLがmapフィールドに含まれていなければならない

**検証: 要件 9.1, 9.2**

#### プロパティ18: マップリンクの適切なURLエンコーディング

*任意の*推薦結果について、mapフィールドに含まれるURLは適切にエンコードされた有効なGoogle Maps検索URLでなければならない

**検証: 要件 9.5**

#### プロパティ19: ランチタイプに応じた適切な情報表示

*任意の*推薦結果について、マップリンクがクリック可能なリンクとして表示され、キッチンカーの場合は会場情報も併せて表示されなければならない

**検証: 要件 9.3, 9.4**

## エラーハンドリング

### クライアントサイド

1. **必須項目の検証**
   - 名前、気分、天気、ランチタイプがすべて入力されているか確認
   - 未入力の場合は送信ボタンを無効化

2. **ランチタイプの型チェック**
   - TypeScriptの型システムで'store'または'food-truck'のみを許可
   - 実行時の型ガードで不正な値を防止

3. **Cookie操作のエラー**
   - Cookie読み込み時のJSON parse エラーをキャッチ
   - エラー時はコンソールにログを出力し、nullを返す

### サーバーサイド

1. **リクエストバリデーション**
   - lunchTypeが'store'または'food-truck'であることを確認
   - 不正な値の場合は400エラーを返す

```typescript
if (lunchType !== 'store' && lunchType !== 'food-truck') {
  return NextResponse.json(
    { error: "ランチタイプは'store'または'food-truck'である必要があります" },
    { status: 400 }
  );
}
```

2. **レストランリストの存在確認**
   - 選択されたランチタイプに対応するリストが空でないことを確認
   - 空の場合は500エラーを返す

3. **Gemini APIエラー**
   - 既存のエラーハンドリングを維持
   - タイムアウト、パースエラー、API制限などに対応

## テスト戦略

### ユニットテスト

このプロジェクトでは、コア機能の動作を検証するために最小限のユニットテストを実装します。

#### クライアントサイド（page.tsx）

1. **ランチタイプ選択UIのレンダリング**
   - 2つの選択肢（店舗、キッチンカー）が表示されることを確認
   - デフォルトで「店舗」が選択されていることを確認
   - **検証: 要件 1.1, 1.2**

2. **リセット機能**
   - リセットボタンクリック後、ランチタイプが「店舗」に戻ることを確認
   - **検証: 要件 6.1**

3. **モーダル表示**
   - 推薦結果にランチタイプが表示されることを確認
   - **検証: 要件 5.2**

#### サーバーサイド（route.ts）

1. **レストラン選択ロジック**
   - lunchType='store'の場合、TENNOZ_RESTAURANTSから選択されることを確認
   - lunchType='food-truck'の場合、TENNOZ_FOOD_TRUCKSから選択されることを確認

2. **バリデーション**
   - 無効なlunchType値で400エラーが返されることを確認
   - **検証: 要件 3.5**

### プロパティベーステスト

プロパティベーステストは、設計書で定義された正確性プロパティを検証するために使用します。

#### テストライブラリ

- **fast-check**: JavaScriptのプロパティベーステストライブラリ
- 各テストは最低100回の反復を実行

#### テスト対象プロパティ

各プロパティベーステストは、対応する正確性プロパティを実装します：

1. **プロパティ1のテスト**: ランチタイプ選択の状態保持
   - ジェネレータ: `fc.constantFrom('store', 'food-truck')`
   - 検証: 選択後の状態が選択値と一致

2. **プロパティ2のテスト**: ランチタイプに基づくレストラン選択
   - ジェネレータ: `fc.constantFrom('store', 'food-truck')`
   - 検証: 選択されたレストランが対応するリストに含まれる

3. **プロパティ4のテスト**: APIレスポンスのランチタイプ一致
   - ジェネレータ: ランダムなリクエストデータ
   - 検証: レスポンスのlunchTypeがリクエストと一致

4. **プロパティ8のテスト**: Cookieラウンドトリップでのランチタイプ保持
   - ジェネレータ: ランダムな推薦結果
   - 検証: 保存→読み込み後のlunchTypeが元の値と同じ

5. **プロパティ9のテスト**: リセット後の初期状態復元
   - ジェネレータ: ランダムなフォーム状態
   - 検証: リセット後すべてのフィールドが初期状態

#### テストタグ形式

各プロパティベーステストには、以下の形式でコメントタグを付けます：

```typescript
// **Feature: lunch-type-selection, Property 2: ランチタイプに基づくレストラン選択**
```

### 統合テスト

エンドツーエンドの動作を検証するための統合テストは、オプションとして実装可能です：

1. **完全なユーザーフロー**
   - ランチタイプ選択 → フォーム送信 → 推薦表示
   - Cookie保存 → ページリロード → 結果復元

2. **API統合**
   - クライアントからAPIへのリクエスト
   - Gemini APIとの統合

## 実装の詳細

### フェーズ1: データ層の拡張

1. LunchType型の定義（既存）
2. FoodTruckData型の定義（新規）
3. CSVパーサーユーティリティの作成（`src/utils/csvParser.ts`）
4. 曜日フィルタリング関数の実装

### フェーズ2: プロンプト生成の分離

1. プロンプトビルダーユーティリティの作成（`src/utils/promptBuilder.ts`）
2. 店舗用プロンプト生成関数の実装
3. キッチンカー用プロンプト生成関数の実装

### フェーズ3: APIの更新

1. リクエスト型にdayOfWeekを追加
2. CSVファイル読み込みロジックの追加
3. 曜日フィルタリングの実装
4. プロンプト生成関数の呼び出し分岐
5. Google Search Groundingの条件付き有効化
6. レスポンスにキッチンカー固有フィールドを追加
7. エラーハンドリング（空のフィルタリング結果）

### フェーズ4: UIの更新

1. 曜日取得ロジックの追加（クライアント側）
2. フォーム送信時にdayOfWeekを含める
3. 推薦結果表示の条件分岐（マップリンク vs 会場情報）
4. Cookie保存/読み込みの更新（venue, hoursフィールド）

### フェーズ5: テストの実装

1. CSVパーサーのユニットテスト
2. 曜日フィルタリングのユニットテスト
3. プロンプト生成関数のユニットテスト
4. プロパティベーステストの作成
5. テストの実行と検証

## パフォーマンス考慮事項

- **最小限の変更**: 既存のコードへの影響を最小限に抑える
- **型安全性**: TypeScriptの型システムを活用してランタイムエラーを防止
- **Cookie サイズ**: lunchTypeフィールドの追加によるCookieサイズの増加は無視できる程度（約10バイト）
- **レンダリング**: 新しいUI要素は既存のパターンを使用し、パフォーマンスへの影響なし

## セキュリティ考慮事項

- **入力検証**: サーバーサイドでlunchTypeの値を厳密に検証
- **型安全性**: TypeScriptの型システムで不正な値を防止
- **Cookie**: 既存のSameSite=Strict設定を維持
- **XSS対策**: Reactの自動エスケープを活用

## 今後の拡張性

- **新しいランチタイプの追加**: 型定義とリストを追加するだけで対応可能
- **フィルタリング**: 複数のランチタイプを同時に選択する機能
- **お気に入り**: ユーザーが好みのランチタイプを保存する機能
- **統計**: ランチタイプごとの利用統計を収集
