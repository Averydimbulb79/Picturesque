"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.join(__dirname, "..");
const baseline = require("./fixtures/interface-baseline.json");

test("Engine migration preserves the approved HTML, styles, icons and menu definitions", () => {
  for (const [filename, expected] of Object.entries(baseline.uiFiles)) {
    const actual = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(root, filename))).digest("hex");
    assert.equal(actual, expected,
      filename + ": approved interface changed; inspect the visual difference before deliberately updating the baseline");
  }
});

test("Baseline retains tools, menus, element identities and shared-script order", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const values = (pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
  assert.deepEqual(values(/<button[^>]*data-tool="([^"]+)"/g), baseline.tools);
  assert.deepEqual(values(/data-menu="([^"]+)"/g), baseline.menus);
  assert.deepEqual(values(/\bid="([^"]+)"/g), baseline.ids);
  assert.deepEqual(values(/<script defer src="([^"]+)"/g), baseline.scripts);
  assert.equal(new Set(baseline.ids).size, baseline.ids.length, "duplicate element IDs");
});
