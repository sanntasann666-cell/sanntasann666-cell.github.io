import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  boothFee,
  mercariFee,
  rakumaFee,
  yahooFurimaFee,
  requiredSalePrice,
} from "../js/fees.js";

const yen = (n) => n.toLocaleString("ja-JP") + "円";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const boothHtml = read("../booth-tesuuryou/index.html");
const furimaHtml = read("../furima-tesuuryou/index.html");
const excelHtml = read("../booth-uriage-kanri-excel/index.html");
const homeHtml = read("../index.html");
const sitemap = read("../sitemap.xml");
const robots = read("../robots.txt");

const PROMO = "毎月の販売記録・手数料・経費をまとめたい人へ";
const FREE_A = "https://santa-shop.booth.pm/items/9181179";
const FREE_B = "https://santa-shop.booth.pm/items/9185174";

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

test("希望手取りの逆算は requiredSalePrice と一致する", () => {
  for (const target of [500, 880, 1000, 2000, 3000, 5000]) {
    const price = requiredSalePrice("booth", target, {
      boothMode: "download",
      buyerShipping: 0,
      sellerShipping: 0,
      cogs: 0,
    });
    const fee = boothFee(price);
    const row = `<tr><th scope="row">${yen(target)}</th><td class="num">${yen(price)}</td><td class="num">${yen(fee)}</td><td class="num">${yen(price - fee)}</td></tr>`;
    assert.ok(boothHtml.includes(row), row);
  }
});

test("月間の表は1件手数料×個数と振込1回で一致する", () => {
  const cases = [
    [500, 10],
    [500, 30],
    [500, 100],
    [980, 10],
    [980, 30],
    [980, 100],
    [1980, 10],
    [1980, 30],
    [1980, 100],
  ];
  for (const [price, count] of cases) {
    const fee = boothFee(price) * count;
    const before = (price - boothFee(price)) * count;
    const bank = before >= 30000 ? 300 : 200;
    assert.ok(boothHtml.includes(yen(price * count)), yen(price * count));
    assert.ok(boothHtml.includes(yen(fee)), yen(fee));
    assert.ok(boothHtml.includes(yen(before)), yen(before));
    assert.ok(boothHtml.includes(yen(before - bank)), yen(before - bank));
  }
  assert.match(boothHtml, /4,270円/);
  assert.match(boothHtml, /申請が必要/);
});

test("フリマ比較は公表5%と端数試算を分け、実質利益が式と一致する", () => {
  const price = 1000;
  assert.ok(furimaHtml.includes(`<th scope="row">メルカリ</th><td class="num">${yen(mercariFee(price))}</td><td class="num">${yen(price - mercariFee(price))}</td>`));
  assert.ok(furimaHtml.includes(`<th scope="row">ラクマ（10%）</th><td class="num">${yen(rakumaFee(price, 0.1))}</td>`));
  assert.ok(furimaHtml.includes(`<th scope="row">ラクマ（4.5%）</th><td class="num">${yen(rakumaFee(price, 0.045))}</td>`));
  assert.ok(furimaHtml.includes("<th scope=\"row\">Yahoo!フリマ（公表の5%）</th><td class=\"num\">50円</td><td class=\"num\">950円</td>"));
  assert.ok(furimaHtml.includes(`<th scope="row">Yahoo!フリマ（このサイトの端数）</th><td class="num">${yen(yahooFurimaFee(price))}</td><td class="num">${yen(price - yahooFurimaFee(price))}</td>`));
  assert.ok(furimaHtml.includes(`<th scope="row">BOOTH（ダウンロード）</th><td class="num">${yen(boothFee(price))}</td><td class="num">${yen(price - boothFee(price))}</td>`));

  const sale = 1500;
  const shipping = 230;
  const cogs = 300;
  const profit = (fee) => sale - fee - shipping - cogs;
  assert.equal(profit(mercariFee(sale)), 820);
  assert.equal(profit(75), 895);
  assert.equal(profit(yahooFurimaFee(sale)), 896);
  assert.ok(furimaHtml.includes("<th scope=\"row\">メルカリ</th><td class=\"num\">150円</td><td class=\"num\">820円</td>"));
  assert.ok(furimaHtml.includes("<th scope=\"row\">Yahoo!フリマ（公表の5%）</th><td class=\"num\">75円</td><td class=\"num\">895円</td>"));
  assert.ok(furimaHtml.includes(`<td class="num">${yen(yahooFurimaFee(sale))}</td><td class="num">${yen(profit(yahooFurimaFee(sale)))}</td>`));
  assert.match(furimaHtml, /1,071円/);
  assert.match(furimaHtml, /中古品・物販（メルカリ・ラクマ・Yahoo!フリマ）/);
  assert.match(furimaHtml, /デジタル販売（BOOTH）/);
  assert.match(furimaHtml, /みんなの銀行/);
});

test("3本の記事に無料配布への案内と確認日がある", () => {
  for (const html of [boothHtml, furimaHtml, excelHtml]) {
    assert.ok(html.includes(PROMO));
    assert.ok(html.includes(FREE_A));
    assert.ok(html.includes(FREE_B));
    assert.match(html, /最終確認日 2026-11-20/);
    assert.match(html, /"@type": "FAQPage"/);
    assert.match(html, /"@type": "Article"/);
    assert.doesNotMatch(html, /有料版|有料テンプレート|有料の台帳/);
  }
  assert.match(boothHtml, /rel="canonical" href="https:\/\/sanntasann666-cell\.github\.io\/booth-tesuuryou\/"/);
  assert.match(furimaHtml, /rel="canonical" href="https:\/\/sanntasann666-cell\.github\.io\/furima-tesuuryou\/"/);
  assert.match(excelHtml, /rel="canonical" href="https:\/\/sanntasann666-cell\.github\.io\/booth-uriage-kanri-excel\/"/);
  assert.match(boothHtml, /<h1>BOOTH手数料はいくら？100〜5,000円の手取り早見表【2026年】<\/h1>/);
  assert.match(furimaHtml, /<h1>フリマアプリ手数料比較【2026年】メルカリ・ラクマ・Yahoo!フリマの実質手取り<\/h1>/);
  assert.match(excelHtml, /売上管理CSVの一覧/);
  assert.match(excelHtml, /最大31日/);
  assert.match(homeHtml, /href="booth-uriage-kanri-excel\/"/);
  assert.match(homeHtml, /href="furima-tesuuryou\/"/);
  assert.match(homeHtml, /href="booth-tesuuryou\/"/);
});

test("sitemap と robots が全ページを指す", () => {
  for (const loc of [
    "https://sanntasann666-cell.github.io/",
    "https://sanntasann666-cell.github.io/booth-tesuuryou/",
    "https://sanntasann666-cell.github.io/furima-tesuuryou/",
    "https://sanntasann666-cell.github.io/booth-uriage-kanri-excel/",
  ]) {
    assert.ok(sitemap.includes(`<loc>${loc}</loc>`), loc);
  }
  assert.match(robots, /Sitemap: https:\/\/sanntasann666-cell\.github\.io\/sitemap\.xml/);
});
