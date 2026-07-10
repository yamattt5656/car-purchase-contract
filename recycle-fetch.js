(function () {
  // 自動車リサイクルシステムの「リサイクル料金の預託状況照会」ページ
  const JARS_URL = "https://www1.jars.gr.jp/k/kdis0010.do";

  function setNote(message, isError) {
    const note = document.getElementById("recycle-note");
    if (!note) return;
    note.textContent = message;
    note.style.color = isError ? "#b45309" : "";
  }

  function handleClick() {
    // 自動車リサイクルシステムは別ドメイン（www1.jars.gr.jp）のため、
    // ブラウザのセキュリティ制約（同一オリジンポリシー／CORS）により
    // このサイトから料金データを直接取得することはできません。
    // そのため照会ページを新しいタブで開き、利用者が金額を確認して
    // 入力欄へ転記する運用とします。
    const win = window.open(JARS_URL, "_blank", "noopener");
    if (win) {
      setNote(
        "別タブで自動車リサイクルシステムの照会ページを開きました。車台番号などで検索し、表示された「合計」預託金額を上の欄へ入力してください。",
        false
      );
    } else {
      setNote(
        "ポップアップがブロックされました。ブラウザの設定で許可するか、直接 " +
          JARS_URL +
          " を開いてください。",
        true
      );
    }
  }

  function init() {
    const btn = document.getElementById("btn-recycle-fetch");
    if (btn) btn.addEventListener("click", handleClick);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
