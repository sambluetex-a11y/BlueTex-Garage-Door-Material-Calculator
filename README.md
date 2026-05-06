# BlueTex Garage Door Material Calculator

A static, dependency-free calculator for BlueTex roll-up garage door insulation kits.

## What It Calculates

- Horizontal runs per door
- Maximum linear footage with no shared top strips
- Efficient linear footage when eligible top strips can be shared
- 62-inch multi-door material usage when that option is practical
- Product-family-first kit recommendation
- Double-sided tape strip layout per door
- Whether included tape rolls cover the recommended layout

## Local Preview

```bash
npm test
npm run serve
```

Then open `http://localhost:5173`.

## Embed Notes

This project is plain HTML, CSS, and JavaScript so it can be hosted as a standalone tool or copied into a Shopify page section. Use `?embed=1` on the URL for the tighter website-friendly display.

## Calculation Reference

The roll-up door calculator follows a layered BlueTex recommendation model:

1. Normalize active door rows and classify the request by door count, area, and dimensions.
2. Choose eligible product families first: Single, Double, Oversized, Multi-Door, or Custom / Larger Roll.
3. Calculate material footage inside the valid family set.
4. Use 4-foot horizontal runs for 50-inch material and 5-foot horizontal runs for 62-inch material.
5. Apply conservative 10-foot-door shared top-strip savings only after eligibility is determined.

The 62-inch multi-door option is evaluated separately with 5-foot effective runs.
