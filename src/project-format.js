"use strict";
// project-format.js — shared editor source; load order is declared in index.html.
function snapshot() {
  return projectFromState({
    W,
    H,
    DPI,
    layers,
    active,
    guides,
    documentPaths,
    activePath,
    selection,
    zoom,
    rulersVisible,
    guidesVisible,
    name: $("documentName").textContent,
    scrollLeft: $("stage").scrollLeft,
    scrollTop: $("stage").scrollTop,
  });
}

function equalProject(a, b) {
  if (JSON.stringify(a.selection) !== JSON.stringify(b.selection)) return false;
  if (
    a.width !== b.width ||
    a.height !== b.height ||
    a.dpi !== b.dpi ||
    a.layers.length !== b.layers.length ||
    JSON.stringify(a.guides) !== JSON.stringify(b.guides) ||
    JSON.stringify(a.documentPaths) !== JSON.stringify(b.documentPaths)
  )
    return false;
  for (let i = 0; i < a.layers.length; i++) {
    const x = a.layers[i],
      y = b.layers[i];
    if (x.image !== y.image) return false;
    const { image: ix, ...mx } = x,
      { image: iy, ...my } = y;
    if (JSON.stringify(mx) !== JSON.stringify(my)) return false;
  }
  return true;
}
function sealHistory() {
  if (drag || penDrag || guideDrag || busy || !history.length) return;
  const command = history.at(-1);
  const after = snapshot();
  if (equalProject(command.before, after)) {
    history.pop();
    sliderGroup = null;
  } else command.after = after;
}

function checkpoint(label = "Edit") {
  if (label === "Edit") label = tool === "pen" ? "Edit path" : "Edit layer";
  const before = snapshot();
  if (history.length && !history.at(-1).after) history.at(-1).after = before;
  history.push({ before, after: null, label, createdAt: Date.now() });
  future = [];
  documentDirty = true;
  autosaveDirty = true;
  pruneHistory();
}
async function decode(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Could not read image"));
    im.src = src;
  });
}
function validateProject(s) {
  if (
    !s ||
    s.format !== "picturesque" ||
    ![1, 2].includes(s.version) ||
    !Array.isArray(s.layers) ||
    !s.layers.length
  )
    throw new Error("Unsupported Picturesque project");
  validSize(s.width, s.height);
  if (
    s.dpi !== undefined &&
    (!Number.isInteger(s.dpi) || s.dpi < 1 || s.dpi > 2400)
  )
    throw new Error("Invalid resolution");
  if (s.version === 2) {
    if (typeof s.name !== "string" || s.name.length > 200)
      throw new Error("Invalid document name");
    if (
      !s.view ||
      !Number.isFinite(s.view.zoom) ||
      s.view.zoom < 0.05 ||
      s.view.zoom > 4 ||
      !["left", "top"].every(
        (k) => Number.isFinite(s.view[k]) && s.view[k] >= 0,
      ) ||
      typeof s.view.rulers !== "boolean" ||
      typeof s.view.guides !== "boolean"
    )
      throw new Error("Invalid document view");
  }
  validateDocumentPaths(s.documentPaths || []);
  for (const l of s.layers) {
    if (
      typeof l.image !== "string" ||
      !l.image.startsWith("data:image/png;base64,") ||
      typeof l.name !== "string" ||
      typeof l.visible !== "boolean" ||
      !Number.isFinite(l.x) ||
      !Number.isFinite(l.y) ||
      !Number.isFinite(l.opacity) ||
      l.opacity < 0 ||
      l.opacity > 1 ||
      ![
        "source-over",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
      ].includes(l.blend) ||
      !["brightness", "contrast", "saturation"].every(
        (k) => Number.isFinite(l[k]) && l[k] >= 0 && l[k] <= 200,
      )
    )
      throw new Error("Invalid project layer");
    if (l.vector) {
      if (s.version < 2 || l.text) throw new Error("Invalid vector layer");
      validateVector(l.vector);
    }
    if (l.text) validateRichText(l.text);
  }
}
async function decodeProject(s) {
  validateProject(s);
  const decoded = [];
  for (const raw of s.layers) {
    const im = await decode(raw.image);
    validSize(im.width, im.height);
    const c = surface(im.width, im.height);
    c.getContext("2d").drawImage(im, 0, 0);
    encodedCache.set(c, raw.image);
    const { image, ...l } = raw;
    decoded.push({
      ...l,
      ...(l.vector ? { vector: clonePen(l.vector) } : {}),
      ...(l.text ? { text: clonePen(l.text) } : {}),
      c,
    });
  }
  return {
    name: s.version === 2 ? s.name : undefined,
    view: s.version === 2 ? clonePen(s.view) : undefined,
    selection:
      s.version === 2 ? unpackSelection(s.selection, s.width, s.height) : null,
    W: s.width,
    H: s.height,
    DPI: s.dpi || 96,
    layers: decoded,
    active:
      Number.isInteger(s.active) && s.active >= 0 && s.active < decoded.length
        ? s.active
        : 0,
    guides: Array.isArray(s.guides)
      ? s.guides
          .filter(
            (g) =>
              ["h", "v"].includes(g.axis) &&
              Number.isFinite(g.pos) &&
              g.pos >= 0 &&
              g.pos <= (g.axis === "v" ? s.width : s.height),
          )
          .map((g) => ({ ...g }))
      : [],
    documentPaths: validateDocumentPaths(s.documentPaths || []),
    activePath:
      Number.isInteger(s.activePath) &&
      s.activePath >= 0 &&
      s.activePath < (s.documentPaths || []).length
        ? s.activePath
        : -1,
  };
}
function applyProject(state) {
  ({ W, H, DPI, layers, active, guides, documentPaths, activePath } = state);
  selection = state.selection || null;
  $("penSource").value = "document";
  chosenAnchor = -1;
  penDrawing = false;
  penDrag = null;
  panelKey = "";
  lastCompositeKey = "";
}
async function restore(s) {
  const state = await decodeProject(s);
  applyProject(state);
  refresh();
}
async function travel(from, to) {
  if (!from.length || busy || drag || penDrag || guideDrag) return;
  const command = from.at(-1),
    undo = from === history;
  setBusy(true);
  try {
    const currentState = snapshot(),
      target = undo ? command.before : command.after;
    if (!target) throw new Error("This history step has no redo state");
    const decoded = await decodeProject(target);
    if (undo) command.after = currentState;
    applyProject(decoded);
    from.pop();
    to.push(command);
    documentDirty = true;
    autosaveDirty = true;
    sliderGroup = null;
    pruneHistory();
    refresh();
  } catch (e) {
    $("clipboardStatus").textContent = "History unchanged: " + e.message;
  } finally {
    setBusy(false);
  }
}
