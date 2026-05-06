const HALF_50_INCH_ROLL_FEET = 25 / 12;

export const KITS = [
  {
    id: "single",
    name: "Single Door Kit",
    widthInches: 50,
    linearFeet: 37.5,
    price: 189,
    tapeRolls: 1,
    seamTapeRolls: 1,
    type: "50"
  },
  {
    id: "double",
    name: "Double Door Kit",
    widthInches: 50,
    linearFeet: 52.5,
    price: 219,
    tapeRolls: 1,
    seamTapeRolls: 1,
    type: "50"
  },
  {
    id: "oversized",
    name: "Oversized Door(s) Kit",
    widthInches: 50,
    linearFeet: 72,
    price: 269,
    tapeRolls: 2,
    seamTapeRolls: 1,
    type: "50"
  },
  {
    id: "multi50",
    name: "Multi-Door Kit - 50\" Wide",
    widthInches: 50,
    linearFeet: 168,
    price: 399,
    tapeRolls: 3,
    seamTapeRolls: 2,
    type: "50",
    multiDoor: true
  },
  {
    id: "multi62",
    name: "Multi-Door Kit - 62\" Wide",
    widthInches: 62,
    linearFeet: 135,
    price: 399,
    tapeRolls: 3,
    seamTapeRolls: 2,
    type: "62",
    multiDoor: true
  }
];

export function normalizeRows(rows) {
  return rows
    .map((row) => ({
      width: Number(row.width),
      height: Number(row.height),
      qty: Math.max(1, Math.floor(Number(row.qty) || 1))
    }))
    .filter((row) => row.width > 0 && row.height > 0 && row.qty > 0);
}

export function expandDoors(rows) {
  return normalizeRows(rows).flatMap((row, groupIndex) =>
    Array.from({ length: row.qty }, (_, qtyIndex) => ({
      width: row.width,
      height: row.height,
      groupIndex,
      instance: qtyIndex + 1
    }))
  );
}

export function calculateDoor(door) {
  const runs50 = Math.ceil(door.height / 4);
  const remainder50 = door.height % 4;
  const eligibleForSharedTop =
    remainder50 > 0 && remainder50 <= HALF_50_INCH_ROLL_FEET;
  const runs62 = Math.ceil(door.height / 5);

  return {
    ...door,
    squareFeet: door.width * door.height,
    runs50,
    runs62,
    linear50Max: runs50 * door.width,
    linear62: runs62 * door.width,
    remainder50,
    eligibleForSharedTop
  };
}

function calculateSharedSavings(doors) {
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

function makeCombination(counts) {
  const items = Object.entries(counts)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const kit = KITS.find((item) => item.id === id);
      return {
        ...kit,
        qty
      };
    });

  return {
    items,
    totalLinearFeet: items.reduce(
      (sum, item) => sum + item.linearFeet * item.qty,
      0
    ),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    tapeRolls: items.reduce((sum, item) => sum + item.tapeRolls * item.qty, 0),
    seamTapeRolls: items.reduce(
      (sum, item) => sum + item.seamTapeRolls * item.qty,
      0
    ),
    containsMulti62: items.some((item) => item.id === "multi62"),
    containsMultiDoor: items.some((item) => item.multiDoor)
  };
}

function candidate50Combinations(requiredFeet) {
  const candidates = [];
  const maxMulti = Math.ceil(requiredFeet / 168) + 1;

  for (let multi50 = 0; multi50 <= maxMulti; multi50 += 1) {
    for (let oversized = 0; oversized <= 3; oversized += 1) {
      for (let double = 0; double <= 3; double += 1) {
        for (let single = 0; single <= 3; single += 1) {
          const candidate = makeCombination({
            multi50,
            oversized,
            double,
            single
          });

          if (candidate.totalLinearFeet >= requiredFeet) {
            candidates.push(candidate);
          }
        }
      }
    }
  }

  return candidates.sort((a, b) => {
    const priceDelta = a.totalPrice - b.totalPrice;
    if (priceDelta !== 0) return priceDelta;

    const wasteDelta =
      a.totalLinearFeet - requiredFeet - (b.totalLinearFeet - requiredFeet);
    if (wasteDelta !== 0) return wasteDelta;

    return a.items.length - b.items.length;
  });
}

function candidate62Combination(requiredFeet) {
  const qty = Math.ceil(requiredFeet / 135);
  return makeCombination({ multi62: qty });
}

function recommendationNote(best, totals) {
  if (!best) return "";

  if (best.containsMulti62) {
    return "Uses the 62-inch multi-door roll, which can reduce the number of horizontal runs on 10-foot, 14-foot, and 15-foot door heights.";
  }

  if (totals.sharedSavings > 0) {
    return "Assumes eligible top strips are ripped lengthwise and shared across paired doors where practical.";
  }

  return "Uses the standard 50-inch roll-up door calculation with no shared top-strip savings needed.";
}

export function recommendKits(totals) {
  if (totals.doorCount === 0) return null;

  const required50 = totals.linear50Shared;
  const standardCandidates = candidate50Combinations(required50);
  const best50 = standardCandidates[0];

  const multi62 = candidate62Combination(totals.linear62);
  const multi62Fits = totals.linear62 <= multi62.totalLinearFeet;
  const multi62Practical =
    multi62Fits &&
    totals.linear62 < required50 &&
    multi62.totalPrice <= (best50?.totalPrice || Infinity);

  const best = multi62Practical ? multi62 : best50;
  const alternate = multi62Practical ? best50 : multi62Fits ? multi62 : null;

  return {
    best: best
      ? {
          ...best,
          requiredLinearFeet: best.containsMulti62
            ? totals.linear62
            : required50,
          spareLinearFeet:
            best.totalLinearFeet -
            (best.containsMulti62 ? totals.linear62 : required50),
          note: recommendationNote(best, totals)
        }
      : null,
    alternate:
      alternate && alternate.totalLinearFeet >= (alternate.containsMulti62 ? totals.linear62 : required50)
        ? {
            ...alternate,
            requiredLinearFeet: alternate.containsMulti62
              ? totals.linear62
              : required50,
            spareLinearFeet:
              alternate.totalLinearFeet -
              (alternate.containsMulti62 ? totals.linear62 : required50),
            note: recommendationNote(alternate, totals)
          }
        : null
  };
}

export function calculateTapePlan(doors, recommendation) {
  if (!recommendation?.best) return [];

  const spacingInches = recommendation.best.containsMultiDoor ? 18 : 18;
  return doors.map((door) => {
    const strips = Math.ceil((door.width * 12) / spacingInches) + 1;
    const tighterStrips = Math.ceil((door.width * 12) / 12) + 1;
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
  const doors = expandDoors(rows).map(calculateDoor);
  const squareFeet = doors.reduce((sum, door) => sum + door.squareFeet, 0);
  const linear50Max = doors.reduce((sum, door) => sum + door.linear50Max, 0);
  const sharedSavings = calculateSharedSavings(doors);
  const linear50Shared = linear50Max - sharedSavings;
  const linear62 = doors.reduce((sum, door) => sum + door.linear62, 0);
  const totals = {
    doorCount: doors.length,
    squareFeet,
    linear50Max,
    sharedSavings,
    linear50Shared,
    linear62
  };
  const recommendation = recommendKits(totals);
  const tapePlan = calculateTapePlan(doors, recommendation);
  const tapeFeetNeeded = tapePlan.reduce((sum, door) => sum + door.tapeFeet, 0);
  const tighterTapeFeetNeeded = tapePlan.reduce(
    (sum, door) => sum + door.tighterTapeFeet,
    0
  );
  const tapeFeetIncluded = (recommendation?.best?.tapeRolls || 0) * 180;

  return {
    rows: normalizeRows(rows),
    doors,
    totals,
    recommendation,
    tapePlan,
    tapeFeetNeeded,
    tighterTapeFeetNeeded,
    tapeFeetIncluded,
    tapeShortfall: Math.max(0, tapeFeetNeeded - tapeFeetIncluded)
  };
}

export function formatFeet(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}'` : `${rounded.toFixed(1)}'`;
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
