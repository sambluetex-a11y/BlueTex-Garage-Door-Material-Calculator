import { calculate, formatFeet, formatMoney } from "./calculator.js";

const form = document.querySelector("[data-calculator-form]");
const result = document.querySelector("[data-results]");
const summary = document.querySelector("[data-summary]");
const details = document.querySelector("[data-details]");
const addRowButton = document.querySelector("[data-add-row]");
const calcScrollButton = document.querySelector("[data-calc-scroll]");
const modeButton = document.querySelector("[data-mode-toggle]");
const rowsContainer = document.querySelector("[data-rows]");

const PRODUCT_VARIANTS = {
  single: {
    variantId: 44080581017818,
    title: "Single Door (150 sq ft roll) Kit",
    price: 189,
    img: "https://cdn.shopify.com/s/files/1/0013/9637/5601/files/BlueTex_2mm_50_inch_Garage_Door_Kit_-_1_door_PRICE_fd2ca9da-55b8-4532-804e-459b356c0057.png?v=1775149819"
  },
  double: {
    variantId: 44080581050586,
    title: "Double Door (210 sq ft roll) Kit",
    price: 219,
    img: "https://cdn.shopify.com/s/files/1/0013/9637/5601/files/BlueTex_2mm_50_inch_Garage_Door_Kit_-_2_door_57659585-1183-4c52-acbd-13ec20733a37.png?v=1775149819"
  },
  oversized: {
    variantId: 44608816218330,
    title: "Oversized Door(s) (300 sq ft roll) Kit",
    price: 269,
    img: "https://cdn.shopify.com/s/files/1/0013/9637/5601/files/BlueTex_2mm_50_inch_Garage_Door_Kit_-_OVERSIZED_PRICE_updated_3a6aa0a4-8c33-4087-8744-e52f1c4f82e7.png?v=1775149824"
  },
  multi50: {
    variantId: 47182845870298,
    title: "Multi-Door (50\" wide for 8'/12' tall) Kit",
    price: 399,
    img: "https://cdn.shopify.com/s/files/1/0013/9637/5601/files/BlueTex_2mm_50_inch_Garage_Door_Kit_-_MULTI_DOOR_with_price_8cfb06c4-2736-4c82-94dd-f3e1807640af.png?v=1775149819"
  },
  multi62: {
    variantId: 47064044241114,
    title: "Multi-Door (62\" wide for 10'/15' tall) Kit",
    price: 399,
    img: "https://cdn.shopify.com/s/files/1/0013/9637/5601/files/BlueTex_2mm_62_inch_Garage_Door_Kit_-_MULTI_DOOR_with_price_fc957e2e-0057-4070-b52b-e518859a3a44.png?v=1775149825"
  }
};

let cartItems = [];
let hasCalculated = false;

const defaultRows = [
  { width: 10, height: 10, qty: 2 },
  { width: "", height: "", qty: 1 },
  { width: "", height: "", qty: 1 }
];

function rowTemplate(row, index) {
  return `
    <div class="door-row" data-row>
      <div class="field">
        <label for="width-${index}">Door Width (ft)</label>
        <div class="input-shell">
          <input id="width-${index}" name="width" type="number" min="1" step="0.25" value="${row.width}" inputmode="decimal" aria-label="Door width in feet">
          <span>ft</span>
        </div>
      </div>
      <div class="field">
        <label for="height-${index}">Door Height (ft)</label>
        <div class="input-shell">
          <input id="height-${index}" name="height" type="number" min="1" step="0.25" value="${row.height}" inputmode="decimal" aria-label="Door height in feet">
          <span>ft</span>
        </div>
      </div>
      <div class="field qty-field">
        <label for="qty-${index}">Qty</label>
        <input id="qty-${index}" name="qty" type="number" min="1" step="1" value="${row.qty}" inputmode="numeric" aria-label="Quantity">
      </div>
    </div>
  `;
}

function renderRows(rows = defaultRows) {
  rowsContainer.innerHTML = rows.map(rowTemplate).join("");
}

function readRows() {
  return [...document.querySelectorAll("[data-row]")].map((row) => ({
    width: row.querySelector('[name="width"]').value,
    height: row.querySelector('[name="height"]').value,
    qty: row.querySelector('[name="qty"]').value
  }));
}

function buildCartItems(plan) {
  return plan.items
    .map((item) => {
      const product = PRODUCT_VARIANTS[item.family];
      if (!product) return null;

      return {
        ...product,
        family: item.family,
        label: item.label,
        qty: item.quantity,
        lineTotal: product.price * item.quantity
      };
    })
    .filter(Boolean);
}

function shoppingList(cartItemsForPlan) {
  if (!cartItemsForPlan.length) {
    return `
      <div class="empty-state">
        <i class="ti ti-phone"></i>
        <span><strong>Custom quote needed.</strong> Call BlueTex to finish this order.</span>
      </div>
    `;
  }

  return cartItemsForPlan
    .map(
      (item) => `
        <div class="sli">
          <div class="thumb"><img src="${item.img}" alt=""></div>
          <div class="sli-info">
            <div class="sli-label">${item.title}</div>
            <div class="sli-sub">${item.label}</div>
            <div class="sli-price">${formatMoney(item.price)} each · <strong>${formatMoney(item.lineTotal)}</strong></div>
          </div>
          <div class="sli-qty">Qty ${item.qty}</div>
        </div>
      `
    )
    .join("");
}

function renderEmptyState() {
  cartItems = [];
  summary.innerHTML = `
    <section class="res-panel">
      <div class="res-ph">
        <div class="snum">2</div>
        <p class="rpt">Kit Recommendation</p>
        <span class="rsep">—</span>
        <p class="rps">Waiting On Door Size</p>
      </div>
      <div class="empty-state">
        <i class="ti ti-door"></i>
        <span><strong>Enter at least one door size.</strong> Results will update here.</span>
      </div>
    </section>
  `;
  details.innerHTML = "";
}

function renderResults(model) {
  if (
    !model.materialMath.totalDoorCount ||
    !model.recommendation?.primaryPlan
  ) {
    renderEmptyState();
    return;
  }

  const best = model.recommendation.primaryPlan;
  const priceText =
    best.estimatedPrice === null
      ? "Contact for custom sizing"
      : `${formatMoney(best.estimatedPrice)} estimated kit price`;
  const spareText =
    best.spareLinearFeet === null
      ? "Use the footage below for custom quoting"
      : best.spareLinearFeet >= 0
        ? `${formatFeet(best.spareLinearFeet)} spare material in this recommendation`
        : "Selected by product-family coverage limits";
  const tapeStatus =
    model.tapeShortfall > 0
      ? `<span class="status warn">Add tape recommended</span>`
      : `<span class="status ok">Included tape covers this layout</span>`;
  cartItems = buildCartItems(best);

  summary.innerHTML = `
    <section class="res-panel" id="results-start">
      <div class="res-ph">
        <div class="snum">2</div>
        <p class="rpt">Kit Recommendation</p>
        <span class="rsep">—</span>
        <p class="rps">${best.label}</p>
      </div>
      <div class="res-pb">
        <div class="hero-result">
          <div>
            <p class="tiny-label">Recommended Kit Plan</p>
            <p class="big-value">${best.label}</p>
            <small class="ps">${priceText}</small>
          </div>
          <div class="callout">
            <p class="tiny-label">Layout Footage</p>
            <p class="big-value">${formatFeet(best.requiredLinearFeet)}</p>
            <small>${spareText}</small>
          </div>
        </div>
        <div class="sum-row"><span class="sk">Door Coverage</span><span class="sv">${model.materialMath.totalDoorCount} door${model.materialMath.totalDoorCount === 1 ? "" : "s"} · ${Math.round(model.materialMath.totalArea).toLocaleString()} sq ft</span></div>
        <div class="sum-row"><span class="sk">Double-Sided Tape Included</span><span class="sv">${best.tapeRolls} roll${best.tapeRolls === 1 ? "" : "s"} · ${formatFeet(model.tapeFeetIncluded)}</span></div>
        <div class="sum-row"><span class="sk">Seam Tape Included</span><span class="sv">${best.seamTapeRolls} roll${best.seamTapeRolls === 1 ? "" : "s"}</span></div>
        ${
          model.recommendation.warnings.length
            ? `<div class="warning-list">${model.recommendation.warnings
                .map((warning) => `<p>${warning}</p>`)
                .join("")}</div>`
            : ""
        }
      </div>
    </section>
  `;

  details.innerHTML = `
    <section class="res-panel">
      <div class="res-ph">
        <div class="snum">3</div>
        <p class="rpt">Material + Tape</p>
        <span class="rsep">—</span>
        ${tapeStatus}
      </div>
      <div class="res-pb">
        <div class="sum-row"><span class="sk">Door Area</span><span class="sv">${Math.round(model.materialMath.totalArea).toLocaleString()} sq ft</span></div>
        <div class="sum-row"><span class="sk">Material Layout</span><span class="sv">${formatFeet(best.requiredLinearFeet)}</span></div>
        <div class="sum-row"><span class="sk">Tape Needed</span><span class="sv">${formatFeet(model.tapeFeetNeeded)}</span></div>
      </div>
    </section>

    <section class="res-panel">
      <div class="res-ph">
        <div class="snum">4</div>
        <p class="rpt">Products To Order</p>
        <span class="rsep">—</span>
        <p class="rps">${cartItems.length ? formatMoney(cartItems.reduce((sum, item) => sum + item.lineTotal, 0)) : "Custom Quote"}</p>
      </div>
      <div class="shopping-list">
        ${shoppingList(cartItems)}
      </div>
      <div class="cart-actions">
        <button class="aamb" type="button" data-add-cart ${cartItems.length ? "" : "disabled"}>Add to Cart</button>
      </div>
    </section>
  `;

  document.querySelector("[data-add-cart]")?.addEventListener("click", addRecommendedToCart);
}

function update() {
  if (!hasCalculated) {
    renderEmptyState();
    return;
  }

  renderResults(calculate(readRows()));
}

function applyEmbedModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("embed") === "1") {
    document.body.classList.add("embed-mode");
    modeButton.setAttribute("aria-pressed", "true");
  }
}

renderRows();
applyEmbedModeFromUrl();
update();

form.addEventListener("input", update);
form.addEventListener("submit", (event) => event.preventDefault());

addRowButton.addEventListener("click", () => {
  const rows = readRows();
  if (rows.length >= 6) return;
  rows.push({ width: "", height: "", qty: 1 });
  renderRows(rows);
  update();
});

calcScrollButton.addEventListener("click", () => {
  hasCalculated = true;
  update();
  result.scrollIntoView({ behavior: "smooth", block: "start" });
});

async function addRecommendedToCart() {
  const button = document.querySelector("[data-add-cart]");
  if (!button || !cartItems.length) return;

  button.textContent = "Adding...";
  button.disabled = true;

  try {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        items: cartItems.map((item) => ({
          id: item.variantId,
          quantity: item.qty
        }))
      })
    });

    if (!response.ok) throw new Error("Cart request failed");
    window.location.href = "/cart";
  } catch {
    button.textContent = "Add to Cart";
    button.disabled = false;
    alert("Cart add works when this calculator is embedded on the BlueTex Shopify site.");
  }
}

modeButton.addEventListener("click", () => {
  document.body.classList.toggle("embed-mode");
  modeButton.setAttribute(
    "aria-pressed",
    document.body.classList.contains("embed-mode").toString()
  );
});
