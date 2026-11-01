(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.TeilenCalc = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ROUND_MODES = ["exact", "half", "euro"];
  const MAX_CENTS = 100_000_000;

  function formatEUR(euros) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(euros);
  }

  function eurosFromCents(cents) {
    return cents / 100;
  }

  function parseAmount(raw) {
    if (typeof raw !== "string") return null;
    let text = raw.trim().replace(/\s/g, "").replace(/€/g, "");
    if (!text) return null;

    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        text = text.replace(/\./g, "").replace(",", ".");
      } else {
        text = text.replace(/,/g, "");
      }
    } else if (lastComma !== -1) {
      text = text.replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, "");
    }

    if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
    const euros = Number(text);
    if (!Number.isFinite(euros)) return null;
    const cents = Math.round(euros * 100);
    if (cents > MAX_CENTS) return null;
    return cents / 100;
  }

  function tipCents(amountCents, tipPercent) {
    return Math.round((amountCents * tipPercent) / 100);
  }

  function roundShareCents(exactCents, roundMode) {
    if (roundMode === "exact") {
      throw new Error("exact mode splits remainder in cents");
    }
    if (roundMode === "half") {
      return Math.ceil(exactCents / 50 - 1e-9) * 50;
    }
    if (roundMode === "euro") {
      return Math.ceil(exactCents / 100 - 1e-9) * 100;
    }
    throw new Error(`Unknown round mode: ${roundMode}`);
  }

  function computeSplit({ amount, people, tipPercent, roundMode }) {
    if (!ROUND_MODES.includes(roundMode)) {
      return { ok: false, error: "round" };
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return { ok: false, error: "amount" };
    }
    if (!Number.isInteger(people) || people < 1 || people > 30) {
      return { ok: false, error: "people" };
    }
    if (
      typeof tipPercent !== "number" ||
      !Number.isFinite(tipPercent) ||
      tipPercent < 0 ||
      tipPercent > 100
    ) {
      return { ok: false, error: "tip" };
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents > MAX_CENTS) return { ok: false, error: "amount" };
    const tip = tipCents(amountCents, tipPercent);
    const total = amountCents + tip;

    let eachHigh;
    let eachLow;
    let highCount;
    if (roundMode === "exact") {
      eachLow = Math.floor(total / people);
      const extra = total % people;
      eachHigh = extra === 0 ? eachLow : eachLow + 1;
      highCount = extra === 0 ? people : extra;
    } else {
      eachHigh = roundShareCents(total / people, roundMode);
      eachLow = eachHigh;
      highCount = people;
    }

    const lowCount = people - highCount;
    const paidTotal = eachHigh * highCount + eachLow * lowCount;

    return {
      ok: true,
      amountCents,
      tipCents: tip,
      totalCents: total,
      paidCents: paidTotal,
      roundingCents: paidTotal - total,
      people,
      tipPercent,
      roundMode,
      eachHigh,
      eachLow,
      highCount,
      lowCount,
    };
  }

  function personWord(count) {
    return count === 1 ? "Person" : "Personen";
  }

  function describeSplit(result) {
    if (!result || result.ok !== true) {
      throw new Error("describeSplit requires a successful split");
    }

    const uniform = result.eachHigh === result.eachLow;
    const lines = [];
    if (result.highCount > 0) {
      lines.push({
        count: result.highCount,
        cents: result.eachHigh,
        amount: formatEUR(eurosFromCents(result.eachHigh)),
      });
    }
    if (!uniform && result.lowCount > 0) {
      lines.push({
        count: result.lowCount,
        cents: result.eachLow,
        amount: formatEUR(eurosFromCents(result.eachLow)),
      });
    }

    const rows = [{ label: "Rechnung", value: formatEUR(eurosFromCents(result.amountCents)) }];
    if (result.tipCents > 0) {
      rows.push({
        label: `Trinkgeld ${result.tipPercent} %`,
        value: formatEUR(eurosFromCents(result.tipCents)),
      });
      rows.push({ label: "Gesamt", value: formatEUR(eurosFromCents(result.totalCents)) });
    }
    if (result.roundingCents > 0) {
      rows.push({
        label: "Aufrundung",
        value: formatEUR(eurosFromCents(result.roundingCents)),
      });
    }

    let detail;
    if (result.roundingCents > 0) {
      detail = "Jede Person zahlt aufgerundet. Die Aufrundung steht extra.";
    } else if (uniform) {
      detail = `${result.people} ${personWord(result.people)}, gleichmäßig`;
    } else {
      detail = "Die Anteile ergeben zusammen den Gesamtbetrag.";
    }

    const shareLines = [
      `Rechnung: ${formatEUR(eurosFromCents(result.amountCents))}`,
      `Trinkgeld ${result.tipPercent} %: ${formatEUR(eurosFromCents(result.tipCents))}`,
      `Gesamt: ${formatEUR(eurosFromCents(result.totalCents))}`,
      ...lines.map((line) => `${line.count} × ${line.amount}`),
    ];
    if (result.roundingCents > 0) {
      shareLines.push(`Aufrundung: ${formatEUR(eurosFromCents(result.roundingCents))}`);
    }

    return {
      uniform,
      headline: formatEUR(eurosFromCents(result.eachHigh)),
      caption: uniform ? "pro Person" : "Anteile",
      detail,
      lines,
      rows,
      shareText: shareLines.join("\n"),
    };
  }

  return { parseAmount, computeSplit, describeSplit, formatEUR };
});
