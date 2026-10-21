"use strict";
// navigation.js — shared editor source; load order is declared in index.html.
$("help").onclick = () => {
  $("dialogTitle").textContent = "Welcome to Picturesque";
  $("dialog").classList.remove("text-dialog");
  $("fields").textContent =
    "Open an image or start with a transparent canvas. Add layers for brush strokes, shapes, and text. Move drags the active layer. Select limits brush and eraser strokes. Crop changes the whole canvas. Adjustments affect the selected layer. Save project downloads an editable .picturesque file; Ctrl/Cmd+S downloads a fresh copy. Save checks the file before starting its download. Verify it in your browser downloads. Projects retain layers, editable vectors and text, paths, guides, selections, names, view settings and DPI; undo history and font files are not embedded. File also offers portable workspace backup and restore. Export flattens the visible result. Choose a Google Fonts family and preview it before adding text. Text layers retain editable mixed formatting. New/open creates document tabs. Save each project for a portable backup. Keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, B brush, V move, E eraser, T text, C crop, M select, Escape deselect. PNG export preserves transparency. JPEG uses a white background. PSD files are not supported in this first version.";
  $("form").onsubmit = (e) => {
    e.preventDefault();
    $("dialog").close();
  };
  $("dialog").showModal();
};
document.onkeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (!$("commandDialog").open) saveProject(e.shiftKey);
    return;
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "k" &&
    !$("dialog").open
  ) {
    e.preventDefault();
    openCommands();
    return;
  }
  if ($("commandDialog").open || $("dialog").open) return;
  if (
    ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
    $("dialog").open
  )
    return;
  if (
    tool === "pen" &&
    ["Enter", "Escape", "Delete", "Backspace"].includes(e.key)
  ) {
    e.preventDefault();
    if (e.key === "Delete" || e.key === "Backspace") deletePenAnchor();
    else finishPenPath();
    return;
  }
  if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "a") {
    setTool("pen");
    $("penMode").value = "edit";
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    travel(e.shiftKey ? future : history, e.shiftKey ? history : future);
  } else if (e.key === "Escape") {
    selection = null;
    outline();
    markSessionState();
  } else if (!e.ctrlKey && !e.metaKey) {
    if (e.key.toLowerCase() === "l") {
      chooseSelectionShape("lasso");
      return;
    }
    if (e.key.toLowerCase() === "m") {
      chooseSelectionShape(e.shiftKey ? "ellipse" : "rectangle");
      return;
    }
    const t =
      e.shiftKey && e.key.toLowerCase() === "g"
        ? "gradient"
        : {
            p: "pen",
            g: "bucket",
            w: "wand",
            b: "brush",
            v: "move",
            e: "erase",
            t: "text",
            c: "crop",
            m: "select",
          }[e.key.toLowerCase()];
    if (t) setTool(t);
  }
};

function syncZoomReadout() {
  const select = $("zoom"),
    value = String(zoom);
  let option = [...select.options].find((o) => o.value === value);
  if (!option) {
    option = select.querySelector("[data-custom]");
    if (!option) {
      option = document.createElement("option");
      option.dataset.custom = "true";
      select.append(option);
    }
    option.value = value;
    option.textContent = (zoom * 100).toFixed(zoom < 0.1 ? 1 : 0) + "%";
  }
  select.value = value;
}
function setZoom(next, clientX, clientY) {
  if (!Number.isFinite(next) || next <= 0) return;
  const stage = $("stage"),
    rect = stage.getBoundingClientRect(),
    paper = $("paper").getBoundingClientRect();
  clientX ??= rect.left + stage.clientWidth / 2;
  clientY ??= rect.top + stage.clientHeight / 2;
  const x = (clientX - paper.left) / zoom,
    y = (clientY - paper.top) / zoom;
  zoom = Math.max(0.05, Math.min(4, next));
  render();
  const after = $("paper").getBoundingClientRect();
  stage.scrollLeft += after.left + x * zoom - clientX;
  stage.scrollTop += after.top + y * zoom - clientY;
  drawRulers();
  autosaveDirty = true;
  scheduleAutosave();
}
let spaceDown = false,
  panDrag = null;
const panStage = $("stage");
panStage.addEventListener(
  "wheel",
  (e) => {
    if (
      !(e.ctrlKey || e.metaKey) ||
      $("dialog").open ||
      $("commandDialog").open ||
      drag ||
      guideDrag ||
      penDrag
    )
      return;
    e.preventDefault();
    const delta =
      e.deltaY *
      (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? panStage.clientHeight : 1);
    setZoom(
      zoom * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.004),
      e.clientX,
      e.clientY,
    );
  },
  { passive: false },
);
document.addEventListener("keydown", (e) => {
  if (typingTarget(e.target) || $("dialog").open || $("commandDialog").open)
    return;
  if (e.code === "Space") {
    e.preventDefault();
    spaceDown = true;
    panStage.classList.add("pan-ready");
  }
  if (
    (e.key === "Delete" || e.key === "Backspace") &&
    tool !== "pen" &&
    selection &&
    !busy
  ) {
    e.preventDefault();
    $("clearSelected").click();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spaceDown = false;
    panStage.classList.remove("pan-ready");
  }
});
window.addEventListener("blur", () => {
  spaceDown = false;
  panDrag = null;
  panStage.classList.remove("pan-ready", "panning");
});
panStage.addEventListener(
  "pointerdown",
  (e) => {
    if ((!spaceDown && e.button !== 1) || busy || drag || guideDrag || penDrag)
      return;
    e.preventDefault();
    e.stopImmediatePropagation();
    panDrag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: panStage.scrollLeft,
      top: panStage.scrollTop,
    };
    panStage.setPointerCapture(e.pointerId);
    panStage.classList.add("panning");
  },
  true,
);
panStage.addEventListener(
  "pointermove",
  (e) => {
    if (!panDrag) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    panStage.scrollLeft = panDrag.left + panDrag.x - e.clientX;
    panStage.scrollTop = panDrag.top + panDrag.y - e.clientY;
  },
  true,
);
function finishPan(e) {
  if (!panDrag) return;
  e.stopImmediatePropagation();
  panDrag = null;
  panStage.classList.remove("panning");
  if (panStage.hasPointerCapture(e.pointerId))
    panStage.releasePointerCapture(e.pointerId);
}
panStage.addEventListener("pointerup", finishPan, true);
panStage.addEventListener("pointercancel", finishPan, true);
$("clearSelected").onclick = () => {
  if (!selection || busy) return;
  if (current().text || current().vector) {
    $("clipboardStatus").textContent =
      "Rasterise this editable layer before deleting pixels.";
    return;
  }
  checkpoint();
  const l = current();
  invalidateCanvas(l.c);
  if (selection.bits) {
    const g = l.c.getContext("2d");
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.drawImage(selectionMask(selection), -l.x, -l.y);
    g.restore();
  } else {
    const g = l.c.getContext("2d");
    g.save();
    clipSelection(g, l);
    g.clearRect(0, 0, l.c.width, l.c.height);
    g.restore();
  }
  refresh();
};
