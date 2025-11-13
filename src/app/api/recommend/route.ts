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

以下のJSON形式のみで回答してください:

{
  "recommendation": {
    "name": "カナピナ 天王洲アイル店",
    "cuisine": "インドカレー",
    "reason": "${name}さんの気分「${mood}」と天気「${weather}」を考慮した、ユーモアのある楽しいおすすめの理由を2-3文で書いてください",
    "priceRange": "1000-1500円",
    "atmosphere": "お店の雰囲気を面白く魅力的に2-3文で説明してください",
    "map": "https://maps.app.goo.gl/L4yV8g7auS3d0lrDO",
    "recommendedMenu": "カレー味のガパオライス"
  },
  "message": "こんにちは${name}さん！で始まる、カレーへの期待が高まる楽しいメッセージを3-4文で書いてください"
}

重要: 
- JSONのみを返してください
- name、cuisine、priceRange、map、recommendedMenuは変更しないでください
- reasonとatmosphereとmessageのみ、ユーモアを加えて生成してください`;

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

