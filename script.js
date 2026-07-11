(function () {
  const STORAGE_KEY = "carPurchaseContractData";

  const dateFields = new Set([
    "contractDate", "carInspection", "paymentDeadline",
    "deliveryDeadline", "docDeadline"
  ]);

  const currencyFields = new Set(["price", "loanAmount", "unpaidAmount", "recycleFee"]);

  function formatDate(value) {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    const yy = Number(y);
    const era = typeof window.eraLabel === "function" ? window.eraLabel(yy) : "";
    const eraSuffix = era ? `（${era}）` : "";
    return `${yy}年${Number(m)}月${Number(d)}日${eraSuffix}`;
  }

  function formatCurrency(value) {
    if (value === "" || value === null || isNaN(Number(value))) return "";
    return Number(value).toLocaleString("ja-JP") + " 円";
  }

  function getFormElements() {
    const inputs = Array.from(document.querySelectorAll(".editor [data-bind]"));
    const radios = Array.from(document.querySelectorAll(".editor input[type=radio]"));
    return { inputs, radios };
  }

  function renderField(name, rawValue) {
    const targets = document.querySelectorAll(`[data-out="${name}"]`);
    if (!targets.length) return;

    let display = rawValue;
    if (dateFields.has(name)) display = formatDate(rawValue);
    if (currencyFields.has(name)) display = formatCurrency(rawValue);
    if (!display) display = "－";

    targets.forEach((el) => { el.textContent = display; });
  }

  function applyLoanUnpaidVisibility(data) {
    const loanStatus = data.loanStatus || "無";
    const unpaidStatus = data.unpaidStatus || "無";
    document.querySelectorAll('[data-out="loanStatus"]').forEach(el => el.textContent = loanStatus);
    document.querySelectorAll('[data-out="unpaidStatus"]').forEach(el => el.textContent = unpaidStatus);

    renderField("unpaidAmount", unpaidStatus === "有" ? data.unpaidAmount : "");
  }

  function applyOwnerUser(data) {
    const ownerType = data.ownerType || "本人";
    const userType = data.userType || "本人";

    const ownerField = document.getElementById("ownerOther-field");
    const userField = document.getElementById("userOther-field");
    if (ownerField) ownerField.hidden = ownerType !== "その他";
    if (userField) userField.hidden = userType !== "その他";

    const ownerDisplay = ownerType === "その他" ? (data.ownerOther || "その他") : ownerType;
    const userDisplay = userType === "その他" ? (data.userOther || "その他") : userType;
    document.querySelectorAll('[data-out="ownerDisplay"]').forEach(el => el.textContent = ownerDisplay);
    document.querySelectorAll('[data-out="userDisplay"]').forEach(el => el.textContent = userDisplay);
  }

  function applyBankVisibility(data) {
    const bankTable = document.getElementById("bank-table");
    if (!bankTable) return;
    bankTable.hidden = data.paymentMethod !== "銀行振込";
  }

  function applyRecycleNoteVisibility(data) {
    const note = document.getElementById("recycle-include-note");
    if (!note) return;
    const fee = data.recycleFee;
    note.hidden = !(fee && Number(fee) > 0);
  }

  function applySellerTypeVisibility(data) {
    const isCorp = data.sellerType === "法人";
    const dateField = document.getElementById("sellerBirth-date-field");
    const corpField = document.getElementById("sellerCorpNo-field");
    if (dateField) dateField.hidden = isCorp;
    if (corpField) corpField.hidden = !isCorp;
  }

  function collectData() {
    const { inputs, radios } = getFormElements();
    const data = {};
    inputs.forEach((el) => { data[el.dataset.bind] = el.value; });
    radios.forEach((el) => { if (el.checked) data[el.name] = el.value; });
    return data;
  }

  function renderAll() {
    const data = collectData();
    Object.keys(data).forEach((name) => {
      if (name === "loanStatus" || name === "unpaidStatus") return;
      renderField(name, data[name]);
    });
    applyLoanUnpaidVisibility(data);
    applyBankVisibility(data);
    applySellerTypeVisibility(data);
    applyRecycleNoteVisibility(data);
    applyOwnerUser(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function restoreData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    let data;
    try { data = JSON.parse(saved); } catch (e) { return; }

    const { inputs, radios } = getFormElements();
    inputs.forEach((el) => {
      if (data[el.dataset.bind] !== undefined) el.value = data[el.dataset.bind];
    });
    radios.forEach((el) => {
      if (data[el.name] === el.value) el.checked = true;
    });
  }

  function init() {
    restoreData();
    renderAll();

    const { inputs, radios } = getFormElements();
    inputs.forEach((el) => el.addEventListener("input", renderAll));
    radios.forEach((el) => el.addEventListener("change", renderAll));

    document.getElementById("btn-print").addEventListener("click", () => window.print());

    document.getElementById("btn-clear").addEventListener("click", () => {
      if (!confirm("入力内容をすべてクリアします。よろしいですか？")) return;
      localStorage.removeItem(STORAGE_KEY);
      inputs.forEach((el) => { el.value = ""; });
      document.querySelectorAll('.editor input[type=radio][value="無"]').forEach(el => el.checked = true);
      document.querySelectorAll('.editor input[name="sellerType"][value="個人"]').forEach(el => el.checked = true);
      document.querySelectorAll('.editor input[name="ownerType"][value="本人"], .editor input[name="userType"][value="本人"]').forEach(el => el.checked = true);
      if (window.resetDateSelectors) window.resetDateSelectors();
      if (window.issueContractNumber) window.issueContractNumber();
      renderAll();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
