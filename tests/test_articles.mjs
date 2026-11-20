import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boothFee, mercariFee, rakumaFee, yahooFurimaFee } from "../js/fees.js";

const yen = (n) => n.toLocaleString("ja-JP") + "円";

const boothHtml = readFileSync(new URL("../booth-tesuuryou/index.html", import.meta.url), "utf8");
const furimaHtml = readFileSync(new URL("../furima-tesuuryou/index.html", import.meta.url), "utf8");
const homeHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("BOOTH早見表は fees.js の boothFee と一致する", () => {
  const prices = [100, 300, 500, 800, 980, 1000, 1500, 1980, 2980, 5000];
  for (const price of prices) {
    const fee = boothFee(price);
    const take = price - fee;
    const rate = ((fee / price) * 100).toFixed(1) + "%";
    const row = `<tr><th scope="row">${yen(price)}</th><td class="num">${yen(fee)}</td><td class="num">${yen(take)}</td><td class="num">${rate}</td></tr>`;
    assert.ok(boothHtml.includes(row), row);
  }
});

test("フリマ比較の1,000円行は fees.js と一致する", () => {
  const price = 1000;
  const rows = [
    ["メルカリ", mercariFee(price)],
    ["ラクマ（10%）", rakumaFee(price, 0.1)],
    ["ラクマ（4.5%）", rakumaFee(price, 0.045)],
    ["Yahoo!フリマ", yahooFurimaFee(price)],
    ["BOOTH（ダウンロード）", boothFee(price)],
  ];
  for (const [name, fee] of rows) {
    const row = `<tr><th scope="row">${name}</th><td class="num">${yen(fee)}</td><td class="num">${yen(price - fee)}</td></tr>`;
    assert.ok(furimaHtml.includes(row), row);
  }
});

test("記事の canonical・確認日・公式リンクがある", () => {
  assert.match(boothHtml, /rel="canonical" href="https:\/\/sanntasann666-cell\.github\.io\/booth-tesuuryou\/"/);
  assert.match(furimaHtml, /rel="canonical" href="https:\/\/sanntasann666-cell\.github\.io\/furima-tesuuryou\/"/);
  assert.match(boothHtml, /最終確認日 2026-11-20/);
  assert.match(furimaHtml, /最終確認日 2026-11-20/);
  assert.match(boothHtml, /https:\/\/booth\.pixiv\.help\/hc\/ja\/articles\/115004576874/);
  assert.match(boothHtml, /https:\/\/booth\.pixiv\.help\/hc\/ja\/articles\/231284808/);
  assert.match(furimaHtml, /https:\/\/paypayfleamarket\.yahoo\.co\.jp\/notice\/rule\/post_1340\//);
  assert.match(furimaHtml, /取引画面の表示を優先/);
  assert.match(boothHtml, /"@type": "FAQPage"/);
  assert.match(furimaHtml, /"@type": "Article"/);
  assert.match(homeHtml, /href="booth-tesuuryou\/"/);
  assert.match(homeHtml, /href="furima-tesuuryou\/"/);
  assert.match(homeHtml, /https:\/\/santa-shop\.booth\.pm\/items\/9181179/);
  assert.match(homeHtml, /https:\/\/santa-shop\.booth\.pm\/items\/9185174/);
});
