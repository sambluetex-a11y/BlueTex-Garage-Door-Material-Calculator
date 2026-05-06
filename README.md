# BlueTex Garage Door Material Calculator

A static, dependency-free calculator for BlueTex roll-up garage door insulation kits.

## What It Calculates

- Horizontal runs per door
- Maximum linear footage with no shared top strips
- Efficient linear footage when eligible top strips can be shared
- 62-inch multi-door material usage when that option is practical
- Recommended kit or kit combination
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

The roll-up door calculator follows the BlueTex measuring method:

1. Divide door height by 4 and round up for 50-inch material.
2. Multiply runs by door width.
3. Multiply by quantity.
4. For eligible top strips that are 25 inches or shorter, pair doors to share one ripped strip across two doors.

The 62-inch multi-door option is evaluated separately with 5-foot effective runs.
