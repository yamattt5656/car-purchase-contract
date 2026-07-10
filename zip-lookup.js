(function () {
  const API = "https://zipcloud.ibsnet.co.jp/api/search?zipcode=";

  function normalizeZip(raw) {
    // 全角数字を半角に、ハイフン・空白を除去
    return (raw || "")
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[^0-9]/g, "");
  }

  function setAddress(targetName, value) {
    const el = document.querySelector(`.editor [data-bind="${targetName}"]`);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function formatAddress(r) {
    return `${r.address1}${r.address2}${r.address3}`;
  }

  function initGroup(group) {
    const targetName = group.dataset.zipTarget;
    // data-zip-target が無い流用要素（契約書番号など）は住所検索の対象外
    if (!targetName) return;
    const zipInput = group.querySelector(".zip-input");
    const button = group.querySelector(".zip-btn");
    const candidates = document.querySelector(`.zip-candidates[data-zip-for="${targetName}"]`);
    const message = document.querySelector(`.zip-message[data-zip-msg="${targetName}"]`);

    function showMessage(text, isError) {
      message.textContent = text;
      message.hidden = !text;
      message.classList.toggle("zip-message-error", !!isError);
    }

    function hideCandidates() {
      candidates.hidden = true;
      candidates.innerHTML = "";
    }

    async function lookup() {
      const zip = normalizeZip(zipInput.value);
      hideCandidates();
      showMessage("", false);

      if (zip.length !== 7) {
        showMessage("郵便番号は7桁で入力してください。", true);
        return;
      }

      button.disabled = true;
      button.textContent = "検索中…";
      try {
        const res = await fetch(API + zip);
        const data = await res.json();
        if (data.status !== 200 || !data.results || data.results.length === 0) {
          showMessage(data.message || "該当する住所が見つかりませんでした。", true);
          return;
        }

        if (data.results.length === 1) {
          setAddress(targetName, formatAddress(data.results[0]));
          showMessage("住所を入力しました。番地・建物名を追記してください。", false);
        } else {
          // 複数候補：選択肢を表示
          candidates.innerHTML = "";
          const head = document.createElement("option");
          head.value = "";
          head.textContent = `候補が${data.results.length}件あります。選択してください`;
          candidates.appendChild(head);
          data.results.forEach((r) => {
            const opt = document.createElement("option");
            opt.value = formatAddress(r);
            opt.textContent = formatAddress(r);
            candidates.appendChild(opt);
          });
          candidates.hidden = false;
          showMessage("複数の住所候補が見つかりました。下のリストから選んでください。", false);
        }
      } catch (e) {
        showMessage("住所の取得に失敗しました。通信環境をご確認ください。", true);
      } finally {
        button.disabled = false;
        button.textContent = "住所検索";
      }
    }

    button.addEventListener("click", lookup);
    zipInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        lookup();
      }
    });

    candidates.addEventListener("change", () => {
      if (candidates.value) {
        setAddress(targetName, candidates.value);
        showMessage("住所を入力しました。番地・建物名を追記してください。", false);
      }
    });
  }

  function init() {
    document.querySelectorAll(".zip-lookup").forEach(initGroup);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
