const test = require("node:test");
const assert = require("node:assert/strict");
const { parseAmount, computeSplit, describeSplit, formatEUR } = require("../js/calc.js");

test("parseAmount accepts German and plain decimals", () => {
  assert.equal(parseAmount("12,50"), 12.5);
  assert.equal(parseAmount("12,5"), 12.5);
  assert.equal(parseAmount("12.50"), 12.5);
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("1,234.56"), 1234.56);
  assert.equal(parseAmount("1.234"), 1234);
  assert.equal(parseAmount(" 84,50 € "), 84.5);
  assert.equal(parseAmount("0"), 0);
});

test("parseAmount rejects empty and malformed values", () => {
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("   "), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount("12,509"), null);
  assert.equal(parseAmount("-1"), null);
  assert.equal(parseAmount("1.2.3"), null);
});

test("splits an even bill including tip", () => {
  const result = computeSplit({ amount: 80, people: 4, tipPercent: 10, roundMode: "exact" });
  assert.equal(result.ok, true);
  assert.equal(result.tipCents, 800);
  assert.equal(result.totalCents, 8800);
  assert.equal(result.eachHigh, 2200);
  assert.equal(result.lowCount, 0);
  assert.equal(result.paidCents, 8800);
  const view = describeSplit(result);
  assert.equal(view.uniform, true);
  assert.equal(view.headline, formatEUR(22));
  assert.equal(view.caption, "pro Person");
});

test("distributes leftover cents so the shares add up", () => {
  const result = computeSplit({ amount: 10, people: 3, tipPercent: 0, roundMode: "exact" });
  assert.equal(result.ok, true);
  assert.equal(result.totalCents, 1000);
  assert.equal(result.eachHigh, 334);
  assert.equal(result.eachLow, 333);
  assert.equal(result.highCount, 1);
  assert.equal(result.lowCount, 2);
  assert.equal(result.eachHigh * result.highCount + result.eachLow * result.lowCount, 1000);
  const view = describeSplit(result);
  assert.equal(view.uniform, false);
  assert.equal(view.lines[0].count, 1);
  assert.equal(view.lines[1].count, 2);
  assert.match(view.detail, /Gesamtbetrag/);
  assert.match(view.shareText, /1 ×/);
  assert.match(view.shareText, /2 ×/);
});

test("rounds each share up to the next euro and reports the extra", () => {
  const result = computeSplit({ amount: 10, people: 3, tipPercent: 0, roundMode: "euro" });
  assert.equal(result.ok, true);
  assert.equal(result.eachHigh, 400);
  assert.equal(result.paidCents, 1200);
  assert.equal(result.roundingCents, 200);
  const view = describeSplit(result);
  assert.equal(view.rows.some((row) => row.label === "Aufrundung"), true);
  assert.match(view.shareText, /Aufrundung:/);
});

test("keeps an already even euro amount when rounding up", () => {
  const result = computeSplit({ amount: 12, people: 3, tipPercent: 0, roundMode: "euro" });
  assert.equal(result.eachHigh, 400);
  assert.equal(result.roundingCents, 0);
});

test("rounds up to the next 50 cents", () => {
  const result = computeSplit({ amount: 10, people: 3, tipPercent: 0, roundMode: "half" });
  assert.equal(result.eachHigh, 350);
  assert.equal(result.roundingCents, 50);
});

test("rejects impossible inputs", () => {
  assert.equal(computeSplit({ amount: -1, people: 2, tipPercent: 0, roundMode: "exact" }).ok, false);
  assert.equal(computeSplit({ amount: 10, people: 0, tipPercent: 0, roundMode: "exact" }).ok, false);
  assert.equal(computeSplit({ amount: 10, people: 31, tipPercent: 0, roundMode: "exact" }).ok, false);
  assert.equal(computeSplit({ amount: 10, people: 2, tipPercent: 101, roundMode: "exact" }).ok, false);
  assert.equal(computeSplit({ amount: 10, people: 2, tipPercent: 0, roundMode: "nope" }).ok, false);
});

test("10 percent tip on 84.50 across 3 people stays in cents", () => {
  const result = computeSplit({ amount: 84.5, people: 3, tipPercent: 10, roundMode: "exact" });
  assert.equal(result.amountCents, 8450);
  assert.equal(result.tipCents, 845);
  assert.equal(result.totalCents, 9295);
  assert.equal(
    result.eachHigh * result.highCount + result.eachLow * result.lowCount,
    9295,
  );
});
