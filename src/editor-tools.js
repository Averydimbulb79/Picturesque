"use strict";
// editor-tools.js — shared editor source; load order is declared in index.html.
function bounds(a, b) {
  return {
    x: Math.round(Math.min(a.x, b.x)),
    y: Math.round(Math.min(a.y, b.y)),
    w: Math.round(Math.abs(a.x - b.x)),
    h: Math.round(Math.abs(a.y - b.y)),
  };
}
function point(e) {
  const r = view.getBoundingClientRect();
  return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
}
function drawStroke(a, b) {
  const l = current(),
    g = editingContext(l);
  g.save();
  clipSelection(g, l);
  g.globalCompositeOperation =
    tool === "erase" && !selection?.bits ? "destination-out" : "source-over";
  g.strokeStyle = $("color").value;
  g.fillStyle = $("color").value;
  g.lineWidth = +$("size").value || 1;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(a.x - l.x, a.y - l.y);
  g.lineTo(b.x - l.x, b.y - l.y);
  g.stroke();
  if (a.x === b.x && a.y === b.y) {
    g.beginPath();
    g.arc(a.x - l.x, a.y - l.y, g.lineWidth / 2, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  commitSelectionEdit(l, g, tool === "erase");
}
function setTool(t) {
  if (t !== "pen") {
    penDrawing = false;
    penDrag = null;
  }
  tool = t;
  $("penControls").hidden = t !== "pen";
  $("selectionShapeLabel").hidden = t !== "select";
  $("snapGuidesLabel").hidden = t !== "move";
  for (const id of [
    "gradientTypeLabel",
    "gradientSettings",
    "gradientOpacityLabel",
    "gradientReverseLabel",
  ])
    $(id).hidden = t !== "gradient";
  for (const id of ["selectionModeLabel", "selectionPresetLabel"])
    $(id).hidden = !["select", "wand"].includes(t);
  $("selectionModeLabel").hidden = !["select", "wand", "pen"].includes(t);
  if (t === "crop" && selection) {
    if (selection.bits) selection = null;
    else selection.inverted = false;
  }
  for (const id of [
    "wandToleranceLabel",
    "wandContiguousLabel",
    "wandMergedLabel",
  ])
    $(id).hidden = !["wand", "bucket"].includes(t);
  $("bucketOpacityLabel").hidden = t !== "bucket";
  $("toolName").textContent =
    t === "rect"
      ? "Rectangle"
      : t === "pick"
        ? "Colour picker"
        : t.charAt(0).toUpperCase() + t.slice(1);
  $("color").parentElement.hidden = ![
    "pen",
    "bucket",
    "brush",
    "rect",
    "ellipse",
    "text",
    "pick",
  ].includes(t);
  $("size").parentElement.hidden = !["brush", "erase"].includes(t);
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tool === t));
  view.style.cursor = {
    pen: "crosshair",
    gradient: "crosshair",
    bucket: "crosshair",
    wand: "crosshair",
    move: "move",
    brush: "crosshair",
    erase: "crosshair",
    text: "text",
    pick: "crosshair",
    select: "crosshair",
    crop: "crosshair",
    rect: "crosshair",
    ellipse: "crosshair",
  }[t];
  $("hint").textContent = {
    pen: "Click corners; drag curves. Click first anchor to close. Ctrl/Cmd: edit. Alt: independent handle.",
    gradient:
      "Drag to set gradient direction or radius. Edit gradient to change colour stops.",
    bucket:
      "Click to fill matching pixels on the active layer. G: paint bucket.",
    wand: "Click a colour to select matching pixels. Adjust tolerance, then click again.",
    move: "Drag the layer; edges and centre snap to guides. Hold Alt to bypass snapping.",
    brush: "Paint on the selected layer",
    erase: "Erase pixels on the selected layer",
    select:
      "Choose Rectangle, Ellipse or Freehand lasso; drag to select. Use mode to combine areas.",
    crop: "Drag a crop area, then click Apply crop",
    text: "Click the canvas to add text",
    rect: "Drag to create an editable vector rectangle. Selections do not clip vector shapes.",
    ellipse:
      "Drag to create an editable vector ellipse. Selections do not clip vector shapes.",
    pick: "Click to sample a colour",
  }[t];
  outline();
}
view.onpointerdown = (e) => {
  if (busy) return;
  if (
    ["gradient", "bucket", "brush", "erase"].includes(tool) &&
    current().vector
  ) {
    $("clipboardStatus").textContent =
      "Rasterise this vector layer before painting pixels.";
    return;
  }
  if (
    ["gradient", "bucket", "brush", "erase"].includes(tool) &&
    current().text
  ) {
    $("clipboardStatus").textContent =
      "Rasterise this text layer before painting on it.";
    return;
  }
  const p = point(e);
  if (tool === "pen") {
    penPointerDown(e, p);
    return;
  }
  if (tool === "bucket") {
    paintBucket(p);
    return;
  }
  if (tool === "wand") {
    magicWand(p);
    return;
  }
  if (tool === "text") {
    openTextDialog(p);
    return;
  }
  if (tool === "pick") {
    flushCanvas();
    const d = ctx.getImageData(
      Math.min(W - 1, Math.max(0, Math.floor(p.x))),
      Math.min(H - 1, Math.max(0, Math.floor(p.y))),
      1,
      1,
    ).data;
    $("color").value =
      "#" +
      [...d]
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    return;
  }
  view.setPointerCapture(e.pointerId);
  drag = {
    start: p,
    last: p,
    x: current().x,
    y: current().y,
    kind: $("selectionShape").value,
    points: [p],
    layerBounds: tool === "move" ? visibleLayerBounds(current().c) : null,
  };
  if (["move", "brush", "erase", "rect", "ellipse"].includes(tool))
    checkpoint(
      {
        move: "Move layer",
        brush: "Brush stroke",
        erase: "Eraser stroke",
        rect: "Draw rectangle",
        ellipse: "Draw ellipse",
      }[tool],
    );
  if (["brush", "erase"].includes(tool)) {
    drawStroke(p, p);
    render();
  }
};
view.onpointermove = (e) => {
  if (tool === "pen" && penDrag) {
    penPointerMove(e, point(e));
    return;
  }
  if (!drag) return;
  const p = point(e);
  if (tool === "move") {
    const next = snappedLayerPosition(
      drag.x + p.x - drag.start.x,
      drag.y + p.y - drag.start.y,
      drag.layerBounds,
      e.altKey,
    );
    current().x = next.x;
    current().y = next.y;
    snapTargets = next.targets;
    render();
  } else if (["brush", "erase"].includes(tool)) {
    drawStroke(drag.last, p);
    render();
  } else if (tool === "gradient") previewGradient(drag.start, p);
  else if (tool === "select" && drag.kind !== "rectangle") {
    if (
      drag.kind === "lasso" &&
      Math.hypot(p.x - drag.points.at(-1).x, p.y - drag.points.at(-1).y) >=
        1 / zoom &&
      drag.points.length < 4096
    )
      drag.points.push(p);
    else if (drag.kind === "lasso" && drag.points.length >= 4096)
      drag.points[4095] = p;
    previewShapeSelection(drag, p);
  } else outline(bounds(drag.start, p));
  drag.last = p;
};
function finish() {
  if (!drag) return;
  if (tool === "gradient") {
    const { start, last } = drag;
    drag = null;
    try {
      applyGradient(start, last);
    } catch (e) {
      $("clipboardStatus").textContent = e.message;
    }
    refresh();
    return;
  }
  const r = bounds(drag.start, drag.last);
  if (["select", "crop"].includes(tool)) {
    if (tool === "select" && drag.kind === "ellipse") {
      if (r.w && r.h)
        acceptSelection(
          ellipseSelectionBits(r, W, H),
          $("selectionMode").value,
        );
    } else if (tool === "select" && drag.kind === "lasso") {
      if (drag.points.length >= 3)
        acceptSelection(
          polygonSelectionBits([...drag.points, drag.last], W, H),
          $("selectionMode").value,
        );
    } else if (
      tool === "select" &&
      r.w &&
      r.h &&
      $("selectionMode").value !== "replace"
    )
      acceptSelection(rectangleBits(r), $("selectionMode").value);
    else selection = r.w && r.h ? r : null;
  } else if (["rect", "ellipse"].includes(tool)) {
    if (r.w && r.h)
      addVectorLayer(
        [shapePath(tool, r)],
        tool === "rect" ? "Rectangle" : "Ellipse",
      );
  }
  drag = null;
  snapTargets = [];
  if (tool === "select") markSessionState();
  refresh();
}
view.onpointerup = (e) => {
  if (tool === "pen" && penDrag) {
    penDrag = null;
    refresh();
    return;
  }
  finish();
};
view.onpointercancel = () => {
  if (tool === "pen" && penDrag) {
    penDrag = null;
    refresh();
    return;
  }
  if (tool === "gradient" || tool === "select") {
    drag = null;
    snapTargets = [];
    refresh();
  } else finish();
};
document
  .querySelectorAll("[data-tool]")
  .forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
function ask(title, fields, done) {
  const submit = $("form").querySelector('button[type="submit"]');
  submit.disabled = false;
  submit.textContent = "Apply";
  $("dialogTitle").textContent = title;
  $("dialog").classList.remove("text-dialog");
  $("fields").replaceChildren();
  for (const [id, label, type, value] of fields) {
    const el = document.createElement("label");
    el.textContent = label;
    const input = document.createElement("input");
    input.name = id;
    input.type = type;
    input.value = value;
    input.required = true;
    el.append(input);
    $("fields").append(el);
  }
  $("form").onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData($("form")));
    $("dialog").close();
    try {
      done(v);
    } catch (err) {
      alert(err.message);
    }
  };
  $("dialog").showModal();
}
$("cancel").onclick = () => $("dialog").close();
function newDoc(w, h, bg, dpi = 96) {
  if (!documentSlotAvailable()) return;
  const c = surface(w, h);
  if (bg) {
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, h);
  }
  openDocumentState(
    {
      W: w,
      H: h,
      DPI: dpi,
      layers: [layer(bg ? "Background" : "Layer 1", c)],
      active: 0,
      guides: [],
      documentPaths: [],
      activePath: -1,
    },
    "Untitled " + (documentCounter + 1),
  );
  fit();
}
function validSize(w, h) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w > 8192 ||
    h > 8192 ||
    w * h > 24000000
  )
    throw new Error(
      "Use whole dimensions from 1 to 8192 pixels, up to 24 million pixels total.",
    );
}
$("new").onclick = () => canvasDialog(false);
$("open").onclick = () => {
  importMode = false;
  $("imageFile").click();
};
$("import").onclick = () => {
  importMode = true;
  $("imageFile").click();
};
$("imageFile").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || busy) return;
  const addToCurrent = importMode;
  if (!addToCurrent && !documentSlotAvailable()) return;
  setBusy(true);
  const url = URL.createObjectURL(file);
  try {
    const im = await decode(url);
    validSize(im.width, im.height);
    const c = surface(im.width, im.height);
    c.getContext("2d").drawImage(im, 0, 0);
    if (addToCurrent) {
      checkpoint("Import image layer");
      layers.push(layer(file.name, c));
      active = layers.length - 1;
      refresh();
    } else
      openDocumentState(
        {
          W: im.width,
          H: im.height,
          DPI: 96,
          layers: [layer(file.name, c)],
          active: 0,
          guides: [],
          documentPaths: [],
          activePath: -1,
        },
        file.name,
      );
    fit();
  } catch (err) {
    alert(err.message);
  } finally {
    URL.revokeObjectURL(url);
    setBusy(false);
  }
};
$("add").onclick = () => {
  checkpoint("Add layer");
  layers.push(layer("Layer " + (layers.length + 1)));
  active = layers.length - 1;
  refresh();
};
$("duplicate").onclick = () => {
  checkpoint("Duplicate layer");
  const l = current(),
    c = surface(l.c.width, l.c.height);
  c.getContext("2d").drawImage(l.c, 0, 0);
  layers.splice(active + 1, 0, {
    ...clonePen(
      Object.fromEntries(Object.entries(l).filter(([k]) => k !== "c")),
    ),
    c,
    name: l.name + " copy",
  });
  active++;
  refresh();
};
$("delete").onclick = () => {
  checkpoint("Delete layer");
  layers.splice(active, 1);
  if (!layers.length) layers.push(layer("Layer 1"));
  active = Math.min(active, layers.length - 1);
  refresh();
};
for (const [id, d] of [
  ["up", 1],
  ["down", -1],
])
  $(id).onclick = () => {
    const next = active + d;
    if (next < 0 || next >= layers.length) return;
    checkpoint();
    [layers[active], layers[next]] = [layers[next], layers[active]];
    active = next;
    refresh();
  };
$("rename").onclick = () =>
  ask("Rename layer", [["name", "Layer name", "text", current().name]], (v) => {
    checkpoint();
    current().name = v.name;
    refresh();
  });
for (const id of ["brightness", "contrast", "saturation", "opacity"]) {
  $(id).onpointerdown = () => sliderCheckpoint(id, true);
  $(id).onkeydown = (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "ArrowUp",
        "ArrowDown",
      ].includes(e.key)
    )
      sliderCheckpoint(id);
  };
  $(id).oninput = () => {
    if (
      !sliderGroup ||
      sliderGroup.id !== id ||
      sliderGroup.layer !== current() ||
      sliderGroup.state !== history.at(-1)
    )
      sliderCheckpoint(id);
    current()[id] = +$(id).value / (id === "opacity" ? 100 : 1);
    render();
  };
}
$("blend").onchange = () => {
  checkpoint("Layer blend mode");
  current().blend = $("blend").value;
  render();
};
$("reset").onclick = () => {
  checkpoint("Reset adjustments");
  for (const id of ["brightness", "contrast", "saturation"])
    current()[id] = 100;
  refresh();
};
function transform(kind, factor = 1) {
  if (current().vector) {
    transformVector(kind, factor);
    return;
  }
  if (
    current().text &&
    !confirm("This transform converts editable text to pixels. Continue?")
  )
    return;
  checkpoint();
  const l = current(),
    old = l.c;
  delete l.text;
  const turn = kind === "left" || kind === "right";
  const c = surface(
    turn ? old.height : Math.max(1, Math.round(old.width * factor)),
    turn ? old.width : Math.max(1, Math.round(old.height * factor)),
  );
  const g = c.getContext("2d");
  g.translate(c.width / 2, c.height / 2);
  if (turn) g.rotate(((kind === "left" ? -1 : 1) * Math.PI) / 2);
  if (kind === "flipX") g.scale(-1, 1);
  if (kind === "flipY") g.scale(1, -1);
  g.drawImage(
    old,
    -(turn ? old.width : c.width) / 2,
    -(turn ? old.height : c.height) / 2,
    turn ? old.width : c.width,
    turn ? old.height : c.height,
  );
  l.x += Math.round((old.width - c.width) / 2);
  l.y += Math.round((old.height - c.height) / 2);
  l.c = c;
  refresh();
}
for (const id of ["left", "right", "flipX", "flipY"])
  $(id).onclick = () => transform(id);
$("scale").onclick = () =>
  ask(
    "Resize selected layer",
    [["percent", "Scale (%)", "number", 100]],
    (v) => {
      const f = +v.percent / 100;
      validSize(
        Math.round(current().c.width * f),
        Math.round(current().c.height * f),
      );
      transform("scale", f);
    },
  );
$("cropApply").onclick = () => {
  if (!selection) return;
  const r = selection,
    x = Math.max(0, r.x),
    y = Math.max(0, r.y),
    w = Math.min(W, r.x + r.w) - x,
    h = Math.min(H, r.y + r.h) - y;
  if (w < 1 || h < 1) return;
  checkpoint("Crop canvas");
  for (const l of layers) {
    if (l.vector) {
      l.x -= x;
      l.y -= y;
      continue;
    }
    const c = surface(w, h);
    c.getContext("2d").drawImage(l.c, l.x - x, l.y - y);
    if (l.text)
      l.text = { ...l.text, x: l.text.x + l.x - x, y: l.text.y + l.y - y };
    l.c = c;
    l.x = l.y = 0;
  }
  documentPaths = documentPaths.map((path) => ({
    ...path,
    nodes: path.nodes.map((n) => translatePenNode(n, -x, -y)),
  }));
  W = w;
  H = h;
  guides = guides
    .map((g) => ({ ...g, pos: g.pos - (g.axis === "v" ? x : y) }))
    .filter((g) => g.pos >= 0 && g.pos <= (g.axis === "v" ? W : H));
  selection = null;
  refresh();
  fit();
};
$("deselect").onclick = () => {
  selection = null;
  outline();
  markSessionState();
};
$("undo").onclick = () => travel(history, future);
$("redo").onclick = () => travel(future, history);
$("zoom").onchange = () => setZoom(+$("zoom").value);
function fit() {
  zoom = Math.max(
    0.05,
    Math.min(
      1,
      ($("stage").clientWidth - 80) / W,
      ($("stage").clientHeight - 80) / H,
    ),
  );
  render();
}
$("fit").onclick = fit;
