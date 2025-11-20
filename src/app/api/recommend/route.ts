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
  // "栄華楼 天王洲アイル2号店",
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

    const prompt = `JSON形式のみ回答。文字数厳守。

${selectedRestaurant}のランチ情報
ユーザー: ${name} / 気分: ${mood} / 天気: ${weather}

{
  "recommendation": {
    "name": "${selectedRestaurant}",
    "cuisine": "ジャンル",
    "reason": "${name}さんの${mood}な気分と${weather}の天気に合う理由を90文字以内",
    "atmosphere": "雰囲気50文字以内",
    "recommendedMenu": "メニュー名"
  },
  "message": "こんにちは${name}さん！50文字以内"
}`;

    // AIリクエスト（Google Search Grounding を有効化）
    const response = await ai.models.generateContent({
      model,  
      contents: prompt,
      config: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 2048, // Google Search結果を含むため1024に設定
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });
    
    const text = response.text || "";

    console.log("AI Response:", text); // デバッグ用
    console.log("Finish Reason:", response.candidates?.[0]?.finishReason); // デバッグ用

    // レスポンスが途中で切れていないかチェック
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.error("Response truncated due to max tokens limit");
      return NextResponse.json(
        { 
          error: "AIの応答が長すぎて途中で切れました",
          details: "もう一度お試しください",
          finishReason: finishReason
        },
        { status: 500 }
      );
    }

    // JSONを抽出（マークダウンのコードブロックを除去）
    let jsonText = text.trim();
    
    // ```json と ``` を除去（複数パターンに対応）
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '');
    
    // 最初の { から最後の } までを抽出
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
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
      
      // mapのURLをサーバー側で追加（AIに生成させる必要なし）
      if (recommendation && typeof recommendation === 'object' && 'recommendation' in recommendation) {
        const rec = recommendation as { recommendation: { map?: string } };
        rec.recommendation.map = `https://www.google.com/maps/search/${encodeURIComponent(selectedRestaurant)}+天王洲アイル`;
      }
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

