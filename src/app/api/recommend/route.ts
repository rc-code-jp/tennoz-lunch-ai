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
    "map": "https://www.google.com/maps/place/%E3%82%AB%E3%83%8A%E3%83%94%E3%83%8A+%E5%A4%A9%E7%8E%8B%E6%B4%B2%E3%82%A2%E3%82%A4%E3%83%AB%E5%BA%97+Khanapina+Tennozu+Isle/@35.624156,139.750682,17z/data=!3m1!4b1!4m6!3m5!1s0x60188a6a97d018c5:0x2a58845a920399b!8m2!3d35.624156!4d139.750682!16s%2Fg%2F1td4k2y5?entry=tts&g_ep=EgoyMDI1MTExMS4wIPu8ASoASAFQAw%3D%3D&skid=6c1cd6d8-ab4c-4f68-80ef-876cab7e667a",
    "recommendedMenu": "キーマカレー"
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

