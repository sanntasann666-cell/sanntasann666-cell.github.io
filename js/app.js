import {
  CHECKED,
  SOURCES,
  RAKUMA_TIERS,
  SERVICES,
  compare,
  requiredSalePrice,
  rowFor,
  snapshotTable,
  PRESET_PRICES,
} from "./fees.js";

const yen = (n) =>
  (n < 0 ? "−" : "") + "¥" + Math.abs(n).toLocaleString("ja-JP");
const pct = (r) => (r * 100).toFixed(1) + "%";

const $ = (id) => document.getElementById(id);

function readInput() {
  return {
    salePrice: Number($("salePrice").value),
    buyerShipping: Number($("buyerShipping").value),
    sellerShipping: Number($("sellerShipping").value),
    cogs: Number($("cogs").value),
    rakumaRate: Number($("rakumaRate").value),
    boothMode: document.querySelector(".seg [aria-pressed='true']")?.dataset.mode || "download",
  };
}

function renderTable(rows) {
  const body = rows
    .map((r) => {
      const badge = r.bestTakeHome ? '<span class="badge">手取り最大</span>' : "";
      return `<tr class="${r.bestTakeHome ? "best" : ""}">
        <td><span class="name">${r.name}</span>${badge}<span class="sub">${r.note}</span></td>
        <td class="num">${yen(r.fee)}</td>
        <td class="num">${pct(r.feeRate)}</td>
        <td class="num">${yen(r.takeHome)}</td>
      </tr>`;
    })
    .join("");
  $("resultBody").innerHTML = body;
  const best = rows.find((r) => r.bestTakeHome) || rows[0];
  const worstFee = rows.reduce((a, b) => (a.fee <= b.fee ? a : b));
  $("bestName").textContent = best ? best.name : "—";
  $("bestTake").textContent = best ? yen(best.takeHome) : "—";
  $("lowFeeName").textContent = worstFee ? worstFee.name : "—";
  $("lowFeeVal").textContent = worstFee ? yen(worstFee.fee) : "—";
}

function renderSnapshot() {
  const input = readInput();
  const snaps = snapshotTable(PRESET_PRICES, input);
  const head =
    "<thead><tr><th>販売価格</th>" +
    SERVICES.map((s) => `<th>${s.name}<br>手数料 / 手取り</th>`).join("") +
    "</tr></thead>";
  const body = snaps
    .map((snap) => {
      const byId = Object.fromEntries(snap.rows.map((r) => [r.id, r]));
      const cells = SERVICES.map((s) => {
        const r = byId[s.id];
        const cls = r.bestTakeHome ? ' class="best"' : "";
        return `<td class="num"${cls}>${yen(r.fee)}<br>${yen(r.takeHome)}</td>`;
      }).join("");
      return `<tr><td class="num">${yen(snap.price)}</td>${cells}</tr>`;
    })
    .join("");
  $("snapTable").innerHTML = head + "<tbody>" + body + "</tbody>";
}

function renderInverse() {
  const target = Number($("targetTake").value);
  const serviceId = $("inverseService").value;
  const input = readInput();
  const price = requiredSalePrice(serviceId, target, input);
  const el = $("inverseOut");
  if (target === 0 || !Number.isFinite(target)) {
    el.textContent = "希望する手取りを入力してください。";
    return;
  }
  if (price == null) {
    el.textContent = "100万円以内では、その手取りに届く販売価格が見つかりませんでした。";
    return;
  }
  const service = SERVICES.find((s) => s.id === serviceId);
  const row = rowFor(service, { ...input, salePrice: price });
  el.innerHTML =
    `${service.name}で手取り ${yen(target)} 以上にするには、販売価格 <strong>${yen(price)}</strong> が必要です。` +
    ` そのときの手数料は ${yen(row.fee)}、手取りは ${yen(row.takeHome)} です。` +
    `（購入者送料・自己負担・仕入は左の入力値を使っています）`;
}

function render() {
  const input = readInput();
  renderTable(compare(input));
  renderSnapshot();
  renderInverse();
}

function setMode(mode) {
  document.querySelectorAll(".seg button").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === mode));
  });
  render();
}

function init() {
  $("checked").textContent = "料率の確認日 " + CHECKED + "（JST）";
  const rakuma = $("rakumaRate");
  rakuma.innerHTML = RAKUMA_TIERS.map(
    (t) =>
      `<option value="${t.rate}">${t.label}　（販売 ${t.sales} かつ ${t.amount}）</option>`
  ).join("");
  $("inverseService").innerHTML = SERVICES.map(
    (s) => `<option value="${s.id}">${s.name}</option>`
  ).join("");

  $("sources").innerHTML = SOURCES.map(
    (s) =>
      `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a> — ${s.note}</li>`
  ).join("");

  const form = $("inputs");
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  document.querySelectorAll(".seg button").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("salePrice").value = btn.dataset.preset;
      render();
    });
  });
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((b) =>
        b.setAttribute("aria-selected", String(b === btn))
      );
      document.querySelectorAll(".pane").forEach((p) => {
        p.hidden = p.id !== btn.dataset.pane;
      });
    });
  });
  $("useResultAsPrice")?.addEventListener("click", () => {
    const target = Number($("targetTake").value);
    const price = requiredSalePrice($("inverseService").value, target, readInput());
    if (price != null) {
      $("salePrice").value = price;
      render();
    }
  });
  render();
}

init();
