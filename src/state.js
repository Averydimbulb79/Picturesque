"use strict";
// state.js — shared editor source; load order is declared in index.html.
"use strict";
const VERSION = "0.4.9";
const PROJECT_MAX_BYTES = 150000000;
const $ = (id) => document.getElementById(id),
  view = $("canvas"),
  ctx = view.getContext("2d"),
  overlay = $("overlay"),
  octx = overlay.getContext("2d");
let documentPaths = [],
  activePath = -1,
  chosenAnchor = -1,
  penDrawing = false,
  penDrag = null;
let guides = [],
  rulersVisible = true,
  guidesVisible = true,
  guideDrag = null;
let openDocuments = [],
  activeDocumentId = null,
  documentCounter = 0,
  documentDirty = false;
let DPI = 96,
  W = 1200,
  H = 800,
  layers = [],
  active = 0,
  tool = "move",
  selection = null,
  drag = null,
  zoom = 1,
  history = [],
  future = [],
  importMode = false,
  busy = false;

function setBusy(value) {
  busy = value;
  for (const element of [
    document.querySelector("header"),
    document.querySelector(".options"),
    document.querySelector(".workspace"),
    $("documentTabs"),
  ])
    if (element) element.inert = value;
  syncDesktopState();
}
function documentSlotAvailable() {
  if (openDocuments.length >= 8) {
    alert("Up to eight documents can be open. Save and close a tab first.");
    return false;
  }
  return true;
}
function completeDocumentState(state, name, dirty = true) {
  return {
    ...state,
    name,
    documentDirty: dirty,
    history: [],
    future: [],
    selection: state.selection || null,
    zoom: state.view?.zoom || 1,
    tool: "move",
    chosenAnchor: -1,
    scrollLeft: state.view?.left || 0,
    scrollTop: state.view?.top || 0,
    rulersVisible: state.view?.rulers !== false,
    guidesVisible: state.view?.guides !== false,
    name: String(state.name || name).slice(0, 200),
  };
}
function captureDocument() {
  const d = openDocuments.find((d) => d.id === activeDocumentId);
  if (!d) return;
  d.state = {
    W,
    H,
    DPI,
    layers,
    active,
    guides,
    documentPaths,
    activePath,
    chosenAnchor,
    selection,
    zoom,
    tool,
    history,
    future,
    documentDirty,
    rulersVisible,
    guidesVisible,
    name: $("documentName").textContent,
    scrollLeft: $("stage").scrollLeft,
    scrollTop: $("stage").scrollTop,
  };
}
function activateDocument(doc, saveCurrent = true) {
  if (saveCurrent) captureDocument();
  const state = doc.state;
  activeDocumentId = doc.id;
  applyProject(state);
  ({ history, future, selection, zoom, documentDirty } = state);
  rulersVisible = state.rulersVisible !== false;
  guidesVisible = state.guidesVisible !== false;
  chosenAnchor = state.chosenAnchor;
  sliderGroup = null;
  $("documentName").textContent = state.name;
  setTool(state.tool || "move");
  refresh();
  $("stage").scrollLeft = state.scrollLeft || 0;
  $("stage").scrollTop = state.scrollTop || 0;
  drawRulers();
}
function openDocumentState(project, name, dirty = true) {
  captureDocument();
  const doc = {
    id: ++documentCounter,
    state: completeDocumentState(project, name, dirty),
  };
  openDocuments.push(doc);
  activateDocument(doc, false);
  autosaveDirty = true;
  scheduleAutosave();
}
function switchDocument(id) {
  if (
    busy ||
    drag ||
    guideDrag ||
    penDrag ||
    $("dialog").open ||
    $("commandDialog").open
  )
    return;
  const doc = openDocuments.find((d) => d.id === id);
  if (!doc || id === activeDocumentId) return;
  activateDocument(doc);
  autosaveDirty = true;
  scheduleAutosave();
}
function closeDocument(id) {
  if (busy || drag || guideDrag || penDrag || $("dialog").open) return;
  captureDocument();
  const index = openDocuments.findIndex((d) => d.id === id),
    doc = openDocuments[index];
  if (!doc) return;
  if (
    doc.state.documentDirty &&
    !confirm(
      "Close " +
        doc.state.name +
        "? Save your project first if you need to keep it.",
    )
  )
    return;
  openDocuments.splice(index, 1);
  nativeProjectTokens.delete(id);
  if (id === activeDocumentId) {
    activeDocumentId = null;
    if (openDocuments.length)
      activateDocument(
        openDocuments[Math.min(index, openDocuments.length - 1)],
        false,
      );
    else newDoc(1200, 800, false);
  } else renderDocumentTabs();
  autosaveDirty = true;
  scheduleAutosave();
}
function renameDocument() {
  ask(
    "Rename document",
    [["name", "Document name", "text", $("documentName").textContent]],
    (value) => {
      $("documentName").textContent = value.name.slice(0, 200);
      documentDirty = true;
      autosaveDirty = true;
      captureDocument();
      renderDocumentTabs();
      scheduleAutosave();
    },
  );
}
function safeDocumentName() {
  return (
    ($("documentName").textContent || "Picturesque")
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\.(png|jpg|jpeg|webp|picturesque)$/i, "") || "Picturesque"
  );
}
let tabKey = "";
function renderDocumentTabs() {
  syncDesktopState();
  const key =
    activeDocumentId +
    "|" +
    openDocuments
      .map((d) =>
        [
          d.id,
          d.id === activeDocumentId
            ? $("documentName").textContent
            : d.state.name,
          d.id === activeDocumentId ? documentDirty : d.state.documentDirty,
        ].join(":"),
      )
      .join("|");
  if (key === tabKey) return;
  tabKey = key;
  const root = $("documentTabs");
  root.replaceChildren();
  openDocuments.forEach((d, i) => {
    const row = document.createElement("div");
    row.className =
      "document-tab" + (d.id === activeDocumentId ? " current" : "");
    const button = document.createElement("button"),
      name =
        d.id === activeDocumentId
          ? $("documentName").textContent
          : d.state.name,
      dirty = d.id === activeDocumentId ? documentDirty : d.state.documentDirty;
    button.textContent = name + (dirty ? " •" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(d.id === activeDocumentId));
    button.tabIndex = d.id === activeDocumentId ? 0 : -1;
    button.title = name + (dirty ? " — not downloaded as a project" : "");
    button.onclick = () => switchDocument(d.id);
    button.onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const next =
          openDocuments[
            (i + (e.key === "ArrowRight" ? 1 : -1) + openDocuments.length) %
              openDocuments.length
          ];
        switchDocument(next.id);
        $("documentTabs").querySelector('[aria-selected="true"]')?.focus();
      }
    };
    const close = document.createElement("button");
    close.textContent = "×";
    close.setAttribute("aria-label", "Close " + name);
    close.onclick = () => closeDocument(d.id);
    row.append(button, close);
    root.append(row);
  });
}
function packSelection(sel, w, h) {
  if (!sel) return null;
  if (!sel.bits)
    return {
      kind: "rectangle",
      x: sel.x,
      y: sel.y,
      w: sel.w,
      h: sel.h,
      inverted: !!sel.inverted,
    };
  const bytes = new Uint8Array(Math.ceil((w * h) / 8));
  for (let i = 0; i < sel.bits.length; i++)
    if (sel.bits[i]) bytes[i >> 3] |= 1 << (i & 7);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 8192)
    raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { kind: "bits", data: btoa(raw), inverted: !!sel.inverted };
}
function unpackSelection(value, w, h) {
  if (value == null) return null;
  if (typeof value.inverted !== "boolean") throw new Error("Invalid selection");
  if (value.kind === "rectangle") {
    if (
      !["x", "y", "w", "h"].every((k) => Number.isFinite(value[k])) ||
      value.w <= 0 ||
      value.h <= 0 ||
      Math.abs(value.x) > 1000000 ||
      Math.abs(value.y) > 1000000 ||
      value.w > 1000000 ||
      value.h > 1000000
    )
      throw new Error("Invalid rectangular selection");
    return {
      x: value.x,
      y: value.y,
      w: value.w,
      h: value.h,
      inverted: value.inverted,
    };
  }
  if (
    value.kind !== "bits" ||
    typeof value.data !== "string" ||
    value.data.length !== 4 * Math.ceil(Math.ceil((w * h) / 8) / 3) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)
  )
    throw new Error("Invalid selection mask");
  const raw = atob(value.data);
  if (raw.length !== Math.ceil((w * h) / 8))
    throw new Error("Invalid selection size");
  const bits = new Uint8Array(w * h);
  for (let i = 0; i < bits.length; i++)
    bits[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
  return {
    bits,
    edge: selectionEdge(bits, w, h),
    inverted: value.inverted,
    effective: null,
  };
}
function projectFromState(state) {
  for (const l of state.layers) if (l.vector) updateVectorRaster(l);
  return {
    format: "picturesque",
    version: 2,
    name: state.name || "Untitled",
    width: state.W,
    height: state.H,
    dpi: state.DPI,
    active: state.active,
    guides: state.guides.map((g) => ({ ...g })),
    documentPaths: clonePen(state.documentPaths),
    activePath: state.activePath,
    selection: packSelection(state.selection, state.W, state.H),
    view: {
      zoom: state.zoom || 1,
      left: state.scrollLeft || 0,
      top: state.scrollTop || 0,
      rulers: state.rulersVisible !== false,
      guides: state.guidesVisible !== false,
    },
    layers: state.layers.map(({ c, ...l }) => ({
      ...clonePen(l),
      image: encodedCanvas(c),
    })),
  };
}
function workspaceSnapshot() {
  captureDocument();
  return {
    format: "picturesque-workspace",
    version: 2,
    active: openDocuments.findIndex((d) => d.id === activeDocumentId),
    documents: openDocuments.map((d) => ({
      name: d.state.name,
      dirty: d.state.documentDirty,
      project: projectFromState(d.state),
      view: {
        zoom: d.state.zoom,
        left: d.state.scrollLeft,
        top: d.state.scrollTop,
      },
    })),
  };
}
let historyKey = "";
function renderHistory() {
  const key =
    activeDocumentId +
    "|" +
    history.map((c) => c.createdAt + ":" + c.label).join(",") +
    "|" +
    future.length;
  if (key === historyKey) return;
  historyKey = key;
  $("historySummary").textContent =
    history.length +
    " undo · " +
    future.length +
    " redo · shared 64 MiB estimated history budget";
  const root = $("historyList");
  root.replaceChildren();
  for (const command of [...history].reverse()) {
    const row = document.createElement("div");
    row.className = "history-entry";
    row.textContent = command.label;
    root.append(row);
  }
  if (!history.length) {
    const row = document.createElement("p");
    row.className = "quiet";
    row.textContent = "No edits to undo in this document.";
    root.append(row);
  }
}
$("newDocumentTab").onclick = () => $("new").click();
window.addEventListener("beforeunload", (e) => {
  captureDocument();
  if (openDocuments.some((d) => d.state.documentDirty)) {
    e.preventDefault();
    e.returnValue = "";
  }
});
