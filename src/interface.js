"use strict";
// interface.js — shared editor source; load order is declared in index.html.
const paths = {
  pen: "M4 20l3-10 7-7 7 7-7 7-10 3ZM4 20l8-8M14 3l7 7M15 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  gradient: "M3 4h18v16H3ZM7 4v16M11 4v16M15 4v16M19 4v16",
  bucket:
    "M4 10l7-7 10 10-9 9-9-9ZM4 10h14M8 2l6 6M21 16s-3 3-3 5a3 3 0 0 0 6 0c0-2-3-5-3-5",
  wand: "M4 20L17 7M13 7l4 4M5 3v4M3 5h4M18 14v4M16 16h4M18 2v3M16.5 3.5h3",
  move: "M4 3l7 17 2-7 7-2Z",
  brush: "M14 4l6 6M5 14L16 3l5 5-11 11H5v-5ZM5 19l-2 2",
  erase: "M3 14l10-11 8 8-9 10H9ZM7 10l8 8M12 21h9",
  select: "M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4",
  crop: "M6 3v15h15M3 6h15v15",
  text: "M4 5h16M12 5v15M8 20h8",
  rect: "M4 4h16v16H4Z",
  ellipse: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  pick: "M14 4l6 6M16 2l6 6-3 3-6-6ZM14 6L4 16v4h4L18 10",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  eyeOff: "M3 3l18 18M9 5c6-2 13 7 13 7l-3 4M6 6l-4 6s5 8 12 6",
  plus: "M12 5v14M5 12h14",
  open: "M3 7h7l2 3h9l-3 10H3ZM3 7V4h7l2 3",
  save: "M4 3h13l4 4v14H3V3ZM7 3v6h9V3M7 21v-7h10v7",
  export: "M12 16V3M7 8l5-5 5 5M4 14v7h16v-7",
  undo: "M4 10l5-5M4 10l5 5M4 10h9a7 7 0 0 1 7 7",
  redo: "M20 10l-5-5M20 10l-5 5M20 10H11a7 7 0 0 0-7 7",
  panel: "M3 4h18v16H3ZM15 4v16",
};
function icon(name) {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    (paths[name] || paths.plus) +
    '"/></svg>'
  );
}
for (const b of document.querySelectorAll("[data-tool]")) {
  const name = b.dataset.tool,
    label = {
      pen: "Pen tool (P)",
      gradient: "Gradient (Shift+G)",
      bucket: "Paint bucket (G)",
      wand: "Magic wand (W)",
      move: "Move (V)",
      brush: "Brush (B)",
      erase: "Eraser (E)",
      select: "Selection (M)",
      crop: "Crop (C)",
      text: "Text (T)",
      rect: "Rectangle",
      ellipse: "Ellipse",
      pick: "Colour picker",
    }[name];
  b.innerHTML = icon(name);
  b.setAttribute("aria-label", label);
  b.title = label;
}
for (const [id, name] of [
  ["new", "plus"],
  ["open", "open"],
  ["save", "save"],
  ["export", "export"],
  ["undo", "undo"],
  ["redo", "redo"],
  ["toggleInspector", "panel"],
])
  $(id).innerHTML = icon(name) + $(id).textContent;
for (const id of ["new", "open", "import", "load", "save"])
  $(id).classList.add("header-secondary");
$("help").textContent = "Help";
function showTab(id) {
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const yes = b.dataset.tab === id;
    b.setAttribute("aria-selected", String(yes));
    b.tabIndex = yes ? 0 : -1;
    $(b.dataset.tab).hidden = b.dataset.tab === "layerPanel" ? false : !yes;
  });
}
const tabs = [...document.querySelectorAll("[data-tab]")];
tabs.forEach((b, i) => {
  b.onclick = () => showTab(b.dataset.tab);
  b.onkeydown = (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const n =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? tabs.length - 1
            : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      showTab(tabs[n].dataset.tab);
      tabs[n].focus();
    }
  };
});
showTab("propertyPanel");
$("toggleInspector").onclick = () => {
  const hidden = document.body.classList.toggle("inspector-hidden");
  $("toggleInspector").setAttribute("aria-expanded", String(!hidden));
};
const commands = [
  ["New canvas", "new", ""],
  ["Paste image", "pasteImage", "Ctrl / ⌘ V"],
  ["Open image", "open", ""],
  ["Add image layer", "import", ""],
  ["Open project", "load", ""],
  ["Save project", "save", "Ctrl / ⌘ S"],
  ["Export image", "export", ""],
  ["Undo", "undo", "Ctrl / ⌘ Z"],
  ["Redo", "redo", "Ctrl / ⌘ Shift Z"],
  ["Edit text layer", "editText", ""],
  ["Rasterise text layer", "rasterizeText", ""],
  ["Add layer", "add", ""],
  ["Duplicate layer", "duplicate", ""],
  ["Delete layer", "delete", ""],
  ["Invert selection", "invertSelection", ""],
  ["Canvas size", "canvasSize", ""],
  ["Fit canvas", "fit", ""],
  ["Toggle inspector", "toggleInspector", ""],
  ["Toggle fullscreen", "fullscreen", ""],
  ["Help", "help", ""],
  ...Object.keys(paths)
    .filter((t) =>
      [
        "pen",
        "gradient",
        "bucket",
        "wand",
        "move",
        "brush",
        "erase",
        "select",
        "crop",
        "text",
        "rect",
        "ellipse",
        "pick",
      ].includes(t),
    )
    .map((t) => [t.charAt(0).toUpperCase() + t.slice(1), null, t]),
];
function commandResults() {
  const q = $("commandSearch").value.toLowerCase();
  $("commandResults").replaceChildren();
  for (const [label, id, shortcut] of commands.filter((c) =>
    c[0].toLowerCase().includes(q),
  )) {
    if (id && $(id).disabled) continue;
    const b = document.createElement("button");
    b.className = "command-item";
    const title = document.createElement("span");
    title.textContent = label;
    const key = document.createElement("small");
    key.textContent = id ? shortcut : "Tool";
    b.append(title, key);
    b.onclick = () => {
      $("commandDialog").close();
      if (id) $(id).click();
      else setTool(shortcut);
    };
    $("commandResults").append(b);
  }
  if (!$("commandResults").children.length) {
    const p = document.createElement("p");
    p.textContent = "No matching commands.";
    $("commandResults").append(p);
  }
}
function openCommands() {
  if (!$("commandDialog").open) {
    $("commandSearch").value = "";
    commandResults();
    $("commandDialog").showModal();
    $("commandSearch").focus();
  }
}
$("commands").onclick = openCommands;
$("commandSearch").oninput = commandResults;
$("commandSearch").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("commandResults").querySelector("button")?.click();
  }
};
if (window.matchMedia("(max-width:540px)").matches) {
  document.body.classList.add("inspector-hidden");
  $("toggleInspector").setAttribute("aria-expanded", "false");
}
const menuActions = {
  file: [
    ["Save workspace backup", saveWorkspace],
    [
      "Open workspace backup",
      () =>
        desktopBridge
          ? openNativeFile("workspace")
          : $("workspaceFile").click(),
    ],
    ["New canvas", "new"],
    ["Open image", "open"],
    ["Add image layer", "import"],
    ["Open project", "load"],
    ["Save project", "save", "Ctrl / ⌘ S"],
    ...(desktopBridge
      ? [["Save project as…", () => saveProject(true), "Ctrl / ⌘ Shift S"]]
      : []),
    ["Export image", "export"],
    ["Close document", () => closeDocument(activeDocumentId)],
    ["Rename document", renameDocument],
  ],
  edit: [
    ["Undo", "undo", "Ctrl / ⌘ Z"],
    ["Redo", "redo", "Ctrl / ⌘ Shift Z"],
    ["Paste image", "pasteImage"],
    ["Clear selected pixels", "clearSelected"],
    ["Deselect", "deselect"],
    ["Invert selection", "invertSelection"],
    ["Commands", "commands", "Ctrl / ⌘ K"],
  ],
  image: [
    ["Canvas size", "canvasSize"],
    ["Crop tool", () => setTool("crop")],
    ["Apply crop", "cropApply"],
    ["Pen tool", () => setTool("pen")],
    ["Adjustments", () => showTab("adjustPanel")],
    ["Reset layer adjustments", "reset"],
  ],
  layer: [
    ["Edit vector paths", "vectorEdit"],
    ["Vector fill / stroke", "vectorStyle"],
    ["Rasterise vector", "vectorRasterize"],
    ["New layer", "add"],
    ["Duplicate layer", "duplicate"],
    ["Rename layer", "rename"],
    ["Edit text", "editText"],
    ["Rasterise text", "rasterizeText"],
    ["Delete layer", "delete"],
    ["Move up", "up"],
    ["Move down", "down"],
    ["Properties", () => showTab("propertyPanel")],
  ],
  select: [
    ["Rectangular selection", () => chooseSelectionShape("rectangle")],
    ["Elliptical selection", () => chooseSelectionShape("ellipse")],
    ["Freehand lasso", () => chooseSelectionShape("lasso")],
    ["Select all", allPixels],
    ["Deselect", "deselect"],
    ["Invert selection", "invertSelection"],
    ["White pixels", () => colourSelectionDialog("white")],
    ["Black pixels", () => colourSelectionDialog("black")],
    ["Custom colour / range", () => colourSelectionDialog("custom")],
    ["Transparent pixels", () => colourSelectionDialog("transparent")],
  ],
  view: [
    ["Fit canvas", "fit"],
    ["Zoom in", () => setZoom(zoom * 1.25)],
    ["Zoom out", () => setZoom(zoom / 1.25)],
    [
      "Reset view",
      () => {
        fit();
        $("stage").scrollLeft = 0;
        $("stage").scrollTop = 0;
        drawRulers();
      },
    ],
    ["Rulers", toggleRulers],
    [
      "Snap to guides",
      () => {
        $("snapGuides").checked = !$("snapGuides").checked;
      },
    ],
    ["Show/hide guides", toggleGuides],
    ["Add guide", addGuide],
    ["Clear guides", clearGuides],
    ["Actual size", () => setZoom(1)],
    ["Toggle inspector", "toggleInspector"],
    ["Toggle fullscreen", "fullscreen"],
  ],
  help: [["Using Picturesque", "help"]],
};
function closeMenus() {
  document.querySelectorAll("[data-popup]").forEach((p) => (p.hidden = true));
  document
    .querySelectorAll("[data-menu]")
    .forEach((b) => b.setAttribute("aria-expanded", "false"));
}
for (const trigger of document.querySelectorAll("[data-menu]")) {
  const popup = document.querySelector(
    '[data-popup="' + trigger.dataset.menu + '"]',
  );
  for (const [label, action, key] of menuActions[trigger.dataset.menu]) {
    const b = document.createElement("button");
    b.type = "button";
    const title = document.createElement("span");
    title.textContent = label;
    const shortcut = document.createElement("small");
    shortcut.textContent = key || "";
    b.append(title, shortcut);
    b.onclick = () => {
      closeMenus();
      if (typeof action === "function") action();
      else $(action).click();
    };
    b.dataset.action = typeof action === "string" ? action : "";
    popup.append(b);
  }
  trigger.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = !popup.hidden;
    closeMenus();
    if (!wasOpen) {
      popup.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      popup.querySelectorAll("button").forEach((b) => {
        if (b.dataset.action)
          b.disabled =
            $(b.dataset.action).disabled ||
            (b.dataset.action === "cropApply" && $("cropApply").hidden);
      });
    }
  };
  trigger.onkeydown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      trigger.click();
      popup.querySelector("button:not(:disabled)")?.focus();
    }
  };
  popup.onkeydown = (e) => {
    const buttons = [...popup.querySelectorAll("button:not(:disabled)")],
      i = buttons.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      buttons[
        (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length
      ]?.focus();
    }
    if (e.key === "Escape") {
      closeMenus();
      trigger.focus();
    }
  };
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap")) closeMenus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenus();
});
function fullscreenState() {
  const on = !!document.fullscreenElement;
  $("fullscreen").textContent = on ? "Exit fullscreen" : "Fullscreen";
  $("fullscreen").title = on ? "Exit fullscreen (Esc)" : "Enter fullscreen";
  $("fullscreen").setAttribute("aria-label", $("fullscreen").title);
  $("fullscreen").setAttribute("aria-pressed", String(on));
}
$("fullscreen").onclick = async () => {
  try {
    $("fullscreenNotice").textContent = "";
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else throw new Error("Fullscreen is unavailable");
  } catch (error) {
    $("fullscreenNotice").textContent =
      "Use your browser’s fullscreen control.";
    $("fullscreen").title =
      "Fullscreen unavailable: use your browser fullscreen control";
  } finally {
    fullscreenState();
  }
};
document.addEventListener("fullscreenchange", fullscreenState);
fullscreenState();
let rulerFrame = 0;
function queueRulers() {
  if (rulerFrame) return;
  rulerFrame = requestAnimationFrame(() => {
    rulerFrame = 0;
    drawRulers();
  });
}
$("stage").addEventListener(
  "scroll",
  () => {
    queueRulers();
    if (!busy) {
      autosaveDirty = true;
      scheduleAutosave();
    }
  },
  { passive: true },
);
window.addEventListener("resize", queueRulers);
if (typeof ResizeObserver !== "undefined") {
  const rulerObserver = new ResizeObserver(queueRulers);
  rulerObserver.observe($("workspaceViewport"));
}
