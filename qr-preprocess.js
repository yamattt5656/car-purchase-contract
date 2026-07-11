// 車検証QRコードの読み取り精度を上げるための前処理付きデコード処理。
// 車検証（特に電子車検証・B5サイズ）は地紋（背景の細かい模様）がノイズとなり
// jsQR がそのままでは読み取りにくい。そこでグレースケール化＋大津の二値化で
// 地紋を除去してから解析する。
// 参考: https://blog.kinto-technologies.com/posts/2023-12-13-Factory-scan-qr-code-on-inspection-cerificate/
window.QrPreprocess = (function () {
  // 大津の手法で最適な二値化しきい値を求める
  function computeOtsuThreshold(gray, total) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < total; i++) hist[gray[i]]++;

    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxVar = 0;
    let threshold = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxVar) {
        maxVar = between;
        threshold = t;
      }
    }
    return threshold;
  }

  // ImageData を輝度でグレースケール化し、大津のしきい値で白黒二値化した
  // 新しい ImageData を返す
  function binarize(imageData) {
    const d = imageData.data;
    const total = imageData.width * imageData.height;
    const gray = new Uint8ClampedArray(total);
    for (let i = 0, p = 0; p < total; i += 4, p++) {
      // ITU-R BT.601 輝度
      gray[p] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    }

    const th = computeOtsuThreshold(gray, total);

    const out = new Uint8ClampedArray(d.length);
    for (let i = 0, p = 0; p < total; i += 4, p++) {
      const v = gray[p] > th ? 255 : 0;
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  // jsQR で解析する。まず素の画像、ダメなら二値化画像で再試行する。
  // どちらも反転（白黒逆）も試す。
  function decode(imageData) {
    if (!window.jsQR) return null;

    let r = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (r && r.data) return r.data;

    const bin = binarize(imageData);
    r = window.jsQR(bin.data, bin.width, bin.height, {
      inversionAttempts: "attemptBoth",
    });
    if (r && r.data) return r.data;

    return null;
  }

  return { decode, binarize };
})();
