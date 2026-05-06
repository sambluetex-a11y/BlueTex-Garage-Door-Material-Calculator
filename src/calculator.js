const TEN_FOOT_TOP_STRIP_FEET = 2;

export const KITS = [
  {
    id: "single",
    name: "Single Door Kit",
    label: "1x Single Garage Door Kit",
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
    label: "1x Double Garage Door Kit",
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
    label: "1x Oversized Garage Door Kit",
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
    label: "1x Multi-Door Kit - 50\" Wide",
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
    label: "1x Multi-Door Kit - 62\" Wide",
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
    eligibleForSharedTop: door.height === 10
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

  return savings * (TEN_FOOT_TOP_STRIP_FEET / 2);
}

export function classifyRequest(rows) {
  const normalizedRows = normalizeRows(rows);
  const totalDoorCount = normalizedRows.reduce((sum, row) => sum + row.qty, 0);
  const totalArea = normalizedRows.reduce((sum, row) => sum + row.totalRowArea, 0);
  const maxSingleDoorArea = normalizedRows.reduce(
    (max, row) => Math.max(max, row.perDoorArea),
    0
  );
  const allDoorsSameSize =
    normalizedRows.length > 0 &&
    normalizedRows.every(
      (row) =>
        row.width === normalizedRows[0].width &&
        row.height === normalizedRows[0].height
    );
  const onlyOneActiveDoorRow = normalizedRows.length === 1;
  const exactlyOneTotalDoor = totalDoorCount === 1;
  const everyDoorAtMost10x10 = normalizedRows.every(
    (row) => row.width <= 10 && row.height <= 10
  );

  return {
    rows: normalizedRows,
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

function isMulti50UseCase(classification) {
  if (!classification.allDoorsSameSize) return false;
  const [row] = classification.rows;
  if (!row) return false;

  const fitsEightFootSet =
    classification.totalDoorCount >= 5 &&
    classification.totalDoorCount <= 10 &&
    row.width <= 8 &&
    row.height <= 8;
  const fitsTwelveFootSet =
    classification.totalDoorCount >= 3 &&
    classification.totalDoorCount <= 4 &&
    row.width <= 12 &&
    row.height <= 12;

  return fitsEightFootSet || fitsTwelveFootSet;
}

function isMulti62UseCase(classification) {
  if (!classification.allDoorsSameSize) return false;
  const [row] = classification.rows;
  if (!row) return false;

  const fitsTenFootSet =
    classification.totalDoorCount >= 3 &&
    classification.totalDoorCount <= 6 &&
    row.width <= 10 &&
    row.height === 10;
  const fitsFifteenFootSet =
    classification.totalDoorCount >= 3 &&
    classification.totalDoorCount <= 6 &&
    row.width <= 15 &&
    row.height === 15;

  return fitsTenFootSet || fitsFifteenFootSet;
}

export function getEligibleFamilies(classification) {
  if (classification.totalDoorCount === 0) return [];

  if (classification.totalDoorCount === 1) {
    const [row] = classification.rows;
    if (row.width <= 12 && row.height <= 12 && row.perDoorArea <= 150) {
      return ["single", "double", "oversized"];
    }
    if (row.perDoorArea <= 205) {
      return ["double", "oversized"];
    }
    if (row.perDoorArea <= 295) {
      return ["oversized"];
    }
    return ["custom"];
  }

  if (classification.totalDoorCount === 2) {
    const eligible = [];
    if (classification.everyDoorAtMost10x10 || classification.totalArea <= 205) {
      eligible.push("double");
    }
    if (classification.totalArea <= 295) {
      eligible.push("oversized");
    }
    if (isMulti50UseCase(classification)) eligible.push("multi50");
    if (isMulti62UseCase(classification)) eligible.push("multi62");
    return eligible.length > 0 ? eligible : ["custom"];
  }

  const eligible = [];
  if (isMulti50UseCase(classification)) eligible.push("multi50");
  if (isMulti62UseCase(classification)) eligible.push("multi62");
  return eligible.length > 0 ? eligible : ["custom"];
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

export function calculateFootageForFamily(materialMath, family) {
  if (family === "multi62") return materialMath.footage62;
  if (family === "custom") return null;
  return materialMath.efficient50Footage;
}

function makeRecommendation(family, classification, materialMath) {
  const kit = kitById(family);
  const requiredLinearFeet = calculateFootageForFamily(materialMath, family);
  const item =
    family === "custom"
      ? null
      : {
          ...kit,
          qty: 1
        };

  return {
    family,
    label: kit.label,
    estimatedPrice: kit.price,
    requiredLinearFeet,
    totalLinearFeet: kit.linearFeet,
    spareLinearFeet:
      kit.linearFeet === null || requiredLinearFeet === null
        ? null
        : kit.linearFeet - requiredLinearFeet,
    coverageSqft: kit.coverageSqft,
    tapeRolls: kit.tapeRolls,
    seamTapeRolls: kit.seamTapeRolls,
    containsMultiDoor: Boolean(kit.multiDoor),
    containsMulti62: family === "multi62",
    items: item ? [item] : [],
    reasoning: buildExplanation(family, classification, materialMath)
  };
}

function compareMultiDoorFamilies(a, b) {
  if (a.family === b.family) return 0;
  const aClean = a.requiredLinearFeet <= a.totalLinearFeet;
  const bClean = b.requiredLinearFeet <= b.totalLinearFeet;
  if (aClean !== bClean) return aClean ? -1 : 1;

  const aWaste = a.totalLinearFeet - a.requiredLinearFeet;
  const bWaste = b.totalLinearFeet - b.requiredLinearFeet;
  if (aWaste !== bWaste) return aWaste - bWaste;

  if (a.estimatedPrice !== b.estimatedPrice) {
    return a.estimatedPrice - b.estimatedPrice;
  }

  return a.family === "multi62" ? -1 : 1;
}

export function choosePrimaryRecommendation(eligibleResults, classification) {
  if (eligibleResults.length === 0) return null;

  if (classification.totalDoorCount === 1) {
    const priority = ["single", "double", "oversized", "custom"];
    return eligibleResults.sort(
      (a, b) => priority.indexOf(a.family) - priority.indexOf(b.family)
    )[0];
  }

  if (classification.totalDoorCount === 2) {
    const priority = ["double", "oversized", "custom"];
    return eligibleResults.sort(
      (a, b) => priority.indexOf(a.family) - priority.indexOf(b.family)
    )[0];
  }

  const multiDoorResults = eligibleResults.filter((result) =>
    ["multi50", "multi62"].includes(result.family)
  );
  if (multiDoorResults.length > 0) {
    return multiDoorResults.sort(compareMultiDoorFamilies)[0];
  }

  return eligibleResults.find((result) => result.family === "custom");
}

export function buildExplanation(family, classification, materialMath) {
  if (family === "single") {
    return [
      "This is one door within the Single kit limit of 12' x 12' and 150 sq ft, so the Single Garage Door Kit is the correct standard kit."
    ];
  }

  if (family === "double" && classification.totalDoorCount === 1) {
    return [
      "This is one larger door over the Single kit size, but it is under the 205 sq ft Double kit limit, so the Double Garage Door Kit is the correct standard kit."
    ];
  }

  if (family === "double") {
    return [
      "This two-door layout fits the Double kit family before any multi-door options are considered."
    ];
  }

  if (family === "oversized" && classification.totalDoorCount === 1) {
    return [
      "This is a single large door under the 295 sq ft limit, so the Oversized Garage Door Kit is the correct standard kit."
    ];
  }

  if (family === "oversized") {
    return [
      "This layout is above the Double kit range but stays within the 295 sq ft Oversized kit limit, so the Oversized Garage Door Kit is the correct standard kit."
    ];
  }

  if (family === "multi62") {
    return [
      "This layout is a true multi-door use case with doors that align with the 62\" multi-door kit rules.",
      "The calculator compares multi-door layouts after confirming the request belongs in the multi-door product family."
    ];
  }

  if (family === "multi50") {
    return [
      "This layout is a true multi-door use case that matches the 50\" multi-door kit assumptions.",
      "Multi-door kits are considered only after door count and size rules confirm the product family is valid."
    ];
  }

  return [
    "This layout exceeds the standard pre-made kit limits, so a custom larger-roll setup is recommended.",
    `${materialMath.footage50}' of 50\" planning footage and ${materialMath.footage62}' of 62\" planning footage were calculated for quoting.`
  ];
}

export function recommendKits(rows) {
  const classification = classifyRequest(rows);
  const materialMath = calculateMaterialMath(rows);
  const eligibleFamilies = getEligibleFamilies(classification);
  const eligibleResults = eligibleFamilies.map((family) =>
    makeRecommendation(family, classification, materialMath)
  );
  const primaryRecommendation = choosePrimaryRecommendation(
    eligibleResults,
    classification
  );
  const alternativeRecommendations = eligibleResults.filter(
    (result) => result.family !== primaryRecommendation?.family
  );
  const warnings = [];

  if (primaryRecommendation?.family === "custom") {
    warnings.push(
      "Standard kit limits are exceeded. Use the footage math for a custom roll or manual quote."
    );
  }

  if (
    primaryRecommendation?.spareLinearFeet !== null &&
    primaryRecommendation?.spareLinearFeet < 0
  ) {
    warnings.push(
      "This recommendation follows BlueTex kit coverage limits first. Check final strip layout for unusually wide doors."
    );
  }

  return {
    primaryRecommendation,
    alternativeRecommendations,
    materialMath,
    explanation: primaryRecommendation?.reasoning || [],
    warnings
  };
}

export function calculateTapePlan(doors, recommendation) {
  if (!recommendation?.primaryRecommendation) return [];

  const spacingInches = 18;
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
  const tapeFeetIncluded =
    (recommendation.primaryRecommendation?.tapeRolls || 0) * 180;

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
