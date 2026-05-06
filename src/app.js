import { calculate, formatFeet, formatMoney } from "./calculator.js";

const form = document.querySelector("[data-calculator-form]");
const result = document.querySelector("[data-results]");
const summary = document.querySelector("[data-summary]");
const details = document.querySelector("[data-details]");
const addRowButton = document.querySelector("[data-add-row]");
const modeButton = document.querySelector("[data-mode-toggle]");
const rowsContainer = document.querySelector("[data-rows]");

const defaultRows = [
  { width: 10, height: 10, qty: 2 },
  { width: "", height: "", qty: 1 },
  { width: "", height: "", qty: 1 }
];

function rowTemplate(row, index) {
  return `
    <div class="door-row" data-row>
      <div class="field">
        <label for="width-${index}">Width</label>
        <div class="input-shell">
          <input id="width-${index}" name="width" type="number" min="1" step="0.25" value="${row.width}" inputmode="decimal" aria-label="Door width in feet">
          <span>ft</span>
        </div>
      </div>
      <div class="field">
        <label for="height-${index}">Height</label>
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

function kitList(recommendation) {
  return recommendation.items
    .map((item) => `<li>${item.qty}x ${item.name}</li>`)
    .join("");
}

function renderEmptyState() {
  summary.innerHTML = `
    <div class="empty-state">
      <strong>Enter at least one door size.</strong>
      <span>The calculator will convert door dimensions into linear footage and kit guidance.</span>
    </div>
  `;
  details.innerHTML = "";
}

function renderResults(model) {
  if (!model.totals.doorCount || !model.recommendation?.best) {
    renderEmptyState();
    return;
  }

  const best = model.recommendation.best;
  const alternate = model.recommendation.alternate;
  const tapeStatus =
    model.tapeShortfall > 0
      ? `<span class="status warn">Add tape recommended</span>`
      : `<span class="status ok">Included tape covers this layout</span>`;

  summary.innerHTML = `
    <div class="metric primary">
      <span>Recommended kit</span>
      <strong>${best.items.map((item) => `${item.qty}x ${item.name}`).join(" + ")}</strong>
      <small>${formatMoney(best.totalPrice)} estimated kit price</small>
    </div>
    <div class="metric">
      <span>Linear footage to plan around</span>
      <strong>${formatFeet(best.requiredLinearFeet)}</strong>
      <small>${formatFeet(best.spareLinearFeet)} spare material in this recommendation</small>
    </div>
    <div class="metric">
      <span>Door coverage</span>
      <strong>${model.totals.doorCount} door${model.totals.doorCount === 1 ? "" : "s"}</strong>
      <small>${Math.round(model.totals.squareFeet)} sq ft would be misleading by itself</small>
    </div>
  `;

  const doorRows = model.rows
    .map((row) => {
      const runs50 = Math.ceil(row.height / 4);
      const runs62 = Math.ceil(row.height / 5);
      return `
        <tr>
          <td>${row.qty}x ${formatFeet(row.width)} W x ${formatFeet(row.height)} H</td>
          <td>${runs50}</td>
          <td>${formatFeet(runs50 * row.width * row.qty)}</td>
          <td>${runs62}</td>
          <td>${formatFeet(runs62 * row.width * row.qty)}</td>
        </tr>
      `;
    })
    .join("");

  const tapeRows = model.rows
    .map((row, index) => {
      const plan = model.tapePlan.find((door) => door.groupIndex === index);
      if (!plan) return "";
      return `
        <tr>
          <td>${row.qty}x ${formatFeet(row.width)} W x ${formatFeet(row.height)} H</td>
          <td>${plan.strips} vertical strips per door</td>
          <td>${formatFeet(plan.tapeFeet)} per door</td>
          <td>${formatFeet(plan.tapeFeet * row.qty)}</td>
        </tr>
      `;
    })
    .join("");

  details.innerHTML = `
    <section class="result-panel recommendation">
      <div>
        <h2>Kit Recommendation</h2>
        <p>${best.note}</p>
      </div>
      <ul>${kitList(best)}</ul>
      ${
        alternate
          ? `<p class="alternate">Alternative: ${alternate.items
              .map((item) => `${item.qty}x ${item.name}`)
              .join(" + ")} (${formatFeet(alternate.requiredLinearFeet)} required, ${formatFeet(alternate.spareLinearFeet)} spare).</p>`
          : ""
      }
    </section>

    <section class="result-panel">
      <h2>Material Math</h2>
      <div class="math-grid">
        <div>
          <span>50" max footage</span>
          <strong>${formatFeet(model.totals.linear50Max)}</strong>
        </div>
        <div>
          <span>Shared top-strip savings</span>
          <strong>${formatFeet(model.totals.sharedSavings)}</strong>
        </div>
        <div>
          <span>Efficient 50" footage</span>
          <strong>${formatFeet(model.totals.linear50Shared)}</strong>
        </div>
        <div>
          <span>62" multi-door footage</span>
          <strong>${formatFeet(model.totals.linear62)}</strong>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Door size</th>
              <th>50" runs</th>
              <th>50" max footage</th>
              <th>62" runs</th>
              <th>62" footage</th>
            </tr>
          </thead>
          <tbody>${doorRows}</tbody>
        </table>
      </div>
    </section>

    <section class="result-panel">
      <div class="panel-heading">
        <h2>Double-Sided Tape Plan</h2>
        ${tapeStatus}
      </div>
      <p>Plan on vertical double-sided tape strips across each door at roughly 18" spacing, then tighten spacing where the installer wants more grab. The 12" spacing scenario would use about ${formatFeet(model.tighterTapeFeetNeeded)} total tape.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Door size</th>
              <th>Recommended strips</th>
              <th>Tape per door</th>
              <th>Total tape</th>
            </tr>
          </thead>
          <tbody>${tapeRows}</tbody>
        </table>
      </div>
      <p class="tape-total">Recommended layout: ${formatFeet(model.tapeFeetNeeded)} tape needed. Kit includes about ${formatFeet(model.tapeFeetIncluded)} across ${best.tapeRolls} roll${best.tapeRolls === 1 ? "" : "s"}.</p>
    </section>
  `;
}

function update() {
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

addRowButton.addEventListener("click", () => {
  const rows = readRows();
  if (rows.length >= 6) return;
  rows.push({ width: "", height: "", qty: 1 });
  renderRows(rows);
  update();
});

modeButton.addEventListener("click", () => {
  document.body.classList.toggle("embed-mode");
  modeButton.setAttribute(
    "aria-pressed",
    document.body.classList.contains("embed-mode").toString()
  );
});
