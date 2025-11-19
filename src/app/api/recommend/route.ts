import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 天王洲アイルエリアのランチスポット
const TENNOZ_RESTAURANTS = [
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
  // "栄華楼 天王洲アイル店",
  "健康中華青蓮 天王洲スフィアタワー店",
  "栄華楼 天王洲アイル2号店",
  "朝霞刀削麺",
  "スパイス ラウンジ",
  "すぺっつぃえ 天王洲アイル店",
  "韓国料理潤ちゃん",
  "AROI～アロイ～ 天王洲アイル店",
  "カナピナ 天王洲アイル店",
  "サブウェイ 天王洲シーフォートスクエア店",
  "寿司酒場 スシイチ 天王洲アイル店",
  "てけてけ 天王洲アイル店"
];

// ランダムに配列から1つを選択
function getRandomRestaurant(restaurants: string[]): string {
  return restaurants[Math.floor(Math.random() * restaurants.length)];
}

export async function POST(request: NextRequest) {
  try {
    const { name, mood, weather } = await request.json();

    if (!name || !mood || !weather) {
      return NextResponse.json(
        { error: "名前、気分、天気の情報が必要です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API キーが設定されていません" },
        { status: 500 }
      );
    }

    const model = "gemini-2.5-flash";

    const ai = new GoogleGenAI({ apiKey });

    // ランダムにお店を選択
    const selectedRestaurant = getRandomRestaurant(TENNOZ_RESTAURANTS);

    const prompt = `あなたは天王洲アイルエリアのランチに詳しい、ユーモアあふれるグルメアドバイザーです。
以下のJSON形式で必ず回答してください。他のテキストは一切含めないでください。

ユーザー情報:
- 名前: ${name}
- 気分: ${mood}
- 天気: ${weather}

以下のお店「${selectedRestaurant}」を、ユーザーの気分「${mood}」と天気「${weather}」に合わせて、おすすめのランチとして提案してください。
お店の情報が必要な場合はGoogle Searchを活用して最新の情報を取得してください。

以下のJSON形式で回答してください:

{
  "recommendation": {
    "name": "${selectedRestaurant}",
    "cuisine": "料理のジャンル（例: イタリアン、和食、カレー、ラーメンなど）",
    "reason": "${name}さんの気分「${mood}」と天気「${weather}」を考慮した、ユーモアのある楽しいおすすめの理由を2-3文で書いてください",
    "priceRange": "価格帯（例: 1000-1500円）",
    "atmosphere": "お店の雰囲気を面白く魅力的に2-3文で説明してください",
    "map": "Google Mapsのリンク（https://www.google.com/maps/search/${selectedRestaurant}+天王洲アイル の形式）",
    "recommendedMenu": "おすすめのメニュー名"
  },
  "message": "こんにちは${name}さん！で始まる、${selectedRestaurant}のこのメニューへの期待が高まる楽しいメッセージを3-4文で書いてください"
}

重要: 
- JSONのみを返してください
- 提案するお店は「${selectedRestaurant}」です（他のお店は選ばないでください）
- ユーザーの気分「${mood}」と天気「${weather}」に最適なメニューを提案してください
- すべての項目をユーモアを交えて生成してください`;

    // AIリクエスト（Google Search Grounding を有効化）
    const response = await ai.models.generateContent({
      model,  
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 2048,
        // Google Search Grounding を有効化して最新のお店情報を取得
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });
    
    const text = response.text || "";

    console.log("AI Response:", text); // デバッグ用

    // JSONを抽出（マークダウンのコードブロックを除去）
    let jsonText = text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // コードブロックなしの場合も試す
      const plainJsonMatch = text.match(/\{[\s\S]*\}/);
      if (plainJsonMatch) {
        jsonText = plainJsonMatch[0];
      }
    }

    console.log("Extracted JSON:", jsonText); // デバッグ用

    // JSONが空の場合のチェック
    if (!jsonText || jsonText.trim() === "") {
      console.error("Empty JSON text");
      return NextResponse.json(
        { 
          error: "AIからの応答が不正です",
          details: "JSONが抽出できませんでした",
          rawResponse: text
        },
        { status: 500 }
      );
    }

    let recommendation: unknown;
    try {
      recommendation = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Failed to parse:", jsonText);
      return NextResponse.json(
        { 
          error: "AIからの応答をパースできませんでした",
          details: parseError instanceof Error ? parseError.message : "Unknown parse error",
          rawResponse: text,
          extractedJson: jsonText
        },
        { status: 500 }
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Error details:", error);
    
    // エラーの詳細を取得
    let errorMessage = "レコメンデーションの生成に失敗しました";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        hint: "APIキーが正しく設定されているか、Gemini APIが利用可能か確認してください"
      },
      { status: 500 }
    );
  }
}

