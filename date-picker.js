(function () {
  const STORAGE_KEY = "carPurchaseContractData";

  // 各日付項目の選択可能な年の範囲（今年からのオフセット）
  const FIELD_RANGES = {
    contractDate: { minOffset: -2, maxOffset: 1 },
    carInspection: { minOffset: -5, maxOffset: 6 },
    paymentDeadline: { minOffset: -1, maxOffset: 3 },
    deliveryDeadline: { minOffset: -1, maxOffset: 3 },
    docDeadline: { minOffset: -1, maxOffset: 3 },
    sellerBirth: { minOffset: -106, maxOffset: 0 },
  };

  function eraLabel(year) {
    if (year >= 2019) return year === 2019 ? "令和元年" : `令和${year - 2018}年`;
    if (year >= 1989) return year === 1989 ? "平成元年" : `平成${year - 1988}年`;
    if (year >= 1926) return year === 1926 ? "昭和元年" : `昭和${year - 1925}年`;
    if (year >= 1912) return year === 1912 ? "大正元年" : `大正${year - 1911}年`;
    if (year >= 1868) return year === 1868 ? "明治元年" : `明治${year - 1867}年`;
    return "";
  }
  window.eraLabel = eraLabel;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function loadSavedValue(target) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return "";
      const data = JSON.parse(raw);
      return data[target] || "";
    } catch (e) {
      return "";
    }
  }

  function buildOption(value, text) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    return opt;
  }

  function populateYear(select, minYear, maxYear) {
    select.appendChild(buildOption("", "年"));
    for (let y = maxYear; y >= minYear; y--) {
      select.appendChild(buildOption(String(y), `${y}年（${eraLabel(y)}）`));
    }
  }

  function populateMonth(select) {
    select.appendChild(buildOption("", "月"));
    for (let m = 1; m <= 12; m++) {
      select.appendChild(buildOption(String(m), `${m}月`));
    }
  }

  function populateDay(select, maxDay) {
    const current = select.value;
    select.innerHTML = "";
    select.appendChild(buildOption("", "日"));
    for (let d = 1; d <= maxDay; d++) {
      select.appendChild(buildOption(String(d), `${d}日`));
    }
    if (current && Number(current) <= maxDay) select.value = current;
  }

  function initGroup(group) {
    const target = group.dataset.target;
    const hidden = document.querySelector(`input[type="hidden"][data-bind="${target}"]`);
    if (!hidden) return;

    const range = FIELD_RANGES[target] || { minOffset: -5, maxOffset: 5 };
    const thisYear = new Date().getFullYear();
    const minYear = thisYear + range.minOffset;
    const maxYear = thisYear + range.maxOffset;

    const yearSel = group.querySelector(".ds-year");
    const monthSel = group.querySelector(".ds-month");
    const daySel = group.querySelector(".ds-day");

    populateYear(yearSel, minYear, maxYear);
    populateMonth(monthSel);
    populateDay(daySel, 31);

    function update() {
      const y = yearSel.value, m = monthSel.value;
      if (y && m) populateDay(daySel, daysInMonth(Number(y), Number(m)));
      if (y && m && daySel.value) {
        hidden.value = `${y}-${pad2(m)}-${pad2(daySel.value)}`;
      } else {
        hidden.value = "";
      }
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const saved = loadSavedValue(target);
    if (saved) {
      const [y, m, d] = saved.split("-");
      if (y) yearSel.value = String(Number(y));
      if (m) monthSel.value = String(Number(m));
      if (y && m) populateDay(daySel, daysInMonth(Number(y), Number(m)));
      if (d) daySel.value = String(Number(d));
    }
    hidden.value = saved || "";

    yearSel.addEventListener("change", update);
    monthSel.addEventListener("change", update);
    daySel.addEventListener("change", update);
  }

  function resetAll() {
    document.querySelectorAll(".date-select-group select").forEach((sel) => {
      sel.value = "";
    });
  }
  window.resetDateSelectors = resetAll;

  // QRコード読取等、外部から隠しinputの値を直接書き換えたときに
  // 見た目の年・月・日セレクトを一致させるための同期用関数
  function syncGroupFromHidden(target) {
    const group = document.querySelector(`.date-select-group[data-target="${target}"]`);
    const hidden = document.querySelector(`input[type="hidden"][data-bind="${target}"]`);
    if (!group || !hidden || !hidden.value) return;
    const [y, m, d] = hidden.value.split("-");
    const yearSel = group.querySelector(".ds-year");
    const monthSel = group.querySelector(".ds-month");
    const daySel = group.querySelector(".ds-day");
    if (y) yearSel.value = String(Number(y));
    if (m) monthSel.value = String(Number(m));
    if (y && m) populateDay(daySel, daysInMonth(Number(y), Number(m)));
    if (d) daySel.value = String(Number(d));
  }
  window.syncDateSelector = syncGroupFromHidden;

  function init() {
    document.querySelectorAll(".date-select-group").forEach(initGroup);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
