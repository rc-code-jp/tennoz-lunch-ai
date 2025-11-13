# 🍽️ 天王洲アイルランチAI

天王洲アイルでランチを食べる際に、自分の気分や天気をもとにAIがおすすめのランチを決めてくれるサイトです。

## 🌟 機能

- **気分選択**: 元気いっぱい、リラックス、疲れている、冒険したい、ヘルシー志向、がっつり食べたい
- **天気選択**: 晴れ、曇り、雨、暑い、寒い
- **AIレコメンデーション**: Gemini AIが気分と天気を考慮して最適なランチを3つ提案
- **詳細情報**: レストラン名、料理ジャンル、おすすめの理由、価格帯、雰囲気

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、Gemini API キーを設定してください：

```env
GEMINI_API_KEY=your_api_key_here
```

**Gemini API キーの取得方法:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. "Create API Key" をクリックしてAPIキーを生成
4. 生成されたAPIキーをコピーして `.env.local` に貼り付け

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **AI**: Google Gemini AI (gemini-1.5-flash)
- **リンター/フォーマッター**: Biome

## 📁 プロジェクト構造

```
tennoz-lunch-ai/
├── src/
│   └── app/
│       ├── api/
│       │   └── recommend/
│       │       └── route.ts          # Gemini APIを呼び出すAPI Route
│       ├── page.tsx                  # メインページ（UI）
│       ├── layout.tsx                # レイアウト設定
│       └── globals.css               # グローバルスタイル
├── .env.local                        # 環境変数（要作成）
├── package.json
└── README.md
```

## 🎨 使い方

1. **気分を選択**: 今日の気分に合ったボタンをクリック
2. **天気を選択**: 今日の天気に合ったボタンをクリック
3. **おすすめを取得**: 「おすすめを教えて！」ボタンをクリック
4. **結果を確認**: AIが提案する3つのランチオプションを確認

## 🏪 天王洲アイルの人気店

このアプリは以下のような天王洲アイルエリアの人気店を考慮してレコメンデーションを行います：

- T.Y.HARBOR
- SOHOLM
- Pizzeria Pino
- SLOW HOUSE
- その他多数

## 📝 スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクションビルドを作成
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - コードをチェック
- `npm run format` - コードをフォーマット

## 🔧 カスタマイズ

### 気分や天気の選択肢を変更

`src/app/page.tsx` の `moods` と `weathers` 配列を編集してください。

### プロンプトのカスタマイズ

`src/app/api/recommend/route.ts` の `prompt` 変数を編集して、AIの回答スタイルや考慮する要素を変更できます。

### AIモデルの変更

`src/app/api/recommend/route.ts` で使用するGeminiモデルを変更できます：

```typescript
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // より高性能なモデル
```

## ⚠️ 注意事項

- Gemini API キーは `.env.local` に保存し、Gitにコミットしないでください
- APIキーには使用制限があります。詳細は [Google AI Studio](https://aistudio.google.com/) を確認してください
- 本アプリは実在する店舗情報を保証するものではありません

## 📄 ライセンス

MIT

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

Powered by **Gemini AI** × **Next.js**
