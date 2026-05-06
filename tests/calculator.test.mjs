import assert from "node:assert/strict";
import { calculate } from "../src/calculator.js";

const threeTenByTen = calculate([{ width: 10, height: 10, qty: 3 }]);
assert.equal(threeTenByTen.totals.linear50Max, 90);
assert.equal(threeTenByTen.totals.linear50Shared, 80);
assert.equal(threeTenByTen.recommendation.best.totalLinearFeet >= 80, true);

const twoFourteenByFourteen = calculate([{ width: 14, height: 14, qty: 2 }]);
assert.equal(twoFourteenByFourteen.totals.linear50Max, 112);
assert.equal(twoFourteenByFourteen.totals.linear50Shared, 98);
assert.equal(twoFourteenByFourteen.totals.linear62, 84);

const fourTwelveByTwelve = calculate([{ width: 12, height: 12, qty: 4 }]);
assert.equal(fourTwelveByTwelve.totals.linear50Max, 144);
assert.equal(fourTwelveByTwelve.totals.linear50Shared, 144);
assert.equal(fourTwelveByTwelve.totals.linear62, 144);

const mixedDoors = calculate([
  { width: 10, height: 10, qty: 2 },
  { width: 14, height: 14, qty: 1 }
]);
assert.equal(mixedDoors.totals.doorCount, 3);
assert.equal(mixedDoors.totals.linear50Max, 116);
assert.equal(mixedDoors.totals.sharedSavings, 10);
assert.equal(mixedDoors.totals.linear50Shared, 106);

const tape = calculate([{ width: 10, height: 10, qty: 2 }]);
assert.equal(tape.tapePlan[0].strips, 8);
assert.equal(tape.tapeFeetNeeded, 160);
assert.equal(tape.tapeFeetIncluded >= tape.tapeFeetNeeded, true);

console.log("Calculator tests passed.");
