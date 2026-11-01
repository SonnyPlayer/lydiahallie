(function () {
  const calc = globalThis.TeilenCalc;
  const form = document.querySelector("#bill-form");
  const amountInput = document.querySelector("#amount");
  const amountError = document.querySelector("#amount-error");
  const amountCard = amountInput.closest(".card");
  const peopleValue = document.querySelector("#people-value");
  const peopleDec = document.querySelector("#people-dec");
  const peopleInc = document.querySelector("#people-inc");
  const customTipWrap = document.querySelector("#custom-tip-wrap");
  const customTipInput = document.querySelector("#custom-tip");
  const resultEmpty = document.querySelector("#result-empty");
  const resultBody = document.querySelector("#result-body");
  const resultCaption = document.querySelector("#result-caption");
  const resultHero = document.querySelector("#result-hero");
  const splitLines = document.querySelector("#split-lines");
  const resultDetail = document.querySelector("#result-detail");
  const resultRows = document.querySelector("#result-rows");
  const shareButton = document.querySelector("#share-button");
  const shareOutput = document.querySelector("#share-output");
  const resetButton = document.querySelector("#reset-button");
  const installHint = document.querySelector("#install-hint");
  const dismissHint = document.querySelector("#dismiss-hint");
  const toast = document.querySelector("#toast");

  const state = {
    people: readPeople(),
    tip: readTip(),
    customTip: false,
    roundMode: readRound(),
    shareText: "",
  };
  state.customTip = ![0, 5, 10, 15].includes(state.tip);

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* private mode */
    }
  }

  function readPeople() {
    const stored = Number(storageGet("teilen-people"));
    return Number.isInteger(stored) && stored >= 1 && stored <= 30 ? stored : 2;
  }

  function readTip() {
    const stored = Number(storageGet("teilen-tip"));
    return Number.isInteger(stored) && stored >= 0 && stored <= 100 ? stored : 10;
  }

  function readRound() {
    const stored = storageGet("teilen-round");
    return stored === "half" || stored === "euro" || stored === "exact" ? stored : "exact";
  }

  function persist() {
    storageSet("teilen-people", String(state.people));
    storageSet("teilen-tip", String(state.tip));
    storageSet("teilen-round", state.roundMode);
  }

  function selectedTip() {
    if (state.customTip) return "custom";
    return String(state.tip);
  }

  function syncChips() {
    document.querySelectorAll("[data-tip]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.tip === selectedTip() ? "true" : "false");
    });
    document.querySelectorAll("[data-round]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.round === state.roundMode ? "true" : "false");
    });
    const custom = selectedTip() === "custom";
    customTipWrap.hidden = !custom;
    if (custom) customTipInput.value = String(state.tip);
  }

  function renderRows(rows) {
    resultRows.replaceChildren();
    rows.forEach((row) => {
      const wrap = document.createElement("div");
      const label = document.createElement("dt");
      const value = document.createElement("dd");
      label.textContent = row.label;
      value.textContent = row.value;
      wrap.append(label, value);
      resultRows.append(wrap);
    });
  }

  function renderLines(lines) {
    splitLines.replaceChildren();
    lines.forEach((line) => {
      const row = document.createElement("p");
      row.className = "split-line";
      const count = document.createElement("span");
      const amount = document.createElement("span");
      count.textContent = `${line.count} ×`;
      amount.textContent = line.amount;
      row.append(count, amount);
      splitLines.append(row);
    });
  }

  function showEmpty(message) {
    resultEmpty.hidden = false;
    resultEmpty.textContent = message;
    resultBody.hidden = true;
    shareButton.disabled = true;
    shareButton.textContent = "Ergebnis teilen";
    shareOutput.hidden = true;
    state.shareText = "";
  }

  function render() {
    peopleValue.textContent = String(state.people);
    peopleDec.disabled = state.people <= 1;
    peopleInc.disabled = state.people >= 30;
    syncChips();
    persist();

    const raw = amountInput.value;
    if (!raw.trim()) {
      amountCard.classList.remove("invalid");
      amountError.hidden = true;
      showEmpty("Betrag eingeben, dann siehst du die Anteile.");
      return;
    }

    const amount = calc.parseAmount(raw);
    if (amount === null) {
      amountCard.classList.add("invalid");
      amountError.hidden = false;
      showEmpty("Der Betrag ist noch nicht lesbar.");
      return;
    }

    amountCard.classList.remove("invalid");
    amountError.hidden = true;
    const result = calc.computeSplit({
      amount,
      people: state.people,
      tipPercent: state.tip,
      roundMode: state.roundMode,
    });
    if (!result.ok) {
      showEmpty("Diese Aufteilung geht so nicht.");
      return;
    }

    const view = calc.describeSplit(result);
    resultEmpty.hidden = true;
    resultBody.hidden = false;
    resultCaption.textContent = view.caption;
    resultHero.hidden = !view.uniform;
    resultHero.textContent = view.headline;
    splitLines.hidden = view.uniform;
    if (!view.uniform) renderLines(view.lines);
    resultDetail.textContent = view.detail;
    renderRows(view.rows);
    state.shareText = view.shareText;
    shareButton.disabled = false;
    shareButton.textContent = "Ergebnis teilen";
    shareOutput.hidden = true;
  }

  function showToast(message) {
    toast.hidden = false;
    toast.textContent = message;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1800);
  }

  function copyWithSelection(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    document.body.append(area);
    area.focus();
    area.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    area.remove();
    return copied;
  }

  async function shareResult() {
    if (!state.shareText) return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (ios && navigator.share) {
      try {
        await navigator.share({ title: "Teilen", text: state.shareText });
        shareButton.textContent = "Geteilt";
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(state.shareText);
      copied = true;
    } catch (error) {
      copied = copyWithSelection(state.shareText);
    }
    shareOutput.hidden = false;
    shareOutput.textContent = state.shareText;
    shareButton.textContent = copied ? "Kopiert" : "Text zum Kopieren";
    showToast(copied ? "In die Zwischenablage kopiert" : "Text steht zum Kopieren bereit");
  }

  document.querySelector("#tip-chips").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tip]");
    if (!button) return;
    if (button.dataset.tip === "custom") {
      state.customTip = true;
      const current = Number(customTipInput.value);
      state.tip = Number.isInteger(current) && current >= 0 && current <= 100 ? current : state.tip;
    } else {
      state.customTip = false;
      state.tip = Number(button.dataset.tip);
    }
    render();
  });

  customTipInput.addEventListener("input", () => {
    const value = Number(customTipInput.value);
    if (!Number.isInteger(value) || value < 0 || value > 100) return;
    state.tip = value;
    render();
  });

  document.querySelector("#round-chips").addEventListener("click", (event) => {
    const button = event.target.closest("[data-round]");
    if (!button) return;
    state.roundMode = button.dataset.round;
    render();
  });

  peopleDec.addEventListener("click", () => {
    state.people = Math.max(1, state.people - 1);
    render();
  });

  peopleInc.addEventListener("click", () => {
    state.people = Math.min(30, state.people + 1);
    render();
  });

  amountInput.addEventListener("input", render);

  amountInput.addEventListener("blur", () => {
    const amount = calc.parseAmount(amountInput.value);
    if (amount === null) return;
    const formatted = amount.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (amountInput.value === formatted) return;
    amountInput.value = formatted;
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    shareResult();
  });

  shareButton.addEventListener("click", shareResult);

  resetButton.addEventListener("click", () => {
    amountInput.value = "";
    state.people = 2;
    state.tip = 10;
    state.customTip = false;
    state.roundMode = "exact";
    render();
    amountInput.focus();
  });

  function setupInstallHint() {
    const narrow = window.matchMedia("(max-width: 500px)").matches;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const dismissed = storageGet("teilen-hint") === "1";
    installHint.hidden = standalone || dismissed || !(ios || narrow);
  }

  dismissHint.addEventListener("click", () => {
    installHint.hidden = true;
    storageSet("teilen-hint", "1");
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  setupInstallHint();
  render();
})();
