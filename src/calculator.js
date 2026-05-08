export const KITS = [
  {
    id: "single",
    name: "Single Door Kit",
    label: "Single Garage Door Kit",
    widthInches: 50,
    linearFeet: 37.5,
    coverageSqft: 150,
    price: 189,
    tapeRolls: 1,
    seamTapeRolls: 1,
    type: "50"
  },
  {
    id: "double",
    name: "Double Door Kit",
    label: "Double Garage Door Kit",
    widthInches: 50,
    linearFeet: 52.5,
    coverageSqft: 205,
    price: 219,
    tapeRolls: 1,
    seamTapeRolls: 1,
    type: "50"
  },
  {
    id: "oversized",
    name: "Oversized Door(s) Kit",
    label: "Oversized Garage Door Kit",
    widthInches: 50,
    linearFeet: 72,
    coverageSqft: 295,
    price: 269,
    tapeRolls: 2,
    seamTapeRolls: 1,
    type: "50"
  },
  {
    id: "multi50",
    name: "Multi-Door Kit - 50\" Wide",
    label: "Multi-Door Kit - 50\" Wide",
    widthInches: 50,
    linearFeet: 168,
    coverageSqft: 700,
    price: 399,
    tapeRolls: 3,
    seamTapeRolls: 2,
    type: "50",
    multiDoor: true
  },
  {
    id: "multi62",
    name: "Multi-Door Kit - 62\" Wide",
    label: "Multi-Door Kit - 62\" Wide",
    widthInches: 62,
    linearFeet: 135,
    coverageSqft: 700,
    price: 399,
    tapeRolls: 3,
    seamTapeRolls: 2,
    type: "62",
    multiDoor: true
  }
];

const CUSTOM_RECOMMENDATION = {
  id: "custom",
  name: "Custom / Larger Roll Needed",
  label: "Custom / Larger Roll Needed",
  widthInches: null,
  linearFeet: null,
  coverageSqft: null,
  price: null,
  tapeRolls: 0,
  seamTapeRolls: 0,
  type: "custom"
};

function kitById(id) {
  if (id === "custom") return CUSTOM_RECOMMENDATION;
  return KITS.find((kit) => kit.id === id);
}

function planLabel(items) {
  if (!items.length) return CUSTOM_RECOMMENDATION.label;
  return items
    .map((item) => `${item.quantity}x ${item.label}`)
    .join(" + ");
}

function emptyPlan() {
  return {
    items: [],
    estimatedPrice: 0,
    kitCount: 0,
    spareCapacity: 0,
    spareLinearFeet: 0,
    requiredLinearFeet: 0,
    totalLinearFeet: 0,
    tapeRolls: 0,
    seamTapeRolls: 0,
    intentPenalty: 0,
    complexity: 0,
    assignments: []
  };
}

export function normalizeRows(rows) {
  return rows
    .map((row) => ({
      width: Number(row.width),
      height: Number(row.height),
      qty: Math.max(0, Math.floor(Number(row.qty) || 0))
    }))
    .filter((row) => row.width > 0 && row.height > 0 && row.qty > 0)
    .map((row) => ({
      ...row,
      perDoorArea: row.width * row.height,
      totalRowArea: row.width * row.height * row.qty
    }));
}

function mergeRows(rows) {
  const merged = new Map();

  for (const row of rows) {
    const key = `${row.width}x${row.height}`;
    const existing = merged.get(key);
    if (existing) {
      existing.qty += row.qty;
      existing.totalRowArea += row.totalRowArea;
    } else {
      merged.set(key, { ...row });
    }
  }

  return [...merged.values()];
}

export function expandDoors(rows) {
  return normalizeRows(rows).flatMap((row, groupIndex) =>
    Array.from({ length: row.qty }, (_, qtyIndex) => ({
      width: row.width,
      height: row.height,
      groupIndex,
      instance: qtyIndex + 1,
      squareFeet: row.perDoorArea
    }))
  );
}

export function calculateRunsForRow(row) {
  const runs50 = Math.ceil(row.height / 4);
  const runs62 = Math.ceil(row.height / 5);

  return {
    width: row.width,
    height: row.height,
    qty: row.qty,
    perDoorArea: row.perDoorArea,
    totalRowArea: row.totalRowArea,
    runs50,
    runs62,
    footage50: runs50 * row.width * row.qty,
    footage62: runs62 * row.width * row.qty
  };
}

export function calculateDoor(door) {
  const runs50 = Math.ceil(door.height / 4);
  const runs62 = Math.ceil(door.height / 5);

  return {
    ...door,
    runs50,
    runs62,
    linear50Max: runs50 * door.width,
    linear62: runs62 * door.width,
    eligibleForSharedTop: door.height % 4 === 2
  };
}

function calculateSharedTopStripSavings(doors) {
  const eligibleWidths = doors
    .filter((door) => door.eligibleForSharedTop)
    .map((door) => door.width)
    .sort((a, b) => b - a);

  let savings = 0;
  for (let index = 0; index + 1 < eligibleWidths.length; index += 2) {
    savings += Math.min(eligibleWidths[index], eligibleWidths[index + 1]);
  }

  return savings;
}

function sharedSavingsForGroup(row, qty) {
  return row.height % 4 === 2 ? Math.floor(qty / 2) * row.width : 0;
}

export function classifyRequest(rows) {
  const normalizedRows = normalizeRows(rows);
  const mergedRows = mergeRows(normalizedRows);
  const totalDoorCount = normalizedRows.reduce((sum, row) => sum + row.qty, 0);
  const totalArea = normalizedRows.reduce((sum, row) => sum + row.totalRowArea, 0);
  const maxSingleDoorArea = normalizedRows.reduce(
    (max, row) => Math.max(max, row.perDoorArea),
    0
  );
  const allDoorsSameSize =
    mergedRows.length === 1 && mergedRows[0].qty === totalDoorCount;
  const onlyOneActiveDoorRow = normalizedRows.length === 1;
  const exactlyOneTotalDoor = totalDoorCount === 1;
  const everyDoorAtMost10x10 = normalizedRows.every(
    (row) => row.width <= 10 && row.height <= 10
  );

  return {
    rows: normalizedRows,
    mergedRows,
    totalDoorCount,
    totalArea,
    maxSingleDoorArea,
    allDoorsSameSize,
    onlyOneActiveDoorRow,
    exactlyOneTotalDoor,
    everyDoorAtMost10x10,
    requestType:
      totalDoorCount === 1
        ? "single-door"
        : totalDoorCount === 2
          ? "two-door"
          : totalDoorCount >= 3
            ? "multi-door"
            : "empty"
  };
}

export function calculateMaterialMath(rows) {
  const normalizedRows = normalizeRows(rows);
  const doors = expandDoors(rows).map(calculateDoor);
  const runsByRow = normalizedRows.map(calculateRunsForRow);
  const footage50 = runsByRow.reduce((sum, row) => sum + row.footage50, 0);
  const footage62 = runsByRow.reduce((sum, row) => sum + row.footage62, 0);
  const sharedTopStripSavings = calculateSharedTopStripSavings(doors);

  return {
    totalArea: normalizedRows.reduce((sum, row) => sum + row.totalRowArea, 0),
    totalDoorCount: normalizedRows.reduce((sum, row) => sum + row.qty, 0),
    footage50,
    footage62,
    efficient50Footage: Math.max(0, footage50 - sharedTopStripSavings),
    sharedTopStripSavings,
    runsByRow
  };
}

function singleDoorFitsStandardSystem(row) {
  return row.perDoorArea <= kitById("oversized").coverageSqft;
}

function isTenFootMulti62(row) {
  return row.width <= 10 && row.height === 10;
}

function isFifteenFootMulti62(row) {
  return row.width <= 15 && row.height === 15;
}

function groupFootage(row, family, qty) {
  if (family === "multi62") {
    return Math.ceil(row.height / 5) * row.width * qty;
  }

  return Math.ceil(row.height / 4) * row.width * qty - sharedSavingsForGroup(row, qty);
}

function canUseMulti50(row, qty) {
  return qty >= 3 && qty <= 10 && singleDoorFitsStandardSystem(row);
}

function canUseMulti62(row, qty) {
  if (!(isTenFootMulti62(row) || isFifteenFootMulti62(row))) return false;
  return qty >= 3 && qty <= 6;
}

function makeGroupOption(row, family, qty, intentPenalty = 0) {
  const kit = kitById(family);
  const area = row.perDoorArea * qty;
  const requiredLinearFeet = groupFootage(row, family, qty);

  if (kit.coverageSqft !== null && area > kit.coverageSqft) return null;
  if (kit.linearFeet !== null && requiredLinearFeet > kit.linearFeet) return null;

  return {
    coveredDoors: qty,
    items: [
      {
        family,
        label: kit.label,
        quantity: 1
      }
    ],
    estimatedPrice: kit.price,
    kitCount: 1,
    spareCapacity: Math.max(0, kit.coverageSqft - area),
    spareLinearFeet:
      kit.linearFeet === null ? null : kit.linearFeet - requiredLinearFeet,
    requiredLinearFeet,
    totalLinearFeet: kit.linearFeet,
    tapeRolls: kit.tapeRolls,
    seamTapeRolls: kit.seamTapeRolls,
    intentPenalty,
    complexity: family.startsWith("multi") ? 0 : 1,
    assignments: [
      {
        family,
        label: kit.label,
        qty,
        width: row.width,
        height: row.height,
        requiredLinearFeet,
        area
      }
    ]
  };
}

function groupOptionsForRow(row) {
  if (!singleDoorFitsStandardSystem(row)) return [];

  const options = [];

  for (let qty = 1; qty <= row.qty; qty += 1) {
    if (qty === 1 && row.width <= 12 && row.height <= 12 && row.perDoorArea <= 150) {
      options.push(makeGroupOption(row, "single", qty));
    }

    if (
      (qty === 2 && row.width <= 10 && row.height <= 10) ||
      (qty === 1 && row.perDoorArea <= 205)
    ) {
      options.push(makeGroupOption(row, "double", qty));
    }

    if (row.perDoorArea * qty <= 295) {
      options.push(makeGroupOption(row, "oversized", qty));
    }

    if (canUseMulti50(row, qty)) {
      options.push(makeGroupOption(row, "multi50", qty));
    }

    if (canUseMulti62(row, qty)) {
      options.push(makeGroupOption(row, "multi62", qty));
    }
  }

  return options.filter(Boolean);
}

function mergeItems(items) {
  const merged = new Map();

  for (const item of items) {
    const existing = merged.get(item.family);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(item.family, { ...item });
    }
  }

  return [...merged.values()].sort((a, b) => {
    const order = ["single", "double", "oversized", "multi50", "multi62", "custom"];
    return order.indexOf(a.family) - order.indexOf(b.family);
  });
}

function combinePlanParts(parts) {
  const items = mergeItems(parts.flatMap((part) => part.items));
  const requiredLinearFeet = parts.reduce(
    (sum, part) => sum + (part.requiredLinearFeet || 0),
    0
  );
  const totalLinearFeet = parts.every((part) => part.totalLinearFeet !== null)
    ? parts.reduce((sum, part) => sum + part.totalLinearFeet, 0)
    : null;

  return {
    family: items.length === 1 && items[0].quantity === 1 ? items[0].family : "bundle",
    label: planLabel(items),
    items,
    estimatedPrice: parts.every((part) => part.estimatedPrice !== null)
      ? parts.reduce((sum, part) => sum + part.estimatedPrice, 0)
      : null,
    requiredLinearFeet,
    totalLinearFeet,
    spareLinearFeet:
      totalLinearFeet === null ? null : totalLinearFeet - requiredLinearFeet,
    spareCapacity: parts.reduce((sum, part) => sum + part.spareCapacity, 0),
    kitCount: parts.reduce((sum, part) => sum + part.kitCount, 0),
    tapeRolls: parts.reduce((sum, part) => sum + part.tapeRolls, 0),
    seamTapeRolls: parts.reduce((sum, part) => sum + part.seamTapeRolls, 0),
    intentPenalty: parts.reduce((sum, part) => sum + part.intentPenalty, 0),
    complexity: new Set(items.map((item) => item.family)).size,
    assignments: parts.flatMap((part) => part.assignments)
  };
}

function comparePlans(a, b) {
  if (a.estimatedPrice !== b.estimatedPrice) {
    return a.estimatedPrice - b.estimatedPrice;
  }
  if (a.items.some((item) => item.family === "multi62") !== b.items.some((item) => item.family === "multi62")) {
    return a.items.some((item) => item.family === "multi62") ? 1 : -1;
  }
  if (a.spareLinearFeet !== b.spareLinearFeet) {
    return a.spareLinearFeet - b.spareLinearFeet;
  }
  if (a.spareCapacity !== b.spareCapacity) return a.spareCapacity - b.spareCapacity;
  if (a.kitCount !== b.kitCount) return a.kitCount - b.kitCount;
  return a.complexity - b.complexity;
}

function rowPlans(row) {
  const options = groupOptionsForRow(row);
  if (options.length === 0) return [];

  const plansByCount = Array.from({ length: row.qty + 1 }, () => []);
  plansByCount[0] = [emptyPlan()];

  for (let count = 0; count <= row.qty; count += 1) {
    for (const current of plansByCount[count]) {
      for (const option of options) {
        const nextCount = count + option.coveredDoors;
        if (nextCount > row.qty) continue;

        const next = combinePlanParts([current, option]);
        plansByCount[nextCount].push(next);
        plansByCount[nextCount].sort(comparePlans);
        plansByCount[nextCount] = plansByCount[nextCount].slice(0, 24);
      }
    }
  }

  return plansByCount[row.qty].sort(comparePlans).slice(0, 12);
}

function combineRowPlanSets(rowPlanSets) {
  let combined = [emptyPlan()];

  for (const plans of rowPlanSets) {
    const next = [];
    for (const base of combined) {
      for (const plan of plans) {
        next.push(combinePlanParts([base, plan]));
      }
    }
    combined = next.sort(comparePlans).slice(0, 24);
  }

  return combined.sort(comparePlans);
}

const MAX_DOORS_FOR_MIXED_SIZE_OPTIMIZER = 14;

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function doorsFromMask(doors, mask) {
  const selected = [];
  for (let index = 0; index < doors.length; index += 1) {
    if (mask & (1 << index)) selected.push(doors[index]);
  }
  return selected;
}

function subsetStats(doors, family) {
  const area = doors.reduce((sum, door) => sum + door.squareFeet, 0);
  const requiredLinearFeet =
    family === "multi62"
      ? doors.reduce((sum, door) => sum + door.linear62, 0)
      : Math.max(
          0,
          doors.reduce((sum, door) => sum + door.linear50Max, 0) -
            calculateSharedTopStripSavings(doors)
        );

  return {
    area,
    requiredLinearFeet
  };
}

function everyDoor(doors, predicate) {
  return doors.every(predicate);
}

function canUseKitForDoors(family, doors) {
  const qty = doors.length;

  if (family === "single") {
    return (
      qty === 1 &&
      everyDoor(doors, (door) => door.width <= 12 && door.height <= 12)
    );
  }

  if (family === "double") {
    return (
      qty === 1 ||
      (qty === 2 &&
        everyDoor(doors, (door) => door.width <= 10 && door.height <= 10))
    );
  }

  if (family === "oversized") {
    return qty >= 1;
  }

  if (family === "multi50") {
    return (
      qty >= 3 &&
      qty <= 10 &&
      everyDoor(
        doors,
        (door) =>
          door.squareFeet <= kitById("oversized").coverageSqft &&
          door.linear50Max <= kitById("oversized").linearFeet
      )
    );
  }

  if (family === "multi62") {
    return (
      qty >= 3 &&
      qty <= 6 &&
      (everyDoor(doors, (door) => door.width <= 10 && door.height === 10) ||
        everyDoor(doors, (door) => door.width <= 15 && door.height === 15))
    );
  }

  return false;
}

function makeDoorOption(mask, doors, family) {
  if (!canUseKitForDoors(family, doors)) return null;

  const kit = kitById(family);
  const stats = subsetStats(doors, family);
  if (kit.coverageSqft !== null && stats.area > kit.coverageSqft) return null;
  if (kit.linearFeet !== null && stats.requiredLinearFeet > kit.linearFeet) {
    return null;
  }

  return {
    mask,
    coveredDoors: doors.length,
    items: [
      {
        family,
        label: kit.label,
        quantity: 1
      }
    ],
    estimatedPrice: kit.price,
    kitCount: 1,
    spareCapacity: Math.max(0, kit.coverageSqft - stats.area),
    spareLinearFeet: kit.linearFeet - stats.requiredLinearFeet,
    requiredLinearFeet: stats.requiredLinearFeet,
    totalLinearFeet: kit.linearFeet,
    tapeRolls: kit.tapeRolls,
    seamTapeRolls: kit.seamTapeRolls,
    intentPenalty: 0,
    complexity: family.startsWith("multi") ? 0 : 1,
    assignments: [
      {
        family,
        label: kit.label,
        qty: doors.length,
        width: Math.max(...doors.map((door) => door.width)),
        height: Math.max(...doors.map((door) => door.height)),
        requiredLinearFeet: stats.requiredLinearFeet,
        area: stats.area
      }
    ]
  };
}

function mixedDoorPlans(doors) {
  if (
    doors.length === 0 ||
    doors.length > MAX_DOORS_FOR_MIXED_SIZE_OPTIMIZER
  ) {
    return [];
  }

  const fullMask = (1 << doors.length) - 1;
  const optionsByDoor = Array.from({ length: doors.length }, () => []);
  const families = ["single", "double", "oversized", "multi50", "multi62"];

  for (let mask = 1; mask <= fullMask; mask += 1) {
    const qty = bitCount(mask);
    if (qty > 10) continue;

    const selectedDoors = doorsFromMask(doors, mask);
    for (const family of families) {
      const option = makeDoorOption(mask, selectedDoors, family);
      if (!option) continue;

      for (let index = 0; index < doors.length; index += 1) {
        if (mask & (1 << index)) optionsByDoor[index].push(option);
      }
    }
  }

  const memo = new Map();
  const solve = (coveredMask) => {
    if (coveredMask === fullMask) return [emptyPlan()];
    if (memo.has(coveredMask)) return memo.get(coveredMask);

    let firstOpenDoor = 0;
    while (coveredMask & (1 << firstOpenDoor)) firstOpenDoor += 1;

    const plans = [];
    for (const option of optionsByDoor[firstOpenDoor]) {
      if (option.mask & coveredMask) continue;

      for (const tail of solve(coveredMask | option.mask)) {
        plans.push(combinePlanParts([option, tail]));
      }
    }

    const bestPlans = plans.sort(comparePlans).slice(0, 24);
    memo.set(coveredMask, bestPlans);
    return bestPlans;
  };

  return solve(0).sort(comparePlans).slice(0, 12);
}

function customPlan(materialMath) {
  return {
    family: "custom",
    label: CUSTOM_RECOMMENDATION.label,
    items: [],
    estimatedPrice: null,
    requiredLinearFeet: null,
    totalLinearFeet: null,
    spareLinearFeet: null,
    spareCapacity: null,
    kitCount: 0,
    tapeRolls: 0,
    seamTapeRolls: 0,
    intentPenalty: 1000,
    complexity: 0,
    assignments: [],
    reasoning: [
      "This layout includes at least one door outside the standard BlueTex garage door kit coverage logic.",
      `${formatFeet(materialMath.footage50)} of 50\" planning footage and ${formatFeet(materialMath.footage62)} of 62\" planning footage were calculated for custom quoting.`
    ]
  };
}

export function buildCandidatePlans(rows) {
  const classification = classifyRequest(rows);
  if (classification.totalDoorCount === 0) return [];

  const mixedPlans = mixedDoorPlans(expandDoors(rows).map(calculateDoor));
  if (mixedPlans.length > 0) return mixedPlans.map(addPlanExplanation);

  const rowPlanSets = classification.mergedRows.map(rowPlans);
  if (rowPlanSets.some((plans) => plans.length === 0)) return [];
  return combineRowPlanSets(rowPlanSets).map(addPlanExplanation);
}

function addPlanExplanation(plan) {
  const multiItems = plan.items.filter((item) => item.family.startsWith("multi"));
  const hasBundle = plan.items.length > 1 || plan.items.some((item) => item.quantity > 1);
  const reasoning = [];

  if (hasBundle) {
    reasoning.push(
      "This is the lowest-cost standard kit combination that covers the entered dimensions without a material shortfall."
    );
  } else {
    reasoning.push(
      "This is the lowest-cost standard kit that covers the entered dimensions without a material shortfall."
    );
  }

  if (multiItems.length > 0) {
    reasoning.push("Multi-door kits are only used here where the entered door sizes match their intended fit range.");
  }

  return {
    ...plan,
    reasoning
  };
}

export function recommendKits(rows) {
  const materialMath = calculateMaterialMath(rows);
  const candidatePlans = buildCandidatePlans(rows);
  const primaryPlan =
    candidatePlans.length > 0 ? candidatePlans[0] : customPlan(materialMath);
  const alternatives = candidatePlans.slice(1, 4);
  const warnings = [];

  if (primaryPlan.family === "custom") {
    warnings.push(
      "Standard kit combinations do not fit this request. Use the footage math for a custom roll or manual quote."
    );
  }

  if (primaryPlan.spareLinearFeet !== null && primaryPlan.spareLinearFeet < 0) {
    warnings.push(
      "This recommendation follows BlueTex kit coverage limits first. Check final strip layout for unusually wide doors."
    );
  }

  return {
    primaryPlan,
    primaryRecommendation: primaryPlan,
    alternatives,
    alternativeRecommendations: alternatives,
    materialMath,
    explanation: primaryPlan.reasoning || [],
    warnings
  };
}

export function calculateTapePlan(doors, recommendation) {
  if (!recommendation?.primaryPlan) return [];

  const spacingInches = 18;
  return doors.map((door) => {
    const strips = Math.ceil((door.width * 12) / spacingInches);
    const tighterStrips = Math.ceil((door.width * 12) / 12);
    return {
      ...door,
      spacingInches,
      strips,
      tapeFeet: strips * door.height,
      tighterStrips,
      tighterTapeFeet: tighterStrips * door.height
    };
  });
}

export function calculate(rows) {
  const normalizedRows = normalizeRows(rows);
  const doors = expandDoors(rows).map(calculateDoor);
  const recommendation = recommendKits(rows);
  const materialMath = recommendation.materialMath;
  const tapePlan = calculateTapePlan(doors, recommendation);
  const tapeFeetNeeded = tapePlan.reduce((sum, door) => sum + door.tapeFeet, 0);
  const tighterTapeFeetNeeded = tapePlan.reduce(
    (sum, door) => sum + door.tighterTapeFeet,
    0
  );
  const tapeFeetIncluded = (recommendation.primaryPlan?.tapeRolls || 0) * 180;

  return {
    rows: normalizedRows,
    doors,
    totals: {
      doorCount: materialMath.totalDoorCount,
      squareFeet: materialMath.totalArea,
      linear50Max: materialMath.footage50,
      sharedSavings: materialMath.sharedTopStripSavings,
      linear50Shared: materialMath.efficient50Footage,
      linear62: materialMath.footage62
    },
    recommendation,
    materialMath,
    tapePlan,
    tapeFeetNeeded,
    tighterTapeFeetNeeded,
    tapeFeetIncluded,
    tapeShortfall: Math.max(0, tapeFeetNeeded - tapeFeetIncluded)
  };
}

export function formatFeet(value) {
  if (value === null || Number.isNaN(Number(value))) return "Custom";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}'` : `${rounded.toFixed(1)}'`;
}

export function formatMoney(value) {
  if (value === null || Number.isNaN(Number(value))) return "Contact for sizing";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
