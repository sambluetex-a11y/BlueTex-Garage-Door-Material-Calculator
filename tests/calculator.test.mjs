import assert from "node:assert/strict";
import { calculate } from "../src/calculator.js";

function planFor(width, height, qty = 1) {
  return calculate([{ width, height, qty }]).recommendation.primaryPlan;
}

function itemQty(plan, family) {
  return plan.items.find((item) => item.family === family)?.quantity || 0;
}

function assertPlan(width, height, qty, expectedItems) {
  const plan = planFor(width, height, qty);
  for (const [family, quantity] of Object.entries(expectedItems)) {
    assert.equal(
      itemQty(plan, family),
      quantity,
      `${qty}x ${width}x${height} should include ${quantity} ${family}`
    );
  }
  assert.notEqual(plan.family, "custom", `${qty}x ${width}x${height} should not be custom`);
  return plan;
}

const threeTenByTen = calculate([{ width: 10, height: 10, qty: 3 }]);
assert.equal(threeTenByTen.materialMath.footage50, 90);
assert.equal(threeTenByTen.materialMath.efficient50Footage, 80);
assert.equal(itemQty(threeTenByTen.recommendation.primaryPlan, "multi62"), 1);

const twoFourteenByFourteen = calculate([{ width: 14, height: 14, qty: 2 }]);
assert.equal(twoFourteenByFourteen.materialMath.footage50, 112);
assert.equal(twoFourteenByFourteen.materialMath.sharedTopStripSavings, 14);
assert.equal(twoFourteenByFourteen.materialMath.efficient50Footage, 98);
assert.equal(twoFourteenByFourteen.materialMath.footage62, 84);
assert.notEqual(twoFourteenByFourteen.recommendation.primaryPlan.family, "custom");

const fourTwelveByTwelve = calculate([{ width: 12, height: 12, qty: 4 }]);
assert.equal(fourTwelveByTwelve.materialMath.footage50, 144);
assert.equal(fourTwelveByTwelve.materialMath.efficient50Footage, 144);
assert.equal(fourTwelveByTwelve.materialMath.footage62, 144);
assert.equal(itemQty(fourTwelveByTwelve.recommendation.primaryPlan, "multi50"), 1);

const mixedDoors = calculate([
  { width: 10, height: 10, qty: 2 },
  { width: 14, height: 14, qty: 1 }
]);
assert.equal(mixedDoors.materialMath.totalDoorCount, 3);
assert.equal(mixedDoors.materialMath.footage50, 116);
assert.equal(mixedDoors.materialMath.sharedTopStripSavings, 10);
assert.equal(mixedDoors.materialMath.efficient50Footage, 106);
assert.notEqual(mixedDoors.recommendation.primaryPlan.family, "custom");

assert.equal(itemQty(planFor(8, 8), "single"), 1);
assert.equal(itemQty(planFor(10, 10), "single"), 1);
assert.equal(itemQty(planFor(12, 12), "single"), 1);
assert.equal(itemQty(planFor(16, 12), "double"), 1);
assert.equal(itemQty(planFor(20, 14), "oversized"), 1);
assert.equal(planFor(20, 14).label, "1x Oversized Garage Door Kit");
assert.equal(itemQty(planFor(21, 14), "oversized"), 1);
assert.equal(planFor(21, 14).label, "1x Oversized Garage Door Kit");
assert.equal(planFor(22, 14).family, "custom");
assert.equal(planFor(22, 14).label, "Custom / Larger Roll Needed");

assert.equal(itemQty(planFor(10, 10, 2), "double"), 1);
assert.equal(itemQty(planFor(11, 11, 2), "oversized"), 1);
assert.notEqual(planFor(11, 11, 2).family, "multi62");

assertPlan(12, 12, 6, { multi50: 2 });
assertPlan(12, 12, 7, { multi50: 2 });
assertPlan(10, 10, 3, { multi62: 1 });
assertPlan(10, 10, 6, { multi62: 1 });
assertPlan(8, 8, 8, { multi50: 1 });
assertPlan(8, 8, 11, { multi50: 2 });

const tape = calculate([{ width: 10, height: 10, qty: 2 }]);
assert.equal(tape.tapePlan[0].strips, 8);
assert.equal(tape.tapeFeetNeeded, 160);
assert.equal(tape.tapeFeetIncluded >= tape.tapeFeetNeeded, true);

// ── Stress tests: cross-row global multi-kit optimization ──

// 2x 20x10 → per-row gives 2× double ($438). Global multi-kit should win ($399, kitCount=1).
{
  const plan = planFor(20, 10, 2);
  assert.equal(plan.kitCount, 1, "2x 20x10 should be covered by 1 kit, not 2x double");
  assert.equal(plan.estimatedPrice, 399, "2x 20x10 multi-kit should cost $399");
  assert.notEqual(plan.family, "custom", "2x 20x10 must not be custom");
}

// 4x 10x8 → per-row gives 2× kits ($438+). Global multi-kit should win ($399).
{
  const plan = planFor(10, 8, 4);
  assert.equal(plan.kitCount, 1, "4x 10x8 should be covered by 1 multi-kit");
  assert.equal(plan.estimatedPrice <= 399, true, "4x 10x8 should cost ≤$399");
  assert.notEqual(plan.family, "custom", "4x 10x8 must not be custom");
}

// Mixed rows: 1x 10x10 + 2x 20x10 — user's reported example.
// Old engine: 1 single + 2 double = $627. Fixed: 1x multi-door kit = $399.
{
  const result = calculate([{ width: 10, height: 10, qty: 1 }, { width: 20, height: 10, qty: 2 }]);
  const plan = result.recommendation.primaryPlan;
  assert.equal(plan.kitCount, 1, "1x 10x10 + 2x 20x10 should be covered by 1 multi-kit");
  assert.equal(plan.estimatedPrice, 399, "multi-kit should cost $399 for that mix");
  assert.equal(plan.items.some(i => i.family.startsWith("multi")), true, "should recommend a multi-door kit");
}

// Mixed rows: 1x 10x10 + 2x 14x9 — multi-kit ($399) beats single+oversized ($458).
{
  const result = calculate([{ width: 10, height: 10, qty: 1 }, { width: 14, height: 9, qty: 2 }]);
  const plan = result.recommendation.primaryPlan;
  assert.equal(plan.kitCount, 1, "1x10x10 + 2x14x9 should be covered by 1 multi-kit");
  assert.equal(plan.estimatedPrice <= 399, true, "1x10x10 + 2x14x9 should cost ≤$399");
  assert.equal(plan.items.some(i => i.family.startsWith("multi")), true, "should recommend multi-door kit");
}

// 2x 20x8 — each 160 sq ft; per-row produces 2× kits. Global multi-kit ($399) wins.
{
  const plan = planFor(20, 8, 2);
  assert.equal(plan.kitCount, 1, "2x 20x8 should be covered by 1 multi-kit");
  assert.equal(plan.estimatedPrice, 399, "2x 20x8 multi-kit should cost $399");
}

// Single small door still gets single kit (NOT multi).
{
  const plan = planFor(8, 8, 1);
  assert.equal(itemQty(plan, "single"), 1, "single 8x8 door must stay as single kit");
  assert.equal(itemQty(plan, "multi50"), 0, "single 8x8 must not use multi50");
}

// Single 10x10 still gets single kit.
{
  const plan = planFor(10, 10, 1);
  assert.equal(itemQty(plan, "single"), 1, "single 10x10 must use single kit");
}

// 2x 11x11 → oversized (241 sq ft < 295, cheapest 1-kit option at $269) beats multi50 ($399).
{
  const plan = planFor(11, 11, 2);
  assert.equal(itemQty(plan, "oversized"), 1, "2x 11x11 should use 1x oversized (cheaper than multi)");
}

// 22x14 single door stays custom.
assert.equal(planFor(22, 14).family, "custom", "22x14 single door must remain custom");

// 3x 12x12 → multi50 (per-row canUseMulti50 applies; also covered by global candidate).
assertPlan(12, 12, 3, { multi50: 1 });

// Large multi: 3x 20x12 — each 240 sq ft. Per-row: oversized covers 1 (240 ≤ 295), need 3x oversized ($807).
// Global multi50: footage = 3×ceil(12/4)×20 = 3×3×20 = 180 LF > 168 LF/kit → need 2 kits ($798).
// area = 720 = 2×multi50 coverageSqft ✓. Should be 2x multi50.
{
  const result = calculate([{ width: 20, height: 12, qty: 3 }]);
  const plan = result.recommendation.primaryPlan;
  assert.equal(plan.estimatedPrice <= 798, true, "3x 20x12 should cost ≤$798 (2x multi50)");
  assert.notEqual(plan.family, "custom", "3x 20x12 should not be custom");
}

console.log("Calculator tests passed.");
