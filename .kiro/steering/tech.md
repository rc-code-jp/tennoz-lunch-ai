# 技術スタック

## フレームワーク・ライブラリ

- **Next.js 16** - React フレームワーク（App Router使用）
- **React 19** - UIライブラリ
- **TypeScript 5** - 型安全な開発
- **Tailwind CSS 4** - ユーティリティファーストCSS
- **@google/genai** - Gemini AI SDK

## 開発ツール

- **Biome** - リンター・フォーマッター（ESLint/Prettierの代替）
- **Node.js** - ランタイム（.nvmrcで管理）

## 主要な依存関係

```json
{
  "@google/genai": "^1.31.0",
  "next": "16.0.7",
  "react": "19.2.1"
}
```

## よく使うコマンド

### 開発サーバー起動
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### 本番サーバー起動
```bash
npm start
```

### リント・フォーマット
```bash
npm run lint      # コードチェック
npm run format    # コード整形
```

## 環境変数

`.env.local`ファイルに以下を設定：

```
GEMINI_API_KEY=your_api_key_here
```

参考: `example.env`

## ビルドシステム

- Next.jsの標準ビルドシステムを使用
- Vercelへのデプロイに最適化（`vercel.json`設定あり）
- TypeScriptコンパイラ設定: `tsconfig.json`
- パスエイリアス: `@/*` → `./src/*`
