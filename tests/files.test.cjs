"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createFileService, atomicWrite } = require("../desktop/files.cjs");
const project = JSON.stringify({
  format: "picturesque",
  version: 2,
  name: "Test",
  layers: [],
});
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "picturesque-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let chosen = path.join(root, "Test.picturesque"),
    choices = 0;
  const files = createFileService({
    userData: root,
    chooseSave: async () => {
      choices++;
      return chosen;
    },
  });
  return {
    root,
    files,
    setChoice: (value) => (chosen = value),
    get choices() {
      return choices;
    },
  };
}
test("Save, overwrite and Save As use authorized handles", async (t) => {
  const f = await fixture(t);
  const first = await f.files.saveProject({
    name: "Test.picturesque",
    text: project,
  });
  assert(first.token);
  assert.equal(f.choices, 1);
  await f.files.saveProject({
    token: first.token,
    text: project.replace("Test", "Changed"),
  });
  assert.equal(f.choices, 1);
  assert.match(
    await fs.readFile(path.join(f.root, "Test.picturesque"), "utf8"),
    /Changed/,
  );
  f.setChoice(path.join(f.root, "Other"));
  const second = await f.files.saveProject({ name: "Other", text: project });
  assert.notEqual(second.token, first.token);
  assert.equal(
    await fs.readFile(path.join(f.root, "Other.picturesque"), "utf8"),
    project,
  );
});
test("Cancellation and bad handles do not modify existing work", async (t) => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, "Test.picturesque"), "original");
  f.setChoice(null);
  assert.deepEqual(await f.files.saveProject({ text: project }), {
    cancelled: true,
  });
  await assert.rejects(
    f.files.saveProject({ token: "forged", text: project }),
    /Unknown file handle/,
  );
  assert.equal(
    await fs.readFile(path.join(f.root, "Test.picturesque"), "utf8"),
    "original",
  );
  await assert.rejects(
    f.files.saveProject({ text: '{"format":"bad"}' }),
    /Unsupported/,
  );
});
test("Native open preserves bytes and assigns a path-specific handle", async (t) => {
  const f = await fixture(t);
  const filename = path.join(f.root, "Source.picturesque");
  await fs.writeFile(filename, project);
  const opened = await f.files.open(filename);
  assert.equal(opened.kind, "project");
  assert.equal(opened.text, project);
  await f.files.saveProject({ token: opened.token, text: project });
  assert.equal(f.choices, 0);
  await assert.rejects(
    f.files.open(path.join(f.root, "test.exe")),
    /Only Picturesque/,
  );
});
test("Image exports and workspace backups use chosen paths; unsupported formats fail", async (t) => {
  const f = await fixture(t);
  f.setChoice(path.join(f.root, "export"));
  const bytes = Uint8Array.from([1, 2, 3]).buffer;
  await f.files.exportFile({ name: "image.png", bytes });
  assert.deepEqual(
    [...(await fs.readFile(path.join(f.root, "export.png")))],
    [1, 2, 3],
  );
  await assert.rejects(
    f.files.exportFile({ name: "evil.exe", bytes }),
    /Unsupported/,
  );
  await assert.rejects(
    f.files.exportFile({ name: "x.png", bytes: "bad" }),
    /Invalid export/,
  );
  f.setChoice(null);
  assert.deepEqual(
    await f.files.exportFile({ name: "backup.picturesque-workspace", bytes }),
    { cancelled: true },
  );
});
test("Recovery is serialized in the app data directory and can be discarded", async (t) => {
  const f = await fixture(t);
  assert.equal(await f.files.recovery({ mode: "get" }), null);
  const value = { savedAt: 1, workspace: { documents: [{ name: "A" }] } };
  await f.files.recovery({ mode: "put", value });
  assert.deepEqual(await f.files.recovery({ mode: "get" }), value);
  await f.files.recovery({ mode: "delete" });
  assert.equal(await f.files.recovery({ mode: "get" }), null);
  await assert.rejects(f.files.recovery({ mode: "invalid" }), /Invalid/);
});
test("Atomic write leaves original data intact on rename failure", async (t) => {
  const f = await fixture(t);
  const directory = path.join(f.root, "destination");
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, "keep"), "original");
  await assert.rejects(atomicWrite(directory, "replacement"));
  assert.equal(
    await fs.readFile(path.join(directory, "keep"), "utf8"),
    "original",
  );
  assert.deepEqual(
    (await fs.readdir(f.root)).filter((x) => x.endsWith(".tmp")),
    [],
  );
});
