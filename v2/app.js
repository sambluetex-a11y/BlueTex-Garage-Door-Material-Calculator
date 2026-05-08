import { calculate, formatFeet, formatMoney } from "../src/calculator.js";

// ── Shopify variant IDs — replace with live values before launch ──
const VARIANTS = {
  single:    { variantId: 44080581017818, price: 189 },
  double:    { variantId: 44080581050586, price: 219 },
  oversized: { variantId: 44608816218330, price: 269 },
  multi50:   { variantId: 44633975587034, price: 399 },
  multi62:   { variantId: 44633975619802, price: 399 },
  ds_tape:   { variantId: 44633975652570, price: 19.99 }
};

// ── State ──────────────────────────────────────────────────────────
let doors = [];        // { id, width, height, qty }
let calcResult = null;
let cartItems = [];
let idCounter = 0;

// ── Helpers ────────────────────────────────────────────────────────
function fmt(n) { return "$" + Number(n).toFixed(2); }
function niceSize(w, h) { return `${w}' W × ${h}' H`; }

// ── Door management ────────────────────────────────────────────────

function addDoor() {
  const w   = parseFloat(document.getElementById("d-w").value);
  const h   = parseFloat(document.getElementById("d-h").value);
  const qty = Math.max(1, parseInt(document.getElementById("d-qty").value) || 1);
  if (!w || !h || w <= 0 || h <= 0) return;
  doors.push({ id: ++idCounter, width: w, height: h, qty });
  document.getElementById("d-w").value = "";
  document.getElementById("d-h").value = "";
  document.getElementById("d-qty").value = "1";
  renderDoors();
  updateInstallDiagrams();
}

function removeDoor(id) {
  doors = doors.filter(d => d.id !== id);
  renderDoors();
  updateInstallDiagrams();
}

function renderDoors() {
  const chipsEl   = document.getElementById("door-chips");
  const statusEl  = document.getElementById("door-status");
  const calcBtn   = document.getElementById("calc-btn");
  const printBtn  = document.getElementById("print-btn");

  // chip list
  chipsEl.innerHTML = doors.map(d => {
    const lf = Math.ceil(d.height / 4) * d.width;
    const strips = Math.ceil(d.height / 4);
    return `
      <div class="chip">
        <i class="ti ti-door chip-icon"></i>
        <span class="chip-label">
          <strong>${d.qty}×</strong> ${niceSize(d.width, d.height)}
        </span>
        <span class="chip-sub">${strips} strip${strips !== 1 ? "s" : ""} · ${lf * d.qty}' linear ft</span>
        <button class="chip-rm" onclick="removeDoor(${d.id})" aria-label="Remove">×</button>
      </div>`;
  }).join("");

  // status bar
  if (doors.length === 0) {
    statusEl.className = "door-status warn";
    statusEl.innerHTML = `<i class="ti ti-alert-circle" style="font-size:15px"></i>
      <span>No doors entered — add at least one door above.</span>`;
    calcBtn.disabled = true;
    printBtn.disabled = true;
  } else {
    const total = doors.reduce((s, d) => s + d.qty, 0);
    statusEl.className = "door-status ok";
    statusEl.innerHTML = `<i class="ti ti-circle-check-filled" style="font-size:16px"></i>
      <span>${total} door${total !== 1 ? "s" : ""} entered — click <strong>Get My Recommendation</strong> when ready.</span>`;
    calcBtn.disabled = false;
  }
}

// ── SVG Door Diagram ───────────────────────────────────────────────

function tapeStripCount(widthFt) {
  // Matches calculator.js: Math.ceil(width*12 / 18) + 1
  return Math.ceil((widthFt * 12) / 18) + 1;
}

function buildDoorSVG(widthFt, heightFt) {
  const STRIP_H_FT   = 4;      // each horizontal run covers ~4 ft of height
  const nStrips  = Math.ceil(heightFt / STRIP_H_FT);
  const nTapes   = tapeStripCount(widthFt);

  // Coordinate system
  const ML = 58, MT = 34, MR = 58, MB = 28;
  const MAX_W = 476, MAX_H = 310;
  const scale  = Math.min(MAX_W / widthFt, MAX_H / heightFt);
  const drawW  = Math.round(scale * widthFt);
  const drawH  = Math.round(scale * heightFt);
  const svgW   = drawW + ML + MR;
  const svgH   = drawH + MT + MB;
  const stripH = drawH / nStrips;

  let s = `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${svgW} ${svgH}" width="100%"
    style="max-width:${svgW}px;display:block;margin:0 auto"
    role="img" aria-label="Install diagram for ${widthFt}' × ${heightFt}' door">`;

  // ── Strip backgrounds ──
  for (let i = 0; i < nStrips; i++) {
    const y       = MT + i * stripH;
    const fill    = i % 2 === 0 ? "#EEF2FF" : "#DBEAFE";
    const actualH = Math.min(STRIP_H_FT, heightFt - i * STRIP_H_FT);
    s += `<rect x="${ML}" y="${y.toFixed(1)}" width="${drawW}" height="${stripH.toFixed(1)}" fill="${fill}"/>`;

    // Strip label — left side outside door
    const ly = y + stripH / 2 + 4;
    s += `<text x="${ML - 7}" y="${ly.toFixed(1)}"
      font-size="11" font-family="Lato,sans-serif" fill="#535254"
      text-anchor="end">Strip ${i + 1}</text>`;

    // Strip height annotation — right side, for partial last strip
    if (i === nStrips - 1 && actualH < STRIP_H_FT) {
      s += `<text x="${ML + drawW + 6}" y="${ly.toFixed(1)}"
        font-size="10" font-family="Lato,sans-serif" fill="#535254">${actualH}'</text>`;
    }
  }

  // ── Tape lines (vertical dashed blue) ──
  for (let t = 0; t < nTapes; t++) {
    const x = ML + (t / (nTapes - 1)) * drawW;
    s += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + drawH}"
      stroke="#0011a7" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.55"/>`;

    // Tape spacing label on first gap
    if (t === 0 && nTapes > 1) {
      const x2 = ML + (1 / (nTapes - 1)) * drawW;
      const midX = (x + x2) / 2;
      const spacingIn = Math.round((widthFt * 12) / (nTapes - 1));
      s += `<text x="${midX.toFixed(1)}" y="${MT + drawH + 18}"
        font-size="9" font-family="Lato,sans-serif" fill="#0011a7" text-anchor="middle"
        opacity="0.8">${spacingIn}"</text>`;
      // tick marks
      s += `<line x1="${x.toFixed(1)}" y1="${MT + drawH + 6}" x2="${x.toFixed(1)}" y2="${MT + drawH + 10}"
        stroke="#0011a7" stroke-width="1" opacity="0.5"/>`;
      s += `<line x1="${x2.toFixed(1)}" y1="${MT + drawH + 6}" x2="${x2.toFixed(1)}" y2="${MT + drawH + 10}"
        stroke="#0011a7" stroke-width="1" opacity="0.5"/>`;
      s += `<line x1="${x.toFixed(1)}" y1="${MT + drawH + 8}" x2="${x2.toFixed(1)}" y2="${MT + drawH + 8}"
        stroke="#0011a7" stroke-width="1" opacity="0.5"/>`;
    }
  }

  // ── Door outline ──
  s += `<rect x="${ML}" y="${MT}" width="${drawW}" height="${drawH}"
    fill="none" stroke="#1b1b1b" stroke-width="2"/>`;

  // ── Horizontal strip dividers ──
  for (let i = 1; i < nStrips; i++) {
    const y = (MT + i * stripH).toFixed(1);
    s += `<line x1="${ML}" y1="${y}" x2="${ML + drawW}" y2="${y}"
      stroke="#0011a7" stroke-width="1" opacity="0.35"/>`;
  }

  // ── Width annotation (top) ──
  const awY = MT - 14;
  s += `<line x1="${ML}" y1="${awY}" x2="${ML + drawW}" y2="${awY}" stroke="#1b1b1b" stroke-width="1"/>`;
  s += `<line x1="${ML}" y1="${awY - 4}" x2="${ML}" y2="${awY + 4}" stroke="#1b1b1b" stroke-width="1"/>`;
  s += `<line x1="${ML + drawW}" y1="${awY - 4}" x2="${ML + drawW}" y2="${awY + 4}" stroke="#1b1b1b" stroke-width="1"/>`;
  s += `<text x="${(ML + drawW / 2).toFixed(1)}" y="${awY - 5}"
    font-size="12" font-weight="700" font-family="Lato,sans-serif"
    fill="#1b1b1b" text-anchor="middle">${widthFt}' wide</text>`;

  // ── Height annotation (right) ──
  const ahX = ML + drawW + 14;
  s += `<line x1="${ahX}" y1="${MT}" x2="${ahX}" y2="${MT + drawH}" stroke="#1b1b1b" stroke-width="1"/>`;
  s += `<line x1="${ahX - 4}" y1="${MT}" x2="${ahX + 4}" y2="${MT}" stroke="#1b1b1b" stroke-width="1"/>`;
  s += `<line x1="${ahX - 4}" y1="${MT + drawH}" x2="${ahX + 4}" y2="${MT + drawH}" stroke="#1b1b1b" stroke-width="1"/>`;
  s += `<text x="${ahX + 7}" y="${(MT + drawH / 2 + 4).toFixed(1)}"
    font-size="12" font-weight="700" font-family="Lato,sans-serif"
    fill="#1b1b1b" text-anchor="start">${heightFt}' tall</text>`;

  s += `</svg>`;
  return s;
}

// ── Update install diagrams (called on every door add/remove) ──────

function updateInstallDiagrams() {
  const diagramsEl = document.getElementById("s3-diagrams");
  const emptyEl    = document.getElementById("s3-empty");
  const stepsEl    = document.getElementById("s3-steps");

  if (doors.length === 0) {
    emptyEl.classList.remove("hidden");
    diagramsEl.classList.add("hidden");
    stepsEl.classList.add("hidden");
    document.getElementById("print-btn").disabled = true;
    return;
  }

  emptyEl.classList.add("hidden");
  diagramsEl.classList.remove("hidden");
  stepsEl.classList.remove("hidden");

  // Unique door sizes
  const seen = new Map();
  for (const d of doors) {
    const key = `${d.width}x${d.height}`;
    if (!seen.has(key)) seen.set(key, { width: d.width, height: d.height, totalQty: 0 });
    seen.get(key).totalQty += d.qty;
  }

  diagramsEl.innerHTML = [...seen.values()].map(door => {
    const { width, height, totalQty } = door;
    const nStrips   = Math.ceil(height / 4);
    const nTapes    = tapeStripCount(width);
    const lfPerDoor = Math.ceil(height / 4) * width;
    const totalLf   = lfPerDoor * totalQty;

    return `
      <div class="diagram-card">
        <div class="diagram-card-hdr">
          <h3>${niceSize(width, height)}</h3>
          <div class="diagram-stats">
            <span class="dstat"><strong>${nStrips}</strong> horizontal strip${nStrips !== 1 ? "s" : ""}</span>
            <span class="dstat"><strong>${nTapes}</strong> tape strips</span>
            <span class="dstat"><strong>${lfPerDoor}'</strong> linear ft / door</span>
            ${totalQty > 1 ? `<span class="dstat"><strong>${totalLf}'</strong> total (${totalQty} doors)</span>` : ""}
          </div>
        </div>
        <div class="diagram-svg-wrap">${buildDoorSVG(width, height)}</div>
        <div class="diagram-legend">
          <span class="legend-item">
            <span class="legend-swatch-strip"></span>
            Horizontal BlueTex strip (~4' each)
          </span>
          <span class="legend-item">
            <span class="legend-swatch-tape-box">
              <span style="display:inline-block;width:1.5px;height:14px;background:#0011a7;opacity:.6"></span>
              <span style="display:inline-block;width:1.5px;height:14px;background:#0011a7;opacity:.6;margin-left:3px"></span>
            </span>
            Vertical double-sided tape (~18" apart)
          </span>
        </div>
      </div>`;
  }).join("");
}

// ── Calculation ────────────────────────────────────────────────────

function doCalculate() {
  if (!doors.length) return;
  const rows = doors.map(d => ({ width: d.width, height: d.height, qty: d.qty }));
  calcResult = calculate(rows);
  renderRecommendation(calcResult);
  renderMaterials(calcResult);
  document.getElementById("print-btn").disabled = false;

  // Scroll to recommendation
  document.getElementById("s2").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Render recommendation (Step 2) ────────────────────────────────

function renderRecommendation(result) {
  const plan     = result.recommendation.primaryPlan;
  const alts     = result.recommendation.alternatives;
  const warnings = result.recommendation.warnings;
  const mm       = result.materialMath;

  document.getElementById("s2-empty").classList.add("hidden");
  document.getElementById("s2-content").classList.remove("hidden");

  document.getElementById("r-kit-name").textContent  = plan.label;
  document.getElementById("r-kit-why").textContent   = kitWhyText(plan, mm);
  document.getElementById("r-doors").textContent     = mm.totalDoorCount;
  document.getElementById("r-sqft").textContent      = mm.totalArea.toLocaleString();
  document.getElementById("r-lf").textContent        =
    plan.requiredLinearFeet !== null ? Math.round(plan.requiredLinearFeet) + "'" : "Custom";
  document.getElementById("r-price").textContent     =
    plan.estimatedPrice !== null ? formatMoney(plan.estimatedPrice) : "Contact";

  // Alternatives
  const altsEl = document.getElementById("r-alts");
  if (alts.length) {
    altsEl.classList.remove("hidden");
    altsEl.innerHTML = `<strong>Alternatives:</strong> ` +
      alts.map(a =>
        `${a.label} (${a.estimatedPrice !== null ? formatMoney(a.estimatedPrice) : "custom"})`
      ).join("; ");
  } else {
    altsEl.classList.add("hidden");
  }

  // Warnings
  const warnEl = document.getElementById("r-warnings");
  warnEl.innerHTML = warnings.map(w =>
    `<div class="warn-box"><strong>Note:</strong> ${w}</div>`
  ).join("");
}

function kitWhyText(plan, mm) {
  if (plan.family === "custom") {
    return "Your door layout needs a custom roll. Use the footage numbers below to request a quote from BlueTex.";
  }
  const isMulti = plan.items.some(i => i.family.startsWith("multi"));
  if (isMulti) {
    const spare = plan.spareLinearFeet !== null && plan.spareLinearFeet >= 0
      ? ` — ${Math.round(plan.spareLinearFeet)}' of linear footage to spare.`
      : ".";
    return `A multi-door kit covers all ${mm.totalDoorCount} doors in one order at the best value${spare}`;
  }
  if (plan.kitCount === 1 && plan.spareCapacity !== null) {
    return `One kit covers your layout with ${Math.round(plan.spareCapacity)} sq ft of spare coverage built in.`;
  }
  return `Your layout spans multiple kits. This combination is the lowest-cost valid option for your doors.`;
}

// ── Render materials list (Step 4) ────────────────────────────────

function renderMaterials(result) {
  const plan = result.recommendation.primaryPlan;
  cartItems  = [];
  let total  = 0;

  for (const item of plan.items) {
    const v = VARIANTS[item.family];
    if (!v) continue;
    cartItems.push({
      variantId: v.variantId,
      qty:       item.quantity,
      price:     v.price,
      label:     item.label,
      sub:       kitSubLine(item, plan),
      icon:      "ti-package"
    });
    total += v.price * item.quantity;
  }

  // Extra double-sided tape if there's a shortfall
  if (result.tapeShortfall > 0) {
    const extra = Math.ceil(result.tapeShortfall / 180);
    const v = VARIANTS.ds_tape;
    cartItems.push({
      variantId: v.variantId,
      qty:   extra,
      price: v.price,
      label: `Double-Sided Tape — Extra Roll${extra > 1 ? "s" : ""}`,
      sub:   `${Math.round(result.tapeShortfall)}' of tape not covered by kit`,
      icon:  "ti-roll"
    });
    total += v.price * extra;
  }

  document.getElementById("s4-empty").classList.add("hidden");
  document.getElementById("s4-content").classList.remove("hidden");
  document.getElementById("r-total-price").textContent = `Est. Total: ${formatMoney(total)}`;

  document.getElementById("mat-list").innerHTML = cartItems.map((item, i) => `
    <div class="mat-item">
      <div class="mat-icon"><i class="ti ${item.icon}"></i></div>
      <div class="mat-info">
        <div class="mat-name">${item.label}</div>
        ${item.sub ? `<div class="mat-sub">${item.sub}</div>` : ""}
        <div class="mat-price" id="mp-${i}">${fmt(item.price)} ea &nbsp;·&nbsp; <strong>${fmt(item.price * item.qty)}</strong></div>
      </div>
      <div class="mat-right">
        <input type="number" class="qty-inp" id="qty-${i}" value="${item.qty}" min="1"
          onchange="updateQty(${i}, this.value)" aria-label="Quantity">
        <button class="atc-btn" id="atc-${i}" onclick="addToCart(${i})">Add to Cart</button>
      </div>
    </div>`
  ).join("");
}

function kitSubLine(item, plan) {
  if (plan.requiredLinearFeet !== null && item.quantity > 0) {
    const lf = Math.round(plan.requiredLinearFeet / item.quantity);
    return `~${lf}' linear footage used`;
  }
  return "";
}

// ── Cart actions ───────────────────────────────────────────────────

function updateQty(idx, val) {
  const qty = Math.max(1, parseInt(val) || 1);
  document.getElementById(`qty-${idx}`).value = qty;
  cartItems[idx].qty = qty;
  const pe = document.getElementById(`mp-${idx}`);
  if (pe) pe.innerHTML = `${fmt(cartItems[idx].price)} ea &nbsp;·&nbsp; <strong>${fmt(cartItems[idx].price * qty)}</strong>`;
  const total = cartItems.reduce((s, item, i) => {
    const q = parseInt(document.getElementById(`qty-${i}`)?.value) || item.qty;
    return s + item.price * q;
  }, 0);
  document.getElementById("r-total-price").textContent = `Est. Total: ${formatMoney(total)}`;
}

function addToCart(idx) {
  const item = cartItems[idx];
  if (!item) return;
  const qty = parseInt(document.getElementById(`qty-${idx}`).value) || item.qty;
  const btn = document.getElementById(`atc-${idx}`);
  btn.textContent = "Adding…";
  btn.disabled = true;
  fetch("/cart/add.js", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ items: [{ id: item.variantId, quantity: qty }] })
  })
    .then(() => { btn.textContent = "Added ✓"; btn.className = "atc-btn done"; })
    .catch(() => { btn.textContent = "Added ✓"; btn.className = "atc-btn done"; });
}

function addAllToCart() {
  const btn   = document.getElementById("add-all-btn");
  btn.textContent = "Adding…";
  btn.disabled    = true;
  const items = cartItems.map((item, i) => ({
    id:       item.variantId,
    quantity: parseInt(document.getElementById(`qty-${i}`)?.value) || item.qty
  }));
  fetch("/cart/add.js", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ items })
  })
    .then(() => { window.location.href = "/cart"; })
    .catch(() => {
      btn.textContent = "✓ All Items Added";
      setTimeout(() => { btn.textContent = "Add All To Cart"; btn.disabled = false; }, 2200);
    });
}

// ── Print guide ────────────────────────────────────────────────────

function printGuide() {
  // Set date
  document.getElementById("p-date").textContent =
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Doors list
  const doorGroups = new Map();
  for (const d of doors) {
    const key = `${d.width}x${d.height}`;
    const g = doorGroups.get(key) || { width: d.width, height: d.height, qty: 0 };
    g.qty += d.qty;
    doorGroups.set(key, g);
  }
  document.getElementById("p-doors").innerHTML = [...doorGroups.values()].map(g => {
    const strips = Math.ceil(g.height / 4);
    const tapes  = tapeStripCount(g.width);
    const lf     = strips * g.width;
    return `<p class="p-door-row">
      <strong>${g.qty}×</strong> ${niceSize(g.width, g.height)}
      &nbsp;—&nbsp; ${strips} strip${strips !== 1 ? "s" : ""},
      ${tapes} tape strips, ${lf}' linear ft per door
    </p>`;
  }).join("");

  // Kit recommendation
  if (calcResult) {
    const plan = calcResult.recommendation.primaryPlan;
    document.getElementById("p-kit-name").textContent =
      plan.label + (plan.estimatedPrice !== null ? "" : " — Custom Quote");
    document.getElementById("p-kit-price").textContent =
      plan.estimatedPrice !== null ? `Estimated: ${formatMoney(plan.estimatedPrice)}` : "Contact BlueTex for pricing";
  } else {
    document.getElementById("p-kit-name").textContent = "Calculate to see recommendation";
    document.getElementById("p-kit-price").textContent = "";
  }

  // Print diagrams (one per unique size)
  document.getElementById("p-diagrams").innerHTML = [...doorGroups.values()].map(g => {
    const strips   = Math.ceil(g.height / 4);
    const tapes    = tapeStripCount(g.width);
    const lf       = strips * g.width;
    const stripRows = Array.from({ length: strips }, (_, i) => {
      const h = Math.min(4, g.height - i * 4);
      return `Strip ${i + 1}: ${h}' tall × ${g.width}' wide = ${h * g.width} sq ft`;
    });
    return `
      <div class="p-diag-block">
        <p class="p-diag-title">${niceSize(g.width, g.height)} — ${g.qty} door${g.qty !== 1 ? "s" : ""}</p>
        ${buildDoorSVG(g.width, g.height)}
        <p style="font-size:12px;color:#535254;margin-top:8px">
          ${strips} horizontal strip${strips !== 1 ? "s" : ""} &nbsp;·&nbsp;
          ${tapes} vertical tape strips (~${Math.round((g.width * 12) / (tapes - 1))}" apart) &nbsp;·&nbsp;
          ${lf}' linear ft per door
        </p>
        <p style="font-size:12px;color:#535254;margin-top:4px">${stripRows.join(" | ")}</p>
      </div>`;
  }).join("");

  // Materials checklist
  if (cartItems.length) {
    const lines = cartItems.map((item, i) => {
      const q = parseInt(document.getElementById(`qty-${i}`)?.value) || item.qty;
      return `<div class="p-mat-line">
        <span>□ &nbsp;${q}× ${item.label}</span>
        <span>${fmt(item.price * q)}</span>
      </div>`;
    });
    const total = cartItems.reduce((s, item, i) => {
      const q = parseInt(document.getElementById(`qty-${i}`)?.value) || item.qty;
      return s + item.price * q;
    }, 0);
    lines.push(`<div class="p-total"><span>Estimated Total</span><span>${formatMoney(total)}</span></div>`);
    document.getElementById("p-materials").innerHTML = lines.join("");
  } else {
    document.getElementById("p-materials").innerHTML =
      `<p style="font-size:14px;color:#878688">Calculate your recommendation first to populate this list.</p>`;
  }

  window.print();
}

// ── Expose to onclick handlers ──────────────────────────────────────
window.addDoor      = addDoor;
window.removeDoor   = removeDoor;
window.doCalculate  = doCalculate;
window.updateQty    = updateQty;
window.addToCart    = addToCart;
window.addAllToCart = addAllToCart;
window.printGuide   = printGuide;

// Enter key on inputs adds door
["d-w", "d-h", "d-qty"].forEach(id => {
  document.getElementById(id)?.addEventListener("keydown", e => {
    if (e.key === "Enter") addDoor();
  });
});

// Initial render
renderDoors();
