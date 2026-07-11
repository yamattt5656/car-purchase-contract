(function () {
  const { parseQr2, parseQr3, buildRelayPayload } = window.QrParse;

  let stream = null;
  let rafId = null;
  let detector = null;
  let canvas = null;
  let ctx = null;
  let scannedQr2 = false;
  let scannedQr3 = false;
  const collected = {};

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
    if (!scannedQr2) {
      const qr2 = parseQr2(text);
      if (qr2) {
        collected.plate = qr2.plate;
        collected.chassis = qr2.chassis;
        scannedQr2 = true;
        markStatus(2);
      }
    }
    if (!scannedQr3) {
      const qr3 = parseQr3(text);
      if (qr3) {
        collected.model = qr3.model;
        collected.firstReg = qr3.firstReg;
        collected.inspection = qr3.inspection;
        scannedQr3 = true;
        markStatus(3);
      }
    }
    if (scannedQr2 || scannedQr3) {
      document.getElementById("btn-show-result").disabled = false;
    }
    if (scannedQr2 && scannedQr3) {
      stopCamera();
      showResult();
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
    if (stream) rafId = requestAnimationFrame(() => scanTick(video));
  }

  function showError(message) {
    const errEl = document.getElementById("qr-error");
    errEl.textContent = message;
    errEl.hidden = false;
  }

  async function startCamera() {
    const video = document.getElementById("qr-video");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError("このブラウザはカメラ機能に対応していません。");
      return;
    }
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      showError("このページはHTTPS（またはlocalhost）で開く必要があります。現在の接続ではスマホのカメラが起動できない場合があります。");
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
      showError("カメラを起動できませんでした。ブラウザのカメラ利用許可をご確認ください。");
      return;
    }

    video.srcObject = stream;
    await video.play();
    rafId = requestAnimationFrame(() => scanTick(video));
  }

  function stopCamera() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    detector = null;
  }

  const FIELD_LABELS = {
    plate: "登録番号",
    chassis: "車台番号",
    model: "型式",
    firstReg: "初度登録年月",
    inspection: "車検有効期限",
  };

  function showResult() {
    document.getElementById("scan-view").hidden = true;
    const resultView = document.getElementById("result-view");
    resultView.hidden = false;

    const containerEl = document.getElementById("result-qr-canvas");
    containerEl.innerHTML = "";
    const payload = buildRelayPayload(collected);
    if (window.QRCode) {
      new window.QRCode(containerEl, { text: payload, width: 240, height: 240 });
    }

    const list = document.getElementById("result-summary");
    list.innerHTML = "";
    Object.keys(FIELD_LABELS).forEach((key) => {
      if (!collected[key]) return;
      const li = document.createElement("li");
      li.textContent = `${FIELD_LABELS[key]}：${collected[key]}`;
      list.appendChild(li);
    });
  }

  function resetAndRescan() {
    Object.keys(collected).forEach((k) => delete collected[k]);
    scannedQr2 = false;
    scannedQr3 = false;
    document.getElementById("qr-status-2").classList.remove("done");
    document.getElementById("qr-status-2").textContent = "二次元コード２（登録番号・車台番号）：未読み取り";
    document.getElementById("qr-status-3").classList.remove("done");
    document.getElementById("qr-status-3").textContent = "二次元コード３（型式・初度登録・車検有効期限）：未読み取り";
    document.getElementById("btn-show-result").disabled = true;
    document.getElementById("qr-error").hidden = true;

    document.getElementById("result-view").hidden = true;
    document.getElementById("scan-view").hidden = false;
    startCamera();
  }

  function init() {
    document.getElementById("btn-show-result").addEventListener("click", () => {
      stopCamera();
      showResult();
    });
    document.getElementById("btn-rescan").addEventListener("click", resetAndRescan);
    startCamera();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
