/**
 * Chrome laid out with CCSS-style constraints, the relational rules of
 * Grid Style Sheets.
 *
 * Tooling this references:
 * - https://gss.github.io/guides/tools — logger (?log=1), VFL→CCSS, CCSS→AST
 * - https://github.com/gss/engine — GSS runtime
 * - https://github.com/gss/compiler — GSS compiler
 * - https://gss.github.io/ — guides
 *
 * `?log=1` groups constraints that share a property, the way the GSS logger
 * does. Alt-click an element to keep only that element's rows.
 */

export type Box = { left: number; top: number; width: number; height: number };

export type GssConstraint = {
  id: string;
  element: string;
  property: string;
  expr: string;
  value: number | string;
};

export type Insets = { top: number; right: number; bottom: number; left: number };

export type ChromeInput = {
  width: number;
  height: number;
  insets: Insets;
  panel: boolean;
  log: boolean;
  motion: boolean;
};

export type Chrome = {
  mute: Box;
  info: Box;
  panel: Box | null;
  hint: Box;
  motion: Box | null;
  log: Box | null;
  constraints: GssConstraint[];
};

const SIZE = 44;
const GAP = 8;
const MARGIN = 16;

export function solveChrome(input: ChromeInput): Chrome {
  const { width, height, insets, panel, log, motion } = input;
  const rows: GssConstraint[] = [];
  const add = (element: string, property: string, expr: string, value: number | string) => {
    rows.push({ id: `${element}.${property}`, element, property, expr, value });
  };

  add("viewport", "width", "viewport[width] == measured", width);
  add("viewport", "height", "viewport[height] == measured", height);
  add("gap", "gap", "gap == 8", GAP);
  add("size", "size", "size == 44", SIZE);
  add("margin", "margin", "margin == 16", MARGIN);

  const info: Box = {
    width: SIZE,
    height: SIZE,
    left: 0,
    top: insets.top + MARGIN,
  };
  info.left = width - insets.right - MARGIN - SIZE;
  add("info", "width", "info[width] == size", info.width);
  add("info", "height", "info[height] == size", info.height);
  add("info", "top", "info[top] == inset-top + margin", info.top);
  add("info", "right", "info[right] == viewport[width] - inset-right - margin", info.left + info.width);
  add("info", "left", "info[left] == info[right] - info[width]", info.left);

  const mute: Box = {
    width: SIZE,
    height: SIZE,
    top: info.top,
    left: info.left - GAP - SIZE,
  };
  add("mute", "width", "mute[width] == size", mute.width);
  add("mute", "height", "mute[height] == size", mute.height);
  add("mute", "top", "mute[top] == info[top]", mute.top);
  add("mute", "right", "mute[right] == info[left] - gap", mute.left + mute.width);
  add("mute", "left", "mute[left] == mute[right] - mute[width]", mute.left);

  let panelBox: Box | null = null;
  if (panel) {
    const maxW = width - insets.left - insets.right - MARGIN * 2;
    const panelW = Math.min(300, maxW);
    panelBox = {
      width: panelW,
      height: 0,
      top: info.top + info.height + GAP,
      left: info.left + info.width - panelW,
    };
    add("panel", "width", "panel[width] <= viewport[width] - insets - margin * 2", panelBox.width);
    add("panel", "right", "panel[right] == info[right]", panelBox.left + panelBox.width);
    add("panel", "left", "panel[left] == panel[right] - panel[width]", panelBox.left);
    add("panel", "top", "panel[top] == info[bottom] + gap", panelBox.top);
    add("panel", "height", "panel[height] == intrinsic-height", "intrinsic");
  }

  let logBox: Box | null = null;
  if (log) {
    const logH = Math.min(220, Math.max(96, height * 0.34));
    logBox = {
      left: insets.left + MARGIN,
      width: width - insets.left - insets.right - MARGIN * 2,
      height: logH,
      top: height - insets.bottom - MARGIN - logH,
    };
    add("log", "left", "log[left] == inset-left + margin", logBox.left);
    add("log", "right", "log[right] == viewport[width] - inset-right - margin", logBox.left + logBox.width);
    add("log", "width", "log[width] == log[right] - log[left]", logBox.width);
    add("log", "bottom", "log[bottom] == viewport[height] - inset-bottom - margin", logBox.top + logBox.height);
    add("log", "height", "log[height] == min(220, viewport[height] * 0.34)", logBox.height);
    add("log", "top", "log[top] == log[bottom] - log[height]", logBox.top);
  }

  const hintH = 52;
  const hintBottom = logBox ? logBox.top - GAP : height - insets.bottom - MARGIN;
  const hint: Box = {
    left: insets.left + MARGIN,
    top: hintBottom - hintH,
    width: Math.min(520, width - insets.left - insets.right - MARGIN * 2),
    height: hintH,
  };
  add("hint", "left", "hint[left] == inset-left + margin", hint.left);
  add("hint", "height", "hint[height] == 52", hint.height);
  add(
    "hint",
    "bottom",
    logBox ? "hint[bottom] == log[top] - gap" : "hint[bottom] == viewport[height] - inset-bottom - margin",
    hint.top + hint.height,
  );
  add("hint", "width", "hint[width] <= viewport[width] - insets - margin * 2", hint.width);

  let motionBox: Box | null = null;
  if (motion) {
    motionBox = {
      left: insets.left + MARGIN,
      top: info.top,
      width: 132,
      height: SIZE,
    };
    add("motion", "left", "motion[left] == inset-left + margin", motionBox.left);
    add("motion", "top", "motion[top] == info[top]", motionBox.top);
    add("motion", "height", "motion[height] == size", motionBox.height);
    add("motion", "width", "motion[width] == 132", motionBox.width);
  }

  return { mute, info, panel: panelBox, hint, motion: motionBox, log: logBox, constraints: rows };
}

export function groupConstraints(rows: GssConstraint[], element: string | null) {
  const filtered = element ? rows.filter((row) => row.element === element) : rows;
  const groups = new Map<string, GssConstraint[]>();
  for (const row of filtered) {
    const list = groups.get(row.property) ?? [];
    list.push(row);
    groups.set(row.property, list);
  }
  return [...groups.entries()];
}
