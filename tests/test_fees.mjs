import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mercariFee,
  rakumaFee,
  yahooFurimaFee,
  yahooAuctionFee,
  boothFee,
  baseStandardFee,
  minneFee,
  creemaFee,
  compare,
  rowFor,
  requiredSalePrice,
  SERVICES,
  normalizeInput,
  asYen,
} from "../js/fees.js";

test("asYen floors and rejects negatives / non-finite", () => {
  assert.equal(asYen(100.9), 100);
  assert.equal(asYen(-5), 0);
  assert.equal(asYen(NaN), 0);
  assert.equal(asYen(Infinity), 0);
});

test("メルカリ: 販売価格の10%（切り捨て）", () => {
  assert.equal(mercariFee(1000), 100);
  assert.equal(mercariFee(10000), 1000);
  assert.equal(mercariFee(333), 33);
  assert.equal(mercariFee(0), 0);
});

test("ラクマ: 選択した料率を切り捨て", () => {
  assert.equal(rakumaFee(10000, 0.10), 1000);
  assert.equal(rakumaFee(10000, 0.045), 450);
  assert.equal(rakumaFee(1999, 0.10), 199);
});

test("Yahoo!フリマ: 公開されている端数処理（公式は5%とのみ記載）", () => {
  // 500 × 4.54% = 22.7 → 23, tax 2 → 25
  assert.equal(yahooFurimaFee(500), 25);
  // 1,000 × 4.54% = 45.4 → 45, tax 4 → 49
  assert.equal(yahooFurimaFee(1000), 49);
  // 1,900 × 4.54% = 86.26 → 86, tax 8 → 94
  assert.equal(yahooFurimaFee(1900), 94);
  // 3,000 × 4.54% = 136.2 → 136, tax 13 → 149
  assert.equal(yahooFurimaFee(3000), 149);
  // 10,000 × 4.54% = 454, tax 45 → 499
  assert.equal(yahooFurimaFee(10000), 499);
});

test("ヤフオク: 落札金額の10%（切り捨て）", () => {
  assert.equal(yahooAuctionFee(10000), 1000);
  assert.equal(yahooAuctionFee(999), 99);
});

test("BOOTH: 価格 × 5.6% の切り上げ + 45円。無料は0", () => {
  assert.equal(boothFee(0), 0);
  assert.equal(boothFee(500), 73); // 28 + 45
  assert.equal(boothFee(980), 100); // ceil(54.88)=55 + 45; 手取り880
  assert.equal(boothFee(1000), 101);
  assert.equal(boothFee(1980), 156); // ceil(110.88)=111 + 45
  assert.equal(boothFee(3000), 213);
  assert.equal(boothFee(1040), 104); // ceil(58.24)=59 + 45 = 104; ほぼメルカリ並み
});

test("BASEスタンダード: 3.6%（四捨五入）+40 + 3%（四捨五入）", () => {
  assert.equal(baseStandardFee(0), 0);
  assert.equal(baseStandardFee(1000), 106); // 36 + 40 + 30
  assert.equal(baseStandardFee(3000), 238); // 108 + 40 + 90
  assert.equal(baseStandardFee(10000), 700); // 360 + 40 + 300
});

test("minne: 公式例どおり切り捨て", () => {
  assert.equal(minneFee(1300), 138);
  assert.equal(minneFee(2500), 266);
  assert.equal(minneFee(1000), 106);
});

test("Creema: 作品10.67%を四捨五入（公式に端数記載なし）", () => {
  assert.equal(creemaFee(3300, "works"), 352); // 3300 * 0.1067 = 352.11
  assert.equal(creemaFee(1000, "works"), 107);
  assert.equal(creemaFee(1000, "food"), 154);
});

test("compare: 同じ販売価格なら Yahoo!フリマの手数料がメルカリ・ヤフオクより安い", () => {
  const rows = compare({ salePrice: 10000, buyerShipping: 0, sellerShipping: 0, cogs: 0 });
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId.mercari.fee, 1000);
  assert.equal(byId["yahoo-furima"].fee, 499);
  assert.equal(byId["yahoo-auction"].fee, 1000);
  assert.ok(byId["yahoo-furima"].takeHome > byId.mercari.takeHome);
  assert.equal(rows.filter((r) => r.bestTakeHome).length >= 1, true);
  assert.equal(new Set(rows.map((r) => r.id)).size, SERVICES.length);
});

test("BOOTH 自宅発送は送料込みの支払額に手数料がかかる", () => {
  const dl = rowFor(
    SERVICES.find((s) => s.id === "booth"),
    { salePrice: 3000, buyerShipping: 500, boothMode: "download" }
  );
  const ship = rowFor(
    SERVICES.find((s) => s.id === "booth"),
    { salePrice: 3000, buyerShipping: 500, boothMode: "ship" }
  );
  assert.equal(dl.fee, boothFee(3000));
  assert.equal(ship.fee, boothFee(3500));
  assert.ok(ship.fee > dl.fee);
});

test("minne / Creema / BASE の手数料対象は販売価格+購入者送料", () => {
  const minne = rowFor(SERVICES.find((s) => s.id === "minne"), {
    salePrice: 900,
    buyerShipping: 400,
  });
  assert.equal(minne.fee, minneFee(1300));
  const creema = rowFor(SERVICES.find((s) => s.id === "creema"), {
    salePrice: 3000,
    buyerShipping: 300,
  });
  assert.equal(creema.fee, creemaFee(3300));
  const base = rowFor(SERVICES.find((s) => s.id === "base"), {
    salePrice: 1000,
    buyerShipping: 0,
  });
  assert.equal(base.fee, 106);
});

test("手取りは 販売価格+購入者送料-手数料-自己負担送料-仕入", () => {
  const r = rowFor(SERVICES.find((s) => s.id === "mercari"), {
    salePrice: 3000,
    buyerShipping: 0,
    sellerShipping: 210,
    cogs: 1000,
  });
  assert.equal(r.fee, 300);
  assert.equal(r.takeHome, 3000 - 300 - 210 - 1000);
});

test("逆算: メルカリで手取り8800以上になる最小の販売価格", () => {
  const price = requiredSalePrice("mercari", 8800, {
    buyerShipping: 0,
    sellerShipping: 0,
    cogs: 0,
  });
  assert.equal(price, 9777); // 9777 - floor(977.7)=977 → 手取り8800
  const row = rowFor(SERVICES.find((s) => s.id === "mercari"), { salePrice: price });
  assert.ok(row.takeHome >= 8800);
  const below = rowFor(SERVICES.find((s) => s.id === "mercari"), { salePrice: price - 1 });
  assert.ok(below.takeHome < 8800);
});

test("逆算: BOOTHダウンロードで手取り880（価格980の公式手取り）", () => {
  const price = requiredSalePrice("booth", 880, {
    boothMode: "download",
    buyerShipping: 0,
    sellerShipping: 0,
    cogs: 0,
  });
  assert.equal(price, 980);
  assert.equal(boothFee(980), 100);
});

test("normalizeInput が不正値を安全にする", () => {
  const n = normalizeInput({ salePrice: -10, buyerShipping: "x", rakumaRate: "0.045" });
  assert.equal(n.salePrice, 0);
  assert.equal(n.buyerShipping, 0);
  assert.equal(n.rakumaRate, 0.045);
  assert.equal(n.boothMode, "download");
});
