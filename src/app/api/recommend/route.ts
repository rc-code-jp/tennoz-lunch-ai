import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { TENNOZ_RESTAURANTS, TENNOZ_FOOD_TRUCKS, type LunchType } from "@/constants/restaurants";

// システム指示（AIの役割とレストラン知識を事前に定義）
const SYSTEM_INSTRUCTION = `あなたは天王洲アイルエリアのランチに詳しいグルメアドバイザーです。
ユーモアを交えて回答してください。

## 天王洲アイルエリアのレストラン一覧:
${TENNOZ_RESTAURANTS.map((r) => `- ${r}`).join("\n")}

## 回答ルール:
- JSON形式のみで回答（他のテキスト不可）
- 文字数制限を厳守
- お店の最新情報はGoogle Searchで取得`;

// ランダムに配列から1つを選択
function getRandomRestaurant(restaurants: readonly string[]): string {
  return restaurants[Math.floor(Math.random() * restaurants.length)];
}

export async function POST(request: NextRequest) {
  try {
    const { name, mood, weather, lunchType } = await request.json();

    if (!name || !mood || !weather) {
      return NextResponse.json(
        { error: "名前、気分、天気の情報が必要です" },
        { status: 400 }
      );
    }

    // lunchTypeのバリデーション
    if (lunchType !== "store" && lunchType !== "food-truck") {
      return NextResponse.json(
        { error: "ランチタイプは'store'または'food-truck'である必要があります" },
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

    // lunchTypeに基づいてレストランリストを選択
    const restaurantList = lunchType === "store" ? TENNOZ_RESTAURANTS : TENNOZ_FOOD_TRUCKS;
    
    // ランダムにお店を選択
    const selectedRestaurant = getRandomRestaurant(restaurantList);

    // ユーザー固有の情報のみをプロンプトに（シンプル化）
    const prompt = `${selectedRestaurant}をおすすめして。
ユーザー: ${name} / 気分: ${mood} / 天気: ${weather}

出力形式:
{"recommendation":{"name":"${selectedRestaurant}","cuisine":"ジャンル","reason":"90文字以内","atmosphere":"50文字以内","recommendedMenu":"メニュー名"},"message":"こんにちは${name}さん！50文字以内"}`;

    // AIリクエスト（System Instruction + Google Search Grounding）
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 2048,
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
      
      // mapのURLとlunchTypeをサーバー側で追加
      if (recommendation && typeof recommendation === 'object' && 'recommendation' in recommendation) {
        const rec = recommendation as { recommendation: { map?: string; lunchType?: LunchType } };
        rec.recommendation.map = `https://www.google.com/maps/search/${encodeURIComponent(selectedRestaurant)}+天王洲アイル`;
        rec.recommendation.lunchType = lunchType;
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

