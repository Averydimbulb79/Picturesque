"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script defer src="([^"]+)"/g)].map(
  (x) => x[1],
);
class Element {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.value = "";
    this.checked = false;
    this.open = false;
    this.width = 100;
    this.height = 80;
    this.clientWidth = 900;
    this.clientHeight = 600;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.parentElement = { hidden: false };
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  append(...x) {
    this.children.push(...x);
  }
  prepend(x) {
    this.children.unshift(x);
  }
  replaceChildren(...x) {
    this.children = x;
  }
  setAttribute(k, v) {
    this[k] = v;
  }
  querySelector() {
    return new Element("button");
  }
  querySelectorAll() {
    return [];
  }
  get options() {
    return this.children;
  }
  addEventListener() {}
  focus() {}
  click() {
    return this.onclick?.();
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 80 };
  }
  setPointerCapture() {}
  getContext() {
    return (
      this.g ||
      (this.g = new Proxy(
        {
          canvas: this,
          createImageData: (w, h) => ({
            data: new Uint8ClampedArray(w * h * 4),
          }),
          getImageData: (x, y, w, h) => ({
            data: new Uint8ClampedArray(w * h * 4),
          }),
        },
        { get: (o, k) => (k in o ? o[k] : () => {}) },
      ))
    );
  }
  toDataURL() {
    return (
      "data:image/png;base64," +
      Buffer.from(JSON.stringify({ w: this.width, h: this.height })).toString(
        "base64",
      )
    );
  }
}
function editor(bridge = null) {
  const els = {};
  const el = (id) => els[id] || (els[id] = new Element());
  el("color").value = "#a7edb3";
  el("penSource").value = "document";
  el("penMode").value = "draw";
  el("selectionShape").value = "rectangle";
  el("selectionMode").value = "replace";
  class Image {
    set src(v) {
      try {
        const d = JSON.parse(Buffer.from(v.split(",")[1], "base64"));
        this.width = d.w;
        this.height = d.h;
        queueMicrotask(() => this.onload());
      } catch {
        queueMicrotask(() => this.onerror());
      }
    }
  }
  const sandbox = {
    Blob,
    Uint8Array,
    Uint8ClampedArray,
    WeakMap,
    Set,
    Map,
    ArrayBuffer,
    Image,
    URL: { createObjectURL: () => "", revokeObjectURL() {} },
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    document: {
      getElementById: el,
      createElement: (t) => new Element(t),
      querySelector: () => new Element(),
      querySelectorAll: () => [],
      addEventListener() {},
      body: new Element(),
    },
    window: {
      picturesqueDesktop: bridge,
      addEventListener() {},
      matchMedia: () => ({ matches: false }),
    },
    navigator: {},
    alert() {},
    confirm: () => true,
  };
  vm.createContext(sandbox);
  for (const filename of scripts.filter((x) => !x.endsWith("bootstrap.js")))
    vm.runInContext(
      fs.readFileSync(path.join(root, filename), "utf8"),
      sandbox,
      { filename },
    );
  const run = (s) => vm.runInContext(s, sandbox);
  run("newDoc(100,80,false)");
  return { run, el };
}
test("All script and style references exist, parse and preserve deterministic load order", () => {
  assert.equal(scripts[0], "src/platform.js");
  assert.equal(scripts.at(-1), "src/bootstrap.js");
  assert.equal(scripts.length, new Set(scripts).size);
  for (const filename of scripts)
    new vm.Script(fs.readFileSync(path.join(root, filename), "utf8"));
  assert(fs.existsSync(path.join(root, "styles/editor.css")));
  assert(!/<script>/.test(html));
  assert(html.includes("v0.4.9"));
});
test("Split editor retains v2 vectors, selections, views and workspace compatibility", async () => {
  const { run } = editor();
  run(
    "zoom=.5;$('documentName').textContent='Composition';selection={bits:new Uint8Array(W*H),inverted:true};selection.bits[7]=1;checkpoint('Vector');addVectorLayer([shapePath('rect',{x:5,y:6,w:60,h:50}),shapePath('ellipse',{x:20,y:20,w:20,h:20})],'Compound');refresh();globalThis.saved=snapshot()",
  );
  await run("decodeProject(saved).then(s=>globalThis.decoded=s)");
  assert.equal(run("decoded.name"), "Composition");
  assert.equal(run("decoded.selection.bits[7]"), 1);
  assert.equal(run("decoded.view.zoom"), 0.5);
  run("decoded.layers[1].vector.paths[0].nodes[0].x=99");
  assert.equal(run("saved.layers[1].vector.paths[0].nodes[0].x"), 5);
  run("$('duplicate').click();current().vector.paths[0].nodes[0].x=10");
  assert.equal(run("layers[1].vector.paths[0].nodes[0].x"), 5);
  run("transform('right')");
  assert.equal(run("current().c.width"), 80);
  await run("travel(history,future)");
  assert.equal(run("current().c.width"), 100);
  await run("travel(future,history)");
  assert.equal(run("current().c.width"), 80);
  run("newDoc(50,40,false);globalThis.bundle=workspaceSnapshot()");
  await run("decodeWorkspace(bundle).then(s=>globalThis.workspaceDecoded=s)");
  assert.equal(run("workspaceDecoded.states.length"), 2);
  run("installWorkspace(workspaceDecoded)");
  assert.equal(run("W"), 50);
  run("activateDocument(openDocuments[0])");
  assert.equal(run("selection.bits[7]"), 1);
  assert.equal(run("zoom"), 0.5);
  await assert.rejects(
    run(
      "decodeWorkspace({...bundle,documents:[bundle.documents[0],{project:{format:'bad'}}]})",
    ),
  );
  assert.equal(run("W"), 100);
});
test("Desktop Save cancellation preserves dirty state; Save reuses token; Save As clears it", async () => {
  const calls = [];
  let cancelled = true;
  const bridge = {
    setState() {},
    saveProject: async (v) => {
      calls.push(v);
      return cancelled
        ? { cancelled: true }
        : {
            cancelled: false,
            token: "native-token",
            name: "Saved.picturesque",
          };
    },
  };
  const { run } = editor(bridge);
  await run("saveProject()");
  assert.equal(run("documentDirty"), true);
  assert.equal(calls.length, 1);
  cancelled = false;
  await run("saveProject()");
  assert.equal(run("documentDirty"), false);
  await run("saveProject()");
  assert.equal(calls.at(-1).token, "native-token");
  await run("saveProject(true)");
  assert.equal(calls.at(-1).token, null);
});
test("Export option validation still rejects unsupported values after extraction", () => {
  const { run } = editor();
  assert.throws(() => run("checkedExportOptions({format:'gif'})"));
  assert.throws(() =>
    run(
      "checkedExportOptions({format:'png',width:1.5,height:2,dpi:96,quality:94,background:'#ffffff',name:'x'})",
    ),
  );
});
