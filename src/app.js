import { calculate, formatFeet, formatMoney } from "./calculator.js";

const form = document.querySelector("[data-calculator-form]");
const result = document.querySelector("[data-results]");
const summary = document.querySelector("[data-summary]");
const details = document.querySelector("[data-details]");
const tapeSummary = document.querySelector("[data-tape-summary]");
const addRowButton = document.querySelector("[data-add-row]");
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
  if (!recommendation.items.length) {
    return `<li>${recommendation.label}</li>`;
  }

  return recommendation.items
    .map((item) => `<li>${item.quantity}x ${item.label}</li>`)
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
  tapeSummary.innerHTML = "";
}

function shortFitNote(best, warnings) {
  if (warnings.length) return warnings[0];
  if (best.items.some((item) => item.family === "multi62")) {
    return "62\" multi-door kit matched the entered 10' or 15' door height use case.";
  }
  if (best.items.some((item) => item.family === "multi50")) {
    return "50\" multi-door kit matched the entered 8' or 12' door use case.";
  }
  return "Standard 50\" kit layout selected for these dimensions.";
}

function renderTapeSummary(model, tapeStatus) {
  const tapeRows = model.rows
    .map((row, index) => {
      const plan = model.tapePlan.find((door) => door.groupIndex === index);
      if (!plan) return "";
      return `
        <li>
          <strong>${row.qty}x ${formatFeet(row.width)} W x ${formatFeet(row.height)} H</strong>
          <span>${plan.strips} strips per door x ${formatFeet(row.height)} tall = ${formatFeet(plan.tapeFeet)} per door</span>
          ${row.qty > 1 ? `<span>${formatFeet(plan.tapeFeet * row.qty)} for this door size</span>` : ""}
        </li>
      `;
    })
    .join("");

  const tapeIncludedText =
    model.recommendation.primaryPlan.tapeRolls > 0
      ? `Recommended kits include about ${formatFeet(model.tapeFeetIncluded)}.`
      : "Tape should be quoted with the custom setup.";

  tapeSummary.innerHTML = `
    <section class="tape-card">
      <div class="panel-heading">
        <h2>Tape Recommendation</h2>
        ${tapeStatus}
      </div>
      <p class="tape-total">${formatFeet(model.tapeFeetNeeded)} total double-sided tape needed. ${tapeIncludedText}</p>
      <p>Estimate uses one vertical strip about every 18" across each door width.</p>
      <ul class="tape-list">${tapeRows}</ul>
    </section>
  `;
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
  const tapeStatus =
    model.tapeShortfall > 0
      ? `<span class="status warn">Add tape recommended</span>`
      : `<span class="status ok">Included tape covers this layout</span>`;
  const coverageText =
    best.totalLinearFeet === null
      ? "Custom footage needed"
      : `${formatFeet(best.totalLinearFeet)} kit material`;
  const requiredText =
    best.requiredLinearFeet === null
      ? "Use the custom footage below"
      : `${formatFeet(best.requiredLinearFeet)} layout footage needed`;
  const fitNote = shortFitNote(best, model.recommendation.warnings);

  renderTapeSummary(model, tapeStatus);

  summary.innerHTML = `
    <div class="metric primary">
      <span>Best kit plan</span>
      <strong>${best.label}</strong>
      <small>${priceText}</small>
    </div>
    <div class="metric">
      <span>Kit coverage</span>
      <strong>${coverageText}</strong>
      <small>${requiredText}</small>
    </div>
    <div class="metric">
      <span>Tape needed</span>
      <strong>${formatFeet(model.tapeFeetNeeded)}</strong>
      <small>${model.tapePlan[0]?.spacingInches || 18}" spacing estimate; ${model.tapeShortfall > 0 ? "add tape" : "recommended kits include enough"}</small>
    </div>
    <div class="metric">
      <span>Fit note</span>
      <strong>${model.materialMath.totalDoorCount} door${model.materialMath.totalDoorCount === 1 ? "" : "s"}</strong>
      <small>${fitNote}</small>
    </div>
  `;

  const doorRows = model.materialMath.runsByRow
    .map((row) => {
      return `
        <tr>
          <td>${row.qty}x ${formatFeet(row.width)} W x ${formatFeet(row.height)} H</td>
          <td>${row.runs50}</td>
          <td>${formatFeet(row.footage50)}</td>
          <td>${row.runs62}</td>
          <td>${formatFeet(row.footage62)}</td>
        </tr>
      `;
    })
    .join("");

  details.innerHTML = `
    <section class="result-panel recommendation">
      <div>
        <h2>Kit Recommendation</h2>
        ${best.reasoning.map((line) => `<p>${line}</p>`).join("")}
      </div>
      <ul>${kitList(best)}</ul>
      ${
        model.recommendation.warnings.length
          ? `<div class="warning-list">${model.recommendation.warnings
              .map((warning) => `<p>${warning}</p>`)
              .join("")}</div>`
          : ""
      }
    </section>

    <section class="result-panel">
      <h2>Material Math</h2>
      <div class="math-grid">
        <div>
          <span>50" max footage</span>
          <strong>${formatFeet(model.materialMath.footage50)}</strong>
        </div>
        <div>
          <span>Shared top-strip savings</span>
          <strong>${formatFeet(model.materialMath.sharedTopStripSavings)}</strong>
        </div>
        <div>
          <span>Efficient 50" footage</span>
          <strong>${formatFeet(model.materialMath.efficient50Footage)}</strong>
        </div>
        <div>
          <span>62" multi-door footage</span>
          <strong>${formatFeet(model.materialMath.footage62)}</strong>
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
  `;
}

function update() {
  renderResults(calculate(readRows()));
}

renderRows();
update();

form.addEventListener("input", update);

addRowButton.addEventListener("click", () => {
  const rows = readRows();
  if (rows.length >= 6) return;
  rows.push({ width: "", height: "", qty: 1 });
  renderRows(rows);
  update();
});
