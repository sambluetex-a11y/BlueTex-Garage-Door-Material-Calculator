import assert from "node:assert/strict";
import { calculate } from "../src/calculator.js";

function familyFor(width, height, qty = 1) {
  return calculate([{ width, height, qty }]).recommendation.primaryRecommendation
    .family;
}

function labelFor(width, height, qty = 1) {
  return calculate([{ width, height, qty }]).recommendation.primaryRecommendation
    .label;
}

const threeTenByTen = calculate([{ width: 10, height: 10, qty: 3 }]);
assert.equal(threeTenByTen.materialMath.footage50, 90);
assert.equal(threeTenByTen.materialMath.efficient50Footage, 80);

const twoFourteenByFourteen = calculate([{ width: 14, height: 14, qty: 2 }]);
assert.equal(twoFourteenByFourteen.materialMath.footage50, 112);
assert.equal(twoFourteenByFourteen.materialMath.efficient50Footage, 112);
assert.equal(twoFourteenByFourteen.materialMath.footage62, 84);

const fourTwelveByTwelve = calculate([{ width: 12, height: 12, qty: 4 }]);
assert.equal(fourTwelveByTwelve.materialMath.footage50, 144);
assert.equal(fourTwelveByTwelve.materialMath.efficient50Footage, 144);
assert.equal(fourTwelveByTwelve.materialMath.footage62, 144);

const mixedDoors = calculate([
  { width: 10, height: 10, qty: 2 },
  { width: 14, height: 14, qty: 1 }
]);
assert.equal(mixedDoors.materialMath.totalDoorCount, 3);
assert.equal(mixedDoors.materialMath.footage50, 116);
assert.equal(mixedDoors.materialMath.sharedTopStripSavings, 10);
assert.equal(mixedDoors.materialMath.efficient50Footage, 106);

assert.equal(familyFor(8, 8), "single");
assert.equal(familyFor(10, 10), "single");
assert.equal(familyFor(12, 12), "single");
assert.equal(familyFor(16, 12), "double");
assert.equal(familyFor(20, 14), "oversized");
assert.equal(labelFor(20, 14), "1x Oversized Garage Door Kit");
assert.equal(familyFor(21, 14), "oversized");
assert.equal(labelFor(21, 14), "1x Oversized Garage Door Kit");
assert.equal(familyFor(22, 14), "custom");
assert.equal(labelFor(22, 14), "Custom / Larger Roll Needed");

assert.equal(familyFor(10, 10, 2), "double");
assert.equal(familyFor(11, 11, 2), "oversized");
assert.notEqual(familyFor(11, 11, 2), "multi62");

assert.equal(familyFor(8, 8, 5), "multi50");
assert.equal(familyFor(12, 12, 3), "multi50");
assert.equal(familyFor(10, 10, 3), "multi62");
assert.equal(familyFor(10, 10, 6), "multi62");

const tape = calculate([{ width: 10, height: 10, qty: 2 }]);
assert.equal(tape.tapePlan[0].strips, 8);
assert.equal(tape.tapeFeetNeeded, 160);
assert.equal(tape.tapeFeetIncluded >= tape.tapeFeetNeeded, true);

console.log("Calculator tests passed.");
