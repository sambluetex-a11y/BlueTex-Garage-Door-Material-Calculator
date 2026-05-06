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

console.log("Calculator tests passed.");
