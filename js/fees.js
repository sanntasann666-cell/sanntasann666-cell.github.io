/**
 * SANTA 手取り計算 — fee formulas and comparison.
 * All amounts are integer yen. Calculations run locally; no network.
 * Checked against official help pages on 2026-11-19 (JST).
 */
export const CHECKED = "2026-11-19";

export const SOURCES = [
  {
    id: "mercari",
    title: "メルカリ「メルカリの手数料」",
    url: "https://help.jp.mercari.com/guide/articles/65/",
    note: "販売価格の10%。出品料は無料。振込手数料は一律200円（計算の初期値には含めない）。端数処理の公式記載なし → 切り捨て。",
  },
  {
    id: "rakuma",
    title: "ラクマ「販売手数料とは」「販売手数料が変動する仕組み」",
    url: "https://faq.fril.jp/hc/ja/articles/39032852808973",
    note: "6段階（10 / 9 / 8 / 7 / 6 / 4.5%）。内税。判定は前月26日〜当月25日の取引完了実績、翌月1日〜月末に適用。300円以上の取引が販売1回。端数処理の公式記載なし → 切り捨て。",
  },
  {
    id: "yahoo-furima",
    title: "Yahoo!フリマ「かんたん購入・出品ガイド」",
    url: "https://paypayfleamarket.yahoo.co.jp/guide/beginner/",
    note: "公式は「販売価格の5%」。送料は出品者負担。端数の公式記載はない。本ツールは公開されている次の端数処理を使う: 税抜手数料 = 四捨五入(販売価格 × 4.54%)、消費税 = 切り捨て(税抜 × 10%)。取引画面の表示を優先すること。",
  },
  {
    id: "yahoo-auction",
    title: "Yahoo!オークション「ご利用料金」",
    url: "https://auctions.yahoo.co.jp/guide/guide/fee.html",
    note: "通常カテゴリの落札システム利用料は落札金額の10%（税込）。特定カテゴリは別料金。端数処理の公式記載なし → 切り捨て。",
  },
  {
    id: "booth",
    title: "BOOTH「売上にかかるサービス利用料が知りたい」",
    url: "https://booth.pixiv.help/hc/ja/articles/115004576874",
    note: "ダウンロード: 商品価格 × 5.6% + 45円。自宅から発送:（商品価格 + 送料）× 5.6% + 45円。無料配布は0円。小数点以下切り上げ。",
  },
  {
    id: "base",
    title: "BASE「料金プラン・手数料」",
    url: "https://thebase.com/price/",
    note: "スタンダード: 決済手数料 3.6% + 40円 + サービス利用料 3%（合計 6.6% + 40円）。PayPay / Amazon Pay / PayPal は決済手数料に1%加算（未対応）。グロースプラン（月額あり）は本ツールの対象外。端数処理の公式記載なし → 各項目を四捨五入して合算。",
  },
  {
    id: "minne",
    title: "minne「販売手数料の計算について教えてください」",
    url: "https://help.minne.com/hc/ja/articles/10456545234451",
    note: "注文（作品価格＋購入オプション＋送料）ごとに 10.659%（税込）。小数点以下切り捨て。公式例: 1,300円→138円、2,500円→266円。",
  },
  {
    id: "creema",
    title: "Creema「出店プランについて」／特定商取引に関する表記",
    url: "https://www.creema.jp/page/creator/getting-started",
    note: "作品・ヴィンテージ・素材: 決済総額（作品+オプション+ラッピング+送料）の 10.67%（税込）。フードは 15.4%。端数処理の公式記載なし → 四捨五入。",
  },
];

export const RAKUMA_TIERS = [
  { rate: 0.10, label: "10%（標準）", sales: "条件なし", amount: "条件なし" },
  { rate: 0.09, label: "9%", sales: "4回以上", amount: "5,000円以上" },
  { rate: 0.08, label: "8%", sales: "6回以上", amount: "10,000円以上" },
  { rate: 0.07, label: "7%", sales: "8回以上", amount: "30,000円以上" },
  { rate: 0.06, label: "6%", sales: "10回以上", amount: "50,000円以上" },
  { rate: 0.045, label: "4.5%", sales: "10回以上", amount: "100,000円以上" },
];

/** @typedef {{ salePrice: number, buyerShipping?: number, sellerShipping?: number, cogs?: number, rakumaRate?: number, boothMode?: "download"|"ship", creemaKind?: "works"|"food" }} Input */

export function asYen(n) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function mercariFee(salePrice) {
  return Math.floor(asYen(salePrice) * 0.10);
}

export function rakumaFee(salePrice, rate = 0.10) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r < 0) return 0;
  return Math.floor(asYen(salePrice) * r);
}

/**
 * Official wording is "販売価格の5%". Official help does not document rounding.
 * Implemented as the commonly reported method:
 *   net = round(price * 0.0454); tax = floor(net * 0.1); fee = net + tax
 */
export function yahooFurimaFee(salePrice) {
  const price = asYen(salePrice);
  const net = Math.round(price * 0.0454);
  const tax = Math.floor(net * 0.1);
  return net + tax;
}

export function yahooAuctionFee(salePrice) {
  return Math.floor(asYen(salePrice) * 0.10);
}

export function boothFee(paymentAmount) {
  const amount = asYen(paymentAmount);
  if (amount === 0) return 0;
  return Math.ceil(amount * 0.056) + 45;
}

export function baseStandardFee(paymentAmount) {
  const amount = asYen(paymentAmount);
  if (amount === 0) return 0;
  return Math.round(amount * 0.036) + 40 + Math.round(amount * 0.03);
}

export function minneFee(paymentAmount) {
  return Math.floor(asYen(paymentAmount) * 0.10659);
}

export function creemaFee(paymentAmount, kind = "works") {
  const rate = kind === "food" ? 0.154 : 0.1067;
  return Math.round(asYen(paymentAmount) * rate);
}

export const SERVICES = [
  {
    id: "mercari",
    name: "メルカリ",
    feeOn: "sale",
    defaultNote: "販売価格の10%",
    computeFee(input) {
      return mercariFee(input.salePrice);
    },
  },
  {
    id: "rakuma",
    name: "ラクマ",
    feeOn: "sale",
    defaultNote: "実績で10%〜4.5%",
    computeFee(input) {
      return rakumaFee(input.salePrice, input.rakumaRate ?? 0.10);
    },
  },
  {
    id: "yahoo-furima",
    name: "Yahoo!フリマ",
    feeOn: "sale",
    defaultNote: "販売価格の5%（端数は下記）",
    computeFee(input) {
      return yahooFurimaFee(input.salePrice);
    },
  },
  {
    id: "yahoo-auction",
    name: "ヤフオク",
    feeOn: "sale",
    defaultNote: "落札金額の10%（通常カテゴリ）",
    computeFee(input) {
      return yahooAuctionFee(input.salePrice);
    },
  },
  {
    id: "booth",
    name: "BOOTH",
    feeOn: "payment-if-ship",
    defaultNote: "5.6% + 45円（切り上げ）",
    computeFee(input) {
      const amount =
        input.boothMode === "ship"
          ? asYen(input.salePrice) + asYen(input.buyerShipping)
          : asYen(input.salePrice);
      return boothFee(amount);
    },
  },
  {
    id: "base",
    name: "BASE",
    feeOn: "payment",
    defaultNote: "スタンダード 6.6% + 40円",
    computeFee(input) {
      const amount = asYen(input.salePrice) + asYen(input.buyerShipping);
      return baseStandardFee(amount);
    },
  },
  {
    id: "minne",
    name: "minne",
    feeOn: "payment",
    defaultNote: "注文合計の10.659%（切り捨て）",
    computeFee(input) {
      const amount = asYen(input.salePrice) + asYen(input.buyerShipping);
      return minneFee(amount);
    },
  },
  {
    id: "creema",
    name: "Creema",
    feeOn: "payment",
    defaultNote: "決済総額の10.67%（作品）",
    computeFee(input) {
      const amount = asYen(input.salePrice) + asYen(input.buyerShipping);
      return creemaFee(amount, input.creemaKind ?? "works");
    },
  },
];

export function normalizeInput(raw = {}) {
  return {
    salePrice: asYen(raw.salePrice),
    buyerShipping: asYen(raw.buyerShipping),
    sellerShipping: asYen(raw.sellerShipping),
    cogs: asYen(raw.cogs),
    rakumaRate: Number.isFinite(Number(raw.rakumaRate)) ? Number(raw.rakumaRate) : 0.10,
    boothMode: raw.boothMode === "ship" ? "ship" : "download",
    creemaKind: raw.creemaKind === "food" ? "food" : "works",
  };
}

export function paymentAmount(service, input) {
  const sale = asYen(input.salePrice);
  const ship = asYen(input.buyerShipping);
  if (service.feeOn === "payment") return sale + ship;
  if (service.feeOn === "payment-if-ship" && input.boothMode === "ship") return sale + ship;
  return sale;
}

/**
 * takeHome = 販売価格 + 購入者送料 - 手数料 - 自己負担送料梱包 - 仕入
 */
export function rowFor(service, rawInput) {
  const input = normalizeInput(rawInput);
  const fee = service.computeFee(input);
  const gross = input.salePrice + input.buyerShipping;
  const takeHome = gross - fee - input.sellerShipping - input.cogs;
  const rate = gross > 0 ? fee / gross : 0;
  return {
    id: service.id,
    name: service.name,
    note: service.defaultNote,
    payment: paymentAmount(service, input),
    fee,
    takeHome,
    feeRate: rate,
    bestTakeHome: false,
    lowestFee: false,
  };
}

export function compare(rawInput) {
  const rows = SERVICES.map((s) => rowFor(s, rawInput));
  if (rows.length === 0) return rows;
  const maxTake = Math.max(...rows.map((r) => r.takeHome));
  const minFee = Math.min(...rows.map((r) => r.fee));
  for (const r of rows) {
    r.bestTakeHome = r.takeHome === maxTake;
    r.lowestFee = r.fee === minFee;
  }
  return [...rows].sort((a, b) => b.takeHome - a.takeHome || a.fee - b.fee);
}

/**
 * Smallest sale price such that take-home >= target, with other inputs fixed.
 * Returns null if impossible within maxPrice.
 */
export function requiredSalePrice(serviceId, targetTakeHome, rawInput = {}, maxPrice = 1_000_000) {
  const service = SERVICES.find((s) => s.id === serviceId);
  if (!service) return null;
  const target = Math.floor(Number(targetTakeHome));
  if (!Number.isFinite(target)) return null;
  const base = { ...rawInput };
  let lo = 0;
  let hi = maxPrice;
  let found = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const take = rowFor(service, { ...base, salePrice: mid }).takeHome;
    if (take >= target) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return found;
}

export const PRESET_PRICES = [500, 1000, 1980, 3000, 10000];

export function snapshotTable(prices = PRESET_PRICES, rawInput = {}) {
  return prices.map((price) => ({
    price,
    rows: compare({ ...rawInput, salePrice: price, buyerShipping: 0 }),
  }));
}
