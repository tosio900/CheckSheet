/**
 * GPS位置情報取得ユーティリティ
 */

/**
 * 現在の位置情報を取得する（3秒タイムアウト制限付き）
 * @returns {Promise<{lat: number, lng: number, alt: number | null} | null>}
 */
export async function getCurrentLocation() {
  if (!("geolocation" in navigator)) {
    console.warn("Geolocation is not supported by this browser.");
    return null;
  }

  return new Promise((resolve) => {
    // 3秒で強制終了するためのタイマー
    const timeoutId = setTimeout(() => {
      console.warn("GPS acquisition timed out (3s limit reached)");
      resolve(null);
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude, altitude } = position.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          alt: altitude ? Math.round(altitude * 10) / 10 : null, // 小数点第1位まで
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.warn("GPS acquisition failed:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true, // iPhone/iPad等で高精度モードを使用
        timeout: 2800,           // ブラウザレベルのタイムアウト（自前タイマーより少し短く）
        maximumAge: 0            // キャッシュは使用せず常に最新を取得
      }
    );
  });
}
