(function () {
  const { parseQr2, parseQr3, tryParseRelay } = window.QrParse;

  function setField(name, value) {
    if (value === undefined || value === null || value === "") return;
    const el = document.querySelector(`.editor [data-bind="${name}"]`);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (window.syncDateSelector) window.syncDateSelector(name);
  }

  function applyQr2(data) {
    setField("carPlate", data.plate);
    setField("carChassis", data.chassis);
  }

  function applyQr3(data) {
    setField("carModel", data.model);
    setField("carFirstReg", data.firstReg);
    setField("carInspection", data.inspection);
  }

  function applyRelay(data) {
    setField("carPlate", data.plate);
    setField("carChassis", data.chassis);
    setField("carModel", data.model);
    setField("carFirstReg", data.firstReg);
    setField("carInspection", data.inspection);
  }

  // ---------- カメラ／読取処理 ----------

  let stream = null;
  let rafId = null;
  let detector = null;
  let canvas = null;
  let ctx = null;
  let scannedQr2 = false;
  let scannedQr3 = false;

  function markStatus(which) {
    const el = document.getElementById(`qr-status-${which}`);
    if (!el) return;
    el.classList.add("done");
    el.textContent =
      which === 2
        ? "二次元コード２（登録番号・車台番号）：読み取り完了"
        : "二次元コード３（型式・初度登録・車検有効期限）：読み取り完了";
  }

  function handleDecoded(text) {
    const relay = tryParseRelay(text);
    if (relay) {
      applyRelay(relay);
      scannedQr2 = true;
      scannedQr3 = true;
      markStatus(2);
      markStatus(3);
      setTimeout(closeModal, 600);
      return;
    }

    if (!scannedQr2) {
      const qr2 = parseQr2(text);
      if (qr2) {
        applyQr2(qr2);
        scannedQr2 = true;
        markStatus(2);
      }
    }
    if (!scannedQr3) {
      const qr3 = parseQr3(text);
      if (qr3) {
        applyQr3(qr3);
        scannedQr3 = true;
        markStatus(3);
      }
    }
    if (scannedQr2 && scannedQr3) {
      setTimeout(closeModal, 600);
    }
  }

  async function scanTick(video) {
    if (!stream) return;
    try {
      let found = false;
      if (detector) {
        const codes = await detector.detect(video);
        codes.forEach((c) => {
          if (c.rawValue) {
            found = true;
            handleDecoded(c.rawValue);
          }
        });
      }
      // ネイティブ検出で見つからない場合は、前処理付きjsQRで再挑戦する
      // （車検証の密なQR・地紋はネイティブ検出だと読めないことが多い）
      if (!found && window.jsQR && video.videoWidth) {
        if (!canvas) {
          canvas = document.createElement("canvas");
          ctx = canvas.getContext("2d", { willReadFrequently: true });
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = window.QrPreprocess
          ? window.QrPreprocess.decode(imageData)
          : (window.jsQR(imageData.data, imageData.width, imageData.height) || {}).data;
        if (data) handleDecoded(data);
      }
    } catch (e) {
      /* デコード失敗は無視して次のフレームへ */
    }
    rafId = requestAnimationFrame(() => scanTick(video));
  }

  function showError(message) {
    const errEl = document.getElementById("qr-error");
    errEl.textContent = message;
    errEl.hidden = false;
  }

  // ---------- スマホ用リンクQR表示 ----------

  let linkQrRendered = false;

  function ensureLinkQr() {
    if (linkQrRendered) return;
    const containerEl = document.getElementById("qr-link-canvas");
    const urlEl = document.getElementById("qr-link-url");
    const mobileUrl = new URL("mobile-scan.html", window.location.href).href;
    urlEl.textContent = mobileUrl;

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      document.getElementById("qr-link-warning").hidden = false;
    }

    if (window.QRCode) {
      try {
        new window.QRCode(containerEl, { text: mobileUrl, width: 180, height: 180 });
        linkQrRendered = true;
      } catch (e) {
        /* 生成失敗時はURLテキストのみ表示 */
      }
    }
  }

  function toggleLinkQr() {
    const section = document.getElementById("qr-link-section");
    const willShow = section.hidden;
    section.hidden = !willShow;
    if (willShow) ensureLinkQr();
  }

  async function openModal() {
    const modal = document.getElementById("qr-modal");
    const video = document.getElementById("qr-video");
    const errEl = document.getElementById("qr-error");
    errEl.hidden = true;
    scannedQr2 = false;
    scannedQr3 = false;
    document.getElementById("qr-status-2").classList.remove("done");
    document.getElementById("qr-status-2").textContent = "二次元コード２（登録番号・車台番号）：未読み取り";
    document.getElementById("qr-status-3").classList.remove("done");
    document.getElementById("qr-status-3").textContent = "二次元コード３（型式・初度登録・車検有効期限）：未読み取り";
    document.getElementById("qr-link-section").hidden = true;

    modal.hidden = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError("このブラウザはカメラ機能に対応していません。下の「スマホで読み取る」もお試しください。");
      return;
    }

    if ("BarcodeDetector" in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) {
        detector = null;
      }
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch (e) {
      showError("カメラを起動できませんでした。ブラウザのカメラ利用許可をご確認いただくか、下の「スマホで読み取る」をお試しください。");
      return;
    }

    video.srcObject = stream;
    await video.play();
    rafId = requestAnimationFrame(() => scanTick(video));
  }

  function closeModal() {
    const modal = document.getElementById("qr-modal");
    modal.hidden = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    detector = null;
  }

  function init() {
    document.getElementById("btn-qr-scan").addEventListener("click", openModal);
    document.getElementById("qr-close").addEventListener("click", closeModal);
    document.getElementById("qr-link-toggle").addEventListener("click", toggleLinkQr);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
