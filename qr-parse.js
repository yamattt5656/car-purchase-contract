// 電子車検証 二次元コード２・３の共通パース処理（PC側・スマホ側の両方から利用）
window.QrParse = (function () {
  const FULLWIDTH_BLANK = /[　\s]/g;

  function stripBlank(s) {
    return (s || "").replace(FULLWIDTH_BLANK, "").trim();
  }

  // 全角英数字を半角に変換する（ナンバープレート表示を自然な見た目にする）
  function toHalfWidth(s) {
    return (s || "").replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    );
  }

  // 「YYMMDD」→「YYYY-MM-DD」（date input 用）。999999や不明なら null。
  function toIsoDate(yymmdd) {
    if (!yymmdd || yymmdd.length !== 6 || yymmdd.trim() === "" || yymmdd.startsWith("99")) return null;
    const yy = yymmdd.slice(0, 2);
    const mm = yymmdd.slice(2, 4);
    const dd = yymmdd.slice(4, 6);
    if (!/^\d{2}$/.test(yy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) return null;
    return `20${yy}-${mm}-${dd}`;
  }

  // 「YYMM」→「YYYY年M月」。9999や不明ならnull。
  function toEraText(yymm) {
    if (!yymm || yymm.length !== 4 || yymm === "9999") return null;
    const yy = yymm.slice(0, 2);
    const mm = yymm.slice(2, 4);
    if (!/^\d{2}$/.test(yy) || !/^\d{2}$/.test(mm)) return null;
    return `20${yy}年${Number(mm)}月`;
  }

  // 二次元コード２：自動車登録番号／車両番号（12文字）を読みやすい形式に整形する
  function formatPlate(raw12) {
    if (!raw12 || raw12.length < 12) return toHalfWidth(stripBlank(raw12));
    const marks = stripBlank(raw12.slice(0, 4));
    const cls = toHalfWidth(stripBlank(raw12.slice(4, 7)));
    const kana = stripBlank(raw12.slice(7, 8));
    const serial = toHalfWidth(stripBlank(raw12.slice(8, 12)));
    return [marks, cls, kana, serial].filter(Boolean).join(" ");
  }

  function parseQr2(raw) {
    const parts = raw.split("/");
    if (parts.length !== 6) return null;
    return {
      plate: formatPlate(parts[1]),
      chassis: (parts[3] || "").trim(),
    };
  }

  function parseQr3(raw) {
    const parts = raw.split("/");
    if (parts.length !== 21) return null;
    const inspectionApp = toIsoDate(parts[4]);
    const inspectionRecord = toIsoDate(parts[5]);
    return {
      inspection: inspectionApp || inspectionRecord || null,
      firstReg: toEraText(parts[6]),
      model: (parts[7] || "").trim(),
    };
  }

  const RELAY_MARKER = "carqr";

  function buildRelayPayload(fields) {
    return JSON.stringify({ t: RELAY_MARKER, v: 1, ...fields });
  }

  function tryParseRelay(text) {
    if (!text || text[0] !== "{") return null;
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      return null;
    }
    return obj && obj.t === RELAY_MARKER ? obj : null;
  }

  return {
    parseQr2,
    parseQr3,
    buildRelayPayload,
    tryParseRelay,
  };
})();
