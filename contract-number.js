(function () {
  // 日付ごとの採番カウンタを保持する（{ "20260711": 3 } のような形式）
  const COUNTER_KEY = "carContractNoCounters";

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function loadCounters() {
    try {
      return JSON.parse(localStorage.getItem(COUNTER_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveCounters(counters) {
    localStorage.setItem(COUNTER_KEY, JSON.stringify(counters));
  }

  // その日の次の連番を消費して契約書番号を発行する（例: 202607110001）
  function issueNumber() {
    const key = todayKey();
    const counters = loadCounters();
    const next = (counters[key] || 0) + 1;
    counters[key] = next;
    saveCounters(counters);
    return key + String(next).padStart(4, "0");
  }

  function setContractNo(value) {
    const el = document.querySelector('.editor [data-bind="contractNo"]');
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // 外部（クリアボタン等）から新規採番するための関数
  window.issueContractNumber = function () {
    setContractNo(issueNumber());
  };

  function init() {
    const el = document.querySelector('.editor [data-bind="contractNo"]');
    if (!el) return;
    // 既存の契約書番号が無い場合のみ自動採番する
    if (!el.value) window.issueContractNumber();

    const btn = document.getElementById("btn-contract-renumber");
    if (btn) btn.addEventListener("click", window.issueContractNumber);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
