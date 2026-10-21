"use strict";
// history.js — shared editor source; load order is declared in index.html.
const encodedCache = new WeakMap(),
  layerBoundsCache = new WeakMap();
const HISTORY_LIMIT = 25,
  HISTORY_BUDGET = 64 * 1024 * 1024;
function encodedCanvas(c) {
  let value = encodedCache.get(c);
  if (value === undefined) {
    value = c.toDataURL();
    encodedCache.set(c, value);
  }
  return value;
}
function invalidateCanvas(c) {
  encodedCache.delete(c);
  layerBoundsCache.delete(c);
  thumbnailCache.delete(c);
  canvasVersions.set(c, (canvasVersions.get(c) || 0) + 1);
}
function allHistoryStacks() {
  return [
    ...openDocuments
      .filter((d) => d.id !== activeDocumentId)
      .flatMap((d) => [d.state.history, d.state.future]),
    history,
    future,
  ];
}
function historyBytes() {
  const seen = new Set();
  let bytes = 0;
  for (const command of allHistoryStacks().flat()) {
    for (const state of [command.before, command.after])
      if (state) {
        bytes +=
          2048 +
          (JSON.stringify(state.documentPaths || []).length +
            JSON.stringify(state.selection || null).length) *
            2 +
          state.layers.length * 512 +
          state.layers.reduce(
            (n, l) =>
              n +
              (l.text ? JSON.stringify(l.text).length * 2 : 0) +
              (l.vector ? JSON.stringify(l.vector).length * 2 : 0),
            0,
          );
        for (const l of state.layers)
          if (!seen.has(l.image)) {
            seen.add(l.image);
            bytes += l.image.length * 2;
          }
      }
  }
  return bytes;
}
function pruneHistory() {
  const stacks = allHistoryStacks();
  for (const stack of stacks)
    while (stack.length > HISTORY_LIMIT) stack.shift();
  while (historyBytes() > HISTORY_BUDGET) {
    let chosen = null;
    for (const stack of stacks)
      if (stack.length && (!chosen || stack[0].createdAt < chosen[0].createdAt))
        chosen = stack;
    if (!chosen) break;
    chosen.shift();
  }
}
let sliderGroup = null;
function sliderCheckpoint(id, pointer = false) {
  const time = Date.now();
  if (
    pointer ||
    !sliderGroup ||
    sliderGroup.id !== id ||
    sliderGroup.layer !== current() ||
    time - sliderGroup.time > 450 ||
    sliderGroup.state !== history.at(-1)
  ) {
    checkpoint("Adjust " + id);
    sliderGroup = { id, layer: current(), time, state: history.at(-1) };
  } else sliderGroup.time = time;
}
