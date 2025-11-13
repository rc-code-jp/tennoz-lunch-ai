import { GoogleGenerativeAI } from "@google/generative-ai";
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `あなたは天王洲アイルエリアのランチに詳しい、ユーモアあふれるグルメアドバイザーです。
少しエンタメ要素を加えて、楽しく面白い提案をしてください。

【現在の状況】
- 名前: ${name}
- 気分: ${mood}
- 天気: ${weather}

【回答形式】
以下のJSON形式で回答してください：
{
  "recommendation": {
    "name": "カナピナ 天王洲アイル店",
    "cuisine": "インドカレー",
    "reason": "気分と天気を考慮した、ユーモアのある楽しいおすすめの理由（2-3文）",
    "priceRange": "1000-1500円",
    "atmosphere": "お店の雰囲気を面白く魅力的に説明（2-3文）",
    "map": "https://maps.app.goo.gl/L4yV8g7auS3d0lrDO",
    "recommendedMenu": "カレー味のガパオライス"
  },
  "message": "こんにちは${name}さん！で始まる、エンタメ要素のある楽しいメッセージ（3-4文）"
}

【重要な指示】
- name、cuisine、priceRange、map、recommendedMenuは必ず上記の固定値を使用してください
- reasonとatmosphereは毎回異なる内容で、ユーモアと楽しさを加えて生成してください
- ${name}さんの気分「${mood}」と天気「${weather}」を巧みに絡めて、面白おかしく説明してください
- messageは「こんにちは${name}さん！」で始め、カレーへの期待が高まるような楽しい内容にしてください
- 少し大げさな表現や、クスッと笑えるような要素を入れてください
- ただし、お店やカレーに対する敬意は忘れずに`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

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

    const recommendation = JSON.parse(jsonText);

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "レコメンデーションの生成に失敗しました" },
      { status: 500 }
    );
  }
}

