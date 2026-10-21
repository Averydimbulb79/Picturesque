"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCanvasRenderer } = require("../src/engine.js");

function canvas(fail = false) {
  const events = [];
  const context = new Proxy({
    clearRect: (...args) => events.push(["clear", ...args]),
    save: () => events.push(["save"]),
    restore: () => events.push(["restore"]),
    drawImage: (...args) => {
      events.push(["draw", ...args]);
      if (fail) throw new Error("image failed");
    },
  }, {
    set(object, key, value) {
      events.push([key, value]);
      object[key] = value;
      return true;
    },
  });
  return { events, getContext: () => context };
}
const red = Object.freeze({
  c: Object.freeze({ name: "raster" }), x: -4, y: 9, visible: true,
  opacity: 0.35, blend: "multiply", brightness: 80, contrast: 120, saturation: 60,
});

test("Renderer preserves bottom-to-top ordering, offsets, alpha, blend and colour adjustment semantics", () => {
  const renderer = createCanvasRenderer();
  const top = Object.freeze({ ...red, c: "top", blend: "screen", x: 15 });
  const document = Object.freeze({
    width: 300, height: 200,
    layers: Object.freeze([red, Object.freeze({ ...red, visible: false }), top]),
  });
  const target = canvas();
  assert.equal(renderer.render(document, target), target);
  assert.deepEqual(target.events, [
    ["clear", 0, 0, 300, 200],
    ["save"], ["globalAlpha", 0.35], ["globalCompositeOperation", "multiply"],
    ["filter", "brightness(80%) contrast(120%) saturate(60%)"],
    ["draw", red.c, -4, 9], ["restore"],
    ["save"], ["globalAlpha", 0.35], ["globalCompositeOperation", "screen"],
    ["filter", "brightness(80%) contrast(120%) saturate(60%)"],
    ["draw", "top", 15, 9], ["restore"],
  ]);
});

test("Interleaved documents and export targets have no shared renderer document state", () => {
  const renderer = createCanvasRenderer();
  const a = { width: 300, height: 200, layers: [red] };
  const b = { width: 20, height: 10, layers: [] };
  const first = canvas(), second = canvas(), exported = canvas();
  renderer.render(a, first);
  renderer.render(b, second);
  renderer.render(a, exported);
  assert.deepEqual(first.events, exported.events);
  assert.deepEqual(second.events, [["clear", 0, 0, 20, 10]]);
});

test("Failed drawing restores canvas state and a missing context fails explicitly", () => {
  const renderer = createCanvasRenderer(), target = canvas(true);
  assert.throws(() => renderer.render({ width: 2, height: 2, layers: [red] }, target), /image failed/);
  assert.deepEqual(target.events.at(-1), ["restore"]);
  assert.throws(() => renderer.render({ width: 2, height: 2, layers: [] },
    { getContext: () => null }), /2D canvas/);
});
