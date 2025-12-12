# 設計書

## 概要

天王洲アイルランチAIアプリケーションに、ランチタイプ（店舗またはキッチンカー）の選択機能を追加します。この機能により、ユーザーは固定店舗での食事か、キッチンカーでの食事かを選択でき、選択に応じた適切な推薦を受けられるようになります。

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
│  │    lunchType }                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ POST /api/recommend
┌─────────────────────────────────────────┐
│      API Route (route.ts)               │
│  ┌─────────────────────────────────┐   │
│  │  リクエスト処理                  │   │
│  │  - lunchType パラメータ受信      │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  レストラン選択ロジック          │   │
│  │  if (lunchType === 'store')     │   │
│  │    → TENNOZ_RESTAURANTS         │   │
│  │  else                           │   │
│  │    → TENNOZ_FOOD_TRUCKS         │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  Gemini AI 推薦生成              │   │
│  │  + Google Search Grounding      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ JSON Response
┌─────────────────────────────────────────┐
│         クライアント (page.tsx)          │
│  ┌─────────────────────────────────┐   │
│  │  推薦結果表示                    │   │
│  │  - レストラン情報                │   │
│  │  - ランチタイプ表示              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### データフロー

1. **ユーザー入力**: 名前、気分、天気、ランチタイプ（デフォルト: 店舗）
2. **クライアント検証**: 必須項目の確認
3. **API送信**: POST /api/recommend with { name, mood, weather, lunchType }
4. **サーバー処理**:
   - lunchType に基づいてレストランリストを選択
   - ランダムに1店舗を選択
   - Gemini AI で推薦メッセージを生成
5. **レスポンス**: 推薦情報 + ランチタイプ
6. **結果表示**: モーダルで表示、Cookie に保存

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
  lunchType: LunchType; // 追加
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

**リクエスト:**

```json
{
  "name": "太郎",
  "mood": "元気いっぱい",
  "weather": "晴れ",
  "lunchType": "store"
}
```

**レスポンス:**

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

#### キッチンカーリスト（新規）

```typescript
// src/constants/restaurants.ts
export const TENNOZ_FOOD_TRUCKS = [
  "天王洲キッチンカー A",
  "天王洲キッチンカー B",
  "天王洲キッチンカー C",
  // ... キッチンカーリスト
] as const;

export type TennozFoodTruck = (typeof TENNOZ_FOOD_TRUCKS)[number];

// 統合型
export type TennozLunchSpot = TennozRestaurant | TennozFoodTruck;
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
    lunchType: LunchType; // 追加
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

**検証: 要件 3.5**

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

1. キッチンカーリストの定義（`src/constants/restaurants.ts`）
2. LunchType型の定義（新規ファイル）

### フェーズ2: APIの更新

1. リクエスト型にlunchTypeを追加
2. レストラン選択ロジックの更新
3. バリデーションの追加
4. レスポンスにlunchTypeを含める

### フェーズ3: UIの更新

1. ランチタイプ選択UIの追加
2. 状態管理（useState）の追加
3. フォーム送信時にlunchTypeを含める
4. 推薦結果表示にlunchTypeを追加
5. Cookie保存/読み込みの更新
6. リセット機能の更新

### フェーズ4: テストの実装

1. ユニットテストの作成
2. プロパティベーステストの作成
3. テストの実行と検証

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
