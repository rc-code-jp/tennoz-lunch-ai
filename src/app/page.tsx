"use client";

import { useState, useEffect, useCallback } from "react";

type Recommendation = {
  name: string;
  cuisine: string;
  reason: string;
  priceRange: string;
  atmosphere: string;
  map: string;
  recommendedMenu: string;
};

type RecommendationResponse = {
  recommendation: Recommendation;
  message: string;
};

export default function Home() {
  const [name, setName] = useState("");
  const [mood, setMood] = useState("");
  const [weather, setWeather] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [canRequest, setCanRequest] = useState(true);
  const [remainingTime, setRemainingTime] = useState<string>("");

  const moods = [
    { value: "元気いっぱい", emoji: "😄", color: "bg-yellow-100 hover:bg-yellow-200" },
    { value: "リラックス", emoji: "😌", color: "bg-blue-100 hover:bg-blue-200" },
    { value: "疲れている", emoji: "😫", color: "bg-purple-100 hover:bg-purple-200" },
    { value: "冒険したい", emoji: "🤩", color: "bg-red-100 hover:bg-red-200" },
    { value: "ヘルシー志向", emoji: "🥗", color: "bg-green-100 hover:bg-green-200" },
    { value: "がっつり食べたい", emoji: "🍖", color: "bg-orange-100 hover:bg-orange-200" },
  ];

  const weathers = [
    { value: "晴れ", emoji: "☀️", color: "bg-yellow-100 hover:bg-yellow-200" },
    { value: "曇り", emoji: "☁️", color: "bg-gray-100 hover:bg-gray-200" },
    { value: "雨", emoji: "🌧️", color: "bg-blue-100 hover:bg-blue-200" },
  ];

  // クッキーから最終リクエスト日付を取得
  const getLastRequestDate = useCallback((): string | null => {
    if (typeof document === "undefined") return null;
    const cookies = document.cookie.split("; ");
    const lastRequestCookie = cookies.find((row) =>
      row.startsWith("lastRequestDate=")
    );
    if (lastRequestCookie) {
      return lastRequestCookie.split("=")[1];
    }
    return null;
  }, []);

  // クッキーから保存された結果を取得
  const getSavedResult = useCallback((): RecommendationResponse | null => {
    if (typeof document === "undefined") return null;
    const cookies = document.cookie.split("; ");
    const resultCookie = cookies.find((row) =>
      row.startsWith("savedResult=")
    );
    if (resultCookie) {
      try {
        const encodedResult = resultCookie.split("=")[1];
        const decodedResult = decodeURIComponent(encodedResult);
        return JSON.parse(decodedResult);
      } catch (e) {
        console.error("Failed to parse saved result:", e);
        return null;
      }
    }
    return null;
  }, []);

  // クッキーに最終リクエスト日付を保存
  const setLastRequestDate = () => {
    const today = new Date();
    const dateString = today.toLocaleDateString("ja-JP"); // YYYY/MM/DD形式
    // 翌日の0時までの有効期限を設定
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    // biome-ignore lint/suspicious/noDocumentCookie: false positive
    document.cookie = `lastRequestDate=${dateString}; expires=${tomorrow.toUTCString()}; path=/; SameSite=Strict`;
  };

  // クッキーに結果を保存
  const saveResult = (data: RecommendationResponse) => {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    const encodedResult = encodeURIComponent(JSON.stringify(data));
    // biome-ignore lint/suspicious/noDocumentCookie: false positive
    document.cookie = `savedResult=${encodedResult}; expires=${tomorrow.toUTCString()}; path=/; SameSite=Strict`;
  };

  // リクエスト可能かチェック
  const checkCanRequest = useCallback(() => {
    const lastRequestDate = getLastRequestDate();
    const today = new Date().toLocaleDateString("ja-JP");

    if (!lastRequestDate || lastRequestDate !== today) {
      setCanRequest(true);
      setRemainingTime("");
      return;
    }

    // 同じ日付の場合は制限
    setCanRequest(false);
    
    // 翌日0時までの残り時間を計算
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    const remainingMs = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor(
      (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
    );
    setRemainingTime(`${hours}時間${minutes}分`);
  }, [getLastRequestDate]);

  // 初回マウント時とタイマーでチェック
  useEffect(() => {
    checkCanRequest();
    
    // 保存された結果を読み込む
    const savedResult = getSavedResult();
    if (savedResult) {
      setResult(savedResult);
    }
    
    const interval = setInterval(checkCanRequest, 60000); // 1分ごとにチェック
    return () => clearInterval(interval);
  }, [checkCanRequest, getSavedResult]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // リクエスト制限チェック
    if (!canRequest) {
      setError(
        `本日の利用回数に達しました。次回は${remainingTime}後にご利用いただけます。`
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, mood, weather }),
      });

      if (!response.ok) {
        throw new Error("レコメンデーションの取得に失敗しました");
      }

      const data = await response.json();
      setResult(data);
      
      // リクエスト成功時にクッキーを設定
      setLastRequestDate();
      saveResult(data); // 結果を保存
      setCanRequest(false);
      checkCanRequest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setMood("");
    setWeather("");
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/og-image.jpg')", backgroundColor: "rgba(0, 0, 0, 0.4)", backgroundBlendMode: "overlay" }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* ヘッダー */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            🍽️ 天王洲アイル<br className="md:hidden" />ランチAI
          </h1>
          <p className="text-lg text-white drop-shadow-md">
            あなたの気分と天気から、最適なランチをAIが提案します
          </p>
        </header>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 名前入力 */}
            <div>
              <label htmlFor="name" className="block text-xl font-semibold text-gray-800 mb-4">
                お名前を教えてください
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 太郎"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg text-gray-800"
                required
              />
            </div>

            {/* 気分選択 */}
            <fieldset>
              <legend className="block text-xl font-semibold text-gray-800 mb-4">
                今日の気分は？
              </legend>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {moods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mood === m.value
                        ? "border-blue-500 bg-blue-50 scale-105"
                        : "border-gray-200 hover:border-gray-300"
                    } ${m.color}`}
                  >
                    <div className="text-3xl mb-2">{m.emoji}</div>
                    <div className="text-sm font-medium text-gray-800">
                      {m.value}
                    </div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 天気選択 */}
            <fieldset>
              <legend className="block text-xl font-semibold text-gray-800 mb-4">
                今日の天気は？
              </legend>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {weathers.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => setWeather(w.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      weather === w.value
                        ? "border-blue-500 bg-blue-50 scale-105"
                        : "border-gray-200 hover:border-gray-300"
                    } ${w.color}`}
                  >
                    <div className="text-3xl mb-2">{w.emoji}</div>
                    <div className="text-sm font-medium text-gray-800">
                      {w.value}
                    </div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 利用制限メッセージ */}
            {!canRequest && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                <p className="text-yellow-800 font-semibold text-center">
                  ⏰ 本日の利用回数に達しました
                </p>
                <p className="text-yellow-700 text-sm text-center mt-2">
                  次回は{remainingTime}後にご利用いただけます
                </p>
                {result && (
                  <button
                    type="button"
                    onClick={() => setResult(result)}
                    className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                  >
                    📋 本日の結果を見る
                  </button>
                )}
              </div>
            )}

            {/* 送信ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!name || !mood || !weather || loading || !canRequest}
                className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "AIが考え中..." : canRequest ? "おすすめを教えて！" : "本日の利用回数に達しました"}
              </button>
              {(name || mood || weather || result) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-4 rounded-xl border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  リセット
                </button>
              )}
            </div>
          </form>

          {/* エラー表示 */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* モーダル */}
        {result && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUpFade">
              {/* モーダルヘッダー */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-800">
                  🎯 本日のおすすめランチ
                </h2>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="閉じる"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <title>閉じる</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* モーダルコンテンツ */}
              <div className="p-6">
                {result.message && (
                  <div className="mb-6 p-5 bg-linear-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">{result.message}</p>
                  </div>
                )}

                <div className="p-6 border-2 border-orange-300 rounded-xl bg-linear-to-br from-orange-50 to-yellow-50 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {result.recommendation.name}
                    </h3>
                    <span className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-bold shadow-md">
                      {result.recommendation.cuisine}
                    </span>
                  </div>
                  
                  <div className="mb-4 p-4 bg-white rounded-lg border border-orange-200">
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span>✨</span> おすすめの理由
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {result.recommendation.reason}
                    </p>
                  </div>

                  <div className="mb-4 p-4 bg-white rounded-lg border border-orange-200">
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span>🏠</span> 雰囲気
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {result.recommendation.atmosphere}
                    </p>
                  </div>

                  <div className="mb-4 p-4 bg-linear-to-r from-yellow-100 to-orange-100 rounded-lg border-2 border-orange-300 shadow-md">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <span>🍛</span> 本日のおすすめメニュー
                    </h4>
                    <p className="text-xl font-bold text-orange-600">
                      {result.recommendation.recommendedMenu}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-orange-200">
                      <span className="font-semibold text-gray-600">💰 価格帯:</span>
                      <span className="text-gray-800 font-medium">{result.recommendation.priceRange}</span>
                    </div>
                  </div>

                  <a
                    href={result.recommendation.map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-4 px-6 rounded-xl font-bold text-lg transition-colors shadow-md"
                  >
                    📍 Google マップで見る
                  </a>
                </div>
              </div>

              {/* モーダルフッター */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <footer className="text-center mt-12 text-gray-300 text-sm drop-shadow-md">
          <p>Powered by Gemini AI × Next.js</p>
        </footer>
      </div>
    </div>
  );
}
