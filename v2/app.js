import { calculate, formatFeet, formatMoney } from "../src/calculator.js";

// Shopify variant IDs — replace with live values before launch
const VARIANTS = {
  single:    { variantId: 44080581017818, price: 189 },
  double:    { variantId: 44080581050586, price: 219 },
  oversized: { variantId: 44608816218330, price: 269 },
  multi50:   { variantId: 44633975587034, price: 399 },
  multi62:   { variantId: 44633975619802, price: 399 },
  ds_tape:   { variantId: 44633975652570, price: 19.99 }
};

const KIT_ICONS = {
  single:    "ti-door",
  double:    "ti-door",
  oversized: "ti-building-warehouse",
  multi50:   "ti-building-factory-2",
  multi62:   "ti-building-factory-2",
  bundle:    "ti-building-factory-2",
  custom:    "ti-tool"
};

let doors = [];
let cartItems = [];
let idCounter = 0;

// ── Door management ──────────────────────────────────────────────

function addDoor() {
  const w = parseFloat(document.getElementById("d-w").value);
  const h = parseFloat(document.getElementById("d-h").value);
  const qty = Math.max(1, parseInt(document.getElementById("d-qty").value) || 1);
  if (!w || !h || w <= 0 || h <= 0) return;
  doors.push({ id: ++idCounter, width: w, height: h, qty });
  document.getElementById("d-w").value = "";
  document.getElementById("d-h").value = "";
  document.getElementById("d-qty").value = "1";
  renderDoors();
}

function removeDoor(id) {
  doors = doors.filter((d) => d.id !== id);
  renderDoors();
}

function renderDoors() {
  const chips = document.getElementById("door-chips");
  const status = document.getElementById("door-status");
  const calcBtn = document.getElementById("calc-btn");

  chips.innerHTML = doors
    .map(
      (d) =>
        `<div class="chip">
          <i class="ti ti-door" style="font-size:13px;opacity:.6"></i>
          <span><strong>${d.qty}x</strong> ${d.width}' W &times; ${d.height}' H</span>
          <button class="chip-x" onclick="removeDoor(${d.id})" aria-label="Remove">&times;</button>
        </div>`
    )
    .join("");

  if (doors.length === 0) {
    status.className = "dstatus warn-none";
    status.innerHTML =
      '<i class="ti ti-door" style="font-size:14px"></i><span>No doors added — enter at least one door above.</span>';
    calcBtn.disabled = true;
  } else {
    const total = doors.reduce((s, d) => s + d.qty, 0);
    status.className = "dstatus has-doors";
    status.innerHTML =
      `<i class="ti ti-circle-check-filled" style="font-size:16px"></i>` +
      `<span>${total} door${total === 1 ? "" : "s"} ready — hit <strong>Get Recommendation</strong></span>`;
    calcBtn.disabled = false;
  }
}

// ── Calculation ──────────────────────────────────────────────────

function doCalculate() {
  if (!doors.length) return;

  const rows = doors.map((d) => ({ width: d.width, height: d.height, qty: d.qty }));
  const result = calculate(rows);
  renderResults(result);

  document.getElementById("results").classList.remove("hidden");
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Results rendering ────────────────────────────────────────────

function renderResults(result) {
  const plan = result.recommendation.primaryPlan;
  const alts = result.recommendation.alternatives;
  const warnings = result.recommendation.warnings;
  const mm = result.materialMath;

  // Kit card
  document.getElementById("r-kit-name").textContent = plan.label;
  document.getElementById("r-kit-why").textContent = kitWhyText(plan, mm);
  document.getElementById("r-doors").textContent = mm.totalDoorCount;
  document.getElementById("r-sqft").textContent = mm.totalArea.toLocaleString();
  document.getElementById("r-lf").textContent =
    plan.requiredLinearFeet !== null ? Math.round(plan.requiredLinearFeet) + "'" : "Custom";
  document.getElementById("r-price").textContent =
    plan.estimatedPrice !== null ? formatMoney(plan.estimatedPrice) : "Contact";

  // Alternatives
  const altsEl = document.getElementById("r-alts");
  if (alts.length) {
    altsEl.classList.remove("hidden");
    altsEl.innerHTML =
      `<strong>Alternatives:</strong> ` +
      alts
        .map((a) => `${a.label} (${a.estimatedPrice !== null ? formatMoney(a.estimatedPrice) : "custom"})`)
        .join("; ");
  } else {
    altsEl.classList.add("hidden");
  }

  // Warnings
  const warnEl = document.getElementById("r-warnings");
  if (warnings.length) {
    warnEl.classList.remove("hidden");
    warnEl.innerHTML = warnings.map((w) => `<div class="warn-box">${w}</div>`).join("");
  } else {
    warnEl.classList.add("hidden");
  }

  // Build cart items
  buildCartItems(plan, result);

  // Materials sub-header
  const total = doors.reduce((s, d) => s + d.qty, 0);
  document.getElementById("r-mat-sub").textContent =
    `${total} door${total === 1 ? "" : "s"} · ${cartItems.length} item${cartItems.length === 1 ? "" : "s"}`;

  // Render material list
  renderMatList();
}

function kitWhyText(plan, mm) {
  if (plan.family === "custom") {
    return "Your door layout requires a custom roll. Use the footage math below to request a quote from BlueTex.";
  }
  if (plan.items.some((i) => i.family.startsWith("multi"))) {
    const spare = plan.spareLinearFeet !== null && plan.spareLinearFeet >= 0
      ? ` with ${Math.round(plan.spareLinearFeet)}' linear footage to spare`
      : "";
    return `Recommended because a multi-door kit covers all ${mm.totalDoorCount} doors in one order at the best value${spare}.`;
  }
  if (plan.kitCount === 1) {
    return `One kit covers your layout. ${plan.spareCapacity !== null ? Math.round(plan.spareCapacity) + " sq ft of spare coverage included." : ""}`;
  }
  return `Your layout spans multiple kits. This combination is the lowest-cost valid option for your doors.`;
}

function buildCartItems(plan, result) {
  cartItems = [];
  let totalCost = 0;

  for (const item of plan.items) {
    const variant = VARIANTS[item.family];
    if (!variant) continue;
    const subtotal = variant.price * item.quantity;
    cartItems.push({
      variantId: variant.variantId,
      qty: item.quantity,
      price: variant.price,
      label: item.label,
      sub: kitSub(item, result),
      icon: KIT_ICONS[item.family] || "ti-package"
    });
    totalCost += subtotal;
  }

  // Extra double-sided tape if there's a shortfall
  if (result.tapeShortfall > 0) {
    const extraRolls = Math.ceil(result.tapeShortfall / 180);
    const v = VARIANTS.ds_tape;
    cartItems.push({
      variantId: v.variantId,
      qty: extraRolls,
      price: v.price,
      label: `Double-Sided Tape — Extra Roll${extraRolls > 1 ? "s" : ""}`,
      sub: `${Math.round(result.tapeShortfall)}' shortfall · 180' per roll`,
      icon: "ti-receipt-2"
    });
    totalCost += v.price * extraRolls;
  }

  document.getElementById("r-total-price").textContent = `Est. Total: ${formatMoney(totalCost)}`;
}

function kitSub(item, result) {
  const plan = result.recommendation.primaryPlan;
  if (plan.requiredLinearFeet !== null) {
    return `${Math.round(plan.requiredLinearFeet / item.quantity)}' linear ft needed per kit`;
  }
  return "";
}

function renderMatList() {
  document.getElementById("mat-list").innerHTML = cartItems
    .map(
      (item, i) => `
      <div class="mat-item">
        <div class="mat-thumb"><i class="ti ${item.icon}"></i></div>
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
    )
    .join("");
}

// ── Cart actions ─────────────────────────────────────────────────

function fmt(n) {
  return "$" + n.toFixed(2);
}

function updateQty(idx, val) {
  const qty = Math.max(1, parseInt(val) || 1);
  document.getElementById(`qty-${idx}`).value = qty;
  cartItems[idx].qty = qty;
  const priceEl = document.getElementById(`mp-${idx}`);
  if (priceEl) {
    priceEl.innerHTML = `${fmt(cartItems[idx].price)} ea &nbsp;·&nbsp; <strong>${fmt(cartItems[idx].price * qty)}</strong>`;
  }
  // Recalculate total
  const total = cartItems.reduce((s, it, i) => {
    const q = parseInt(document.getElementById(`qty-${i}`)?.value) || it.qty;
    return s + it.price * q;
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ id: item.variantId, quantity: qty }] })
  })
    .then(() => {
      btn.textContent = "Added ✓";
      btn.className = "atc-btn done";
    })
    .catch(() => {
      btn.textContent = "Added ✓";
      btn.className = "atc-btn done";
    });
}

function addAllToCart() {
  const btn = document.getElementById("add-all-btn");
  btn.textContent = "Adding…";
  btn.disabled = true;
  const items = cartItems.map((item, i) => ({
    id: item.variantId,
    quantity: parseInt(document.getElementById(`qty-${i}`)?.value) || item.qty
  }));
  fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  })
    .then(() => { window.location.href = "/cart"; })
    .catch(() => {
      btn.textContent = "✓ All Items Added";
      setTimeout(() => {
        btn.textContent = "Add All To Cart";
        btn.disabled = false;
      }, 2200);
    });
}

// Expose to inline onclick handlers
window.addDoor = addDoor;
window.removeDoor = removeDoor;
window.doCalculate = doCalculate;
window.updateQty = updateQty;
window.addToCart = addToCart;
window.addAllToCart = addAllToCart;

// Allow Enter key to add door
["d-w", "d-h", "d-qty"].forEach((id) => {
  document.getElementById(id)?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDoor();
  });
});
