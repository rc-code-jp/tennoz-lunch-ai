import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

    const model = "gemini-2.5-flash-lite";

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `あなたは天王洲アイルエリアのランチに詳しい、ユーモアあふれるグルメアドバイザーです。
以下のJSON形式で必ず回答してください。他のテキストは一切含めないでください。

ユーザー情報:
- 名前: ${name}
- 気分: ${mood}
- 天気: ${weather}

ユーザーの気分と天気に合った天王洲アイルエリアの実在するランチのお店を1つ選んで、以下のJSON形式で回答してください:

{
  "recommendation": {
    "name": "お店の名前（実在する天王洲アイルエリアのお店）",
    "cuisine": "料理のジャンル（例: イタリアン、和食、カレー、ラーメンなど）",
    "reason": "${name}さんの気分「${mood}」と天気「${weather}」を考慮した、ユーモアのある楽しいおすすめの理由を2-3文で書いてください",
    "priceRange": "価格帯（例: 1000-1500円）",
    "atmosphere": "お店の雰囲気を面白く魅力的に2-3文で説明してください",
    "map": "Google Mapsのリンク（https://www.google.com/maps/search/お店名+天王洲アイル の形式）",
    "recommendedMenu": "おすすめのメニュー名"
  },
  "message": "こんにちは${name}さん！で始まる、そのお店やメニューへの期待が高まる楽しいメッセージを3-4文で書いてください"
}

重要: 
- JSONのみを返してください
- 天王洲アイルエリアに実在するお店を選んでください
- ユーザーの気分と天気に最適なお店とメニューを提案してください
- すべての項目をユーモアを交えて生成してください`;

    // AIリクエスト
    const response = await ai.models.generateContent({
      model,  
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 2048,
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

