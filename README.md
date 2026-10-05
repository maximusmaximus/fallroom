# Fallroom

A vertical fidget. Different objects, from 1/100 to 10× a reference size, fall from the top of the browser into a plaster room whose width and depth are the same. Tilt the phone and the pile slides to the low side, tumbling over itself. On a desktop viewport, hold a toy: it swells by 25%, pops, vaporizes, and the higher pitch shoves everything around it.

Each material has its own voice. Impacts play together. Faster machines get more toys, softer shadows, bloom, HRTF, and a higher-rate mix.

## GSS

The mute, info, hint, and logger are positioned with CCSS-style constraints — the relational layout language of [Grid Style Sheets](https://github.com/gss/engine).

This project references the GSS tooling:

- [GSS tools](https://gss.github.io/guides/tools) — constraint logger, VFL → CCSS viewer, CCSS → AST viewer
- [GSS engine](https://github.com/gss/engine) — runtime that solves CCSS and VFL with Cassowary
- [GSS compiler](https://github.com/gss/compiler) — rules in, AST out
- [GSS website](https://gss.github.io/) — guides

Add `?log=1` to mirror the GSS logger: constraints are grouped when they share a property. Alt-click an element to show only the constraints that mention it.

Made in SF with <3 by [maxi.grok.me](https://maxi.grok.me).
