# プロジェクト構造

## ディレクトリ構成

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # APIルート
│   │   │   └── recommend/     # レコメンデーションAPI
│   │   │       └── route.ts   # POST /api/recommend
│   │   ├── layout.tsx         # ルートレイアウト（メタデータ設定）
│   │   ├── page.tsx           # トップページ（メインUI）
│   │   ├── globals.css        # グローバルスタイル
│   │   └── favicon.ico
│   └── constants/
│       └── restaurants.ts     # レストランリスト定義
├── public/                     # 静的ファイル
├── .kiro/                      # Kiro設定・ステアリング
└── 設定ファイル群
```

## 主要ファイルの役割

### `src/app/page.tsx`
- メインのUIコンポーネント
- クライアントコンポーネント（"use client"）
- フォーム管理、Cookie管理、モーダル表示

### `src/app/api/recommend/route.ts`
- Gemini AIとの通信
- レストランのランダム選択
- Google Search Groundingの実行
- JSON形式のレスポンス生成

### `src/constants/restaurants.ts`
- 天王洲アイルエリアのレストランリスト
- 型定義（`TennozRestaurant`）
- `as const`で不変配列として定義

### `src/app/layout.tsx`
- メタデータ設定（OGP、Twitter Card）
- フォント設定（Geist Sans/Mono）
- 言語設定（ja）

## アーキテクチャパターン

### クライアント・サーバー分離
- UIロジック: クライアントコンポーネント
- AI処理: サーバーサイドAPI Route

### 状態管理
- React Hooksを使用（useState, useEffect, useCallback）
- Cookie経由での永続化（利用制限、結果保存）

### スタイリング
- Tailwind CSSのユーティリティクラス
- レスポンシブデザイン（`md:`ブレークポイント）
- カスタムアニメーション（`animate-fadeIn`, `animate-slideUpFade`）

## コーディング規約

### TypeScript
- 厳格モード有効（`strict: true`）
- 型推論を活用
- `type`を優先（`interface`より）

### React
- 関数コンポーネントのみ
- Hooksの依存配列を適切に管理
- アクセシビリティ対応（aria-label等）

### Biome設定
- インデント: スペース2つ
- 推奨ルール有効
- Next.js/React専用ルール適用
- `noDocumentCookie`は必要に応じて無効化（biome-ignore使用）
