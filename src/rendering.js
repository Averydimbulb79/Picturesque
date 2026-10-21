"use strict";
// rendering.js — shared editor source; load order is declared in index.html.
function surface(w = W, h = H) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function layer(name, c = surface()) {
  return {
    name,
    c,
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
    blend: "source-over",
    brightness: 100,
    contrast: 100,
    saturation: 100,
  };
}
function current() {
  return layers[active];
}
function filter(l) {
  return `brightness(${l.brightness}%) contrast(${l.contrast}%) saturate(${l.saturation}%)`;
}
function composite(target) {
  const g = target.getContext("2d");
  g.clearRect(0, 0, W, H);
  for (const l of layers) {
    if (!l.visible) continue;
    g.save();
    g.globalAlpha = l.opacity;
    g.globalCompositeOperation = l.blend;
    g.filter = filter(l);
    g.drawImage(l.c, l.x, l.y);
    g.restore();
  }
  return target;
}
let renderFrame = 0,
  lastCompositeKey = "",
  renderEpoch = 0;
const canvasIds = new WeakMap(),
  canvasVersions = new WeakMap();
let canvasCounter = 0;
function canvasKey(c) {
  if (!canvasIds.has(c)) canvasIds.set(c, ++canvasCounter);
  return canvasIds.get(c) + ":" + (canvasVersions.get(c) || 0);
}
function compositeKey() {
  return (
    W +
    "x" +
    H +
    "|" +
    layers
      .map((l) =>
        [
          canvasKey(l.c),
          l.x,
          l.y,
          l.visible,
          l.opacity,
          l.blend,
          l.brightness,
          l.contrast,
          l.saturation,
        ].join(","),
      )
      .join("|")
  );
}
function flushCanvas() {
  if (renderFrame) {
    cancelAnimationFrame(renderFrame);
    renderFrame = 0;
  }
  const key = compositeKey();
  if (key !== lastCompositeKey) {
    composite(view);
    lastCompositeKey = key;
    renderEpoch++;
  }
}
function queueComposite() {
  if (!renderFrame)
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      flushCanvas();
    });
}
function render() {
  for (const l of layers) if (l.vector) updateVectorRaster(l);
  if (history.length && !history.at(-1).after) sealHistory();
  if (view.width !== W || view.height !== H) {
    view.width = W;
    view.height = H;
    lastCompositeKey = "";
  }
  if (overlay.width !== W || overlay.height !== H) {
    overlay.width = W;
    overlay.height = H;
  }
  for (const c of [view, overlay]) {
    c.style.width = W * zoom + "px";
    c.style.height = H * zoom + "px";
  }
  $("paper").style.width = W * zoom + "px";
  $("paper").style.height = H * zoom + "px";
  queueComposite();
  outline();
  $("status").textContent =
    `${W} × ${H} px · ${DPI} DPI · ${layers.length} layers · ${Math.round(zoom * 100)}%`;
  $("undo").disabled = !history.length;
  $("redo").disabled = !future.length;
  syncZoomReadout();
  queueRulers();
  drawGuides();
  renderDocumentTabs();
  renderHistory();
  scheduleAutosave();
}
function outline(r = selection) {
  octx.clearRect(0, 0, W, H);
  if (r?.bits) {
    octx.drawImage(r.edge, 0, 0);
  } else if (r) {
    octx.strokeStyle = "#fff";
    octx.lineWidth = 1 / zoom;
    octx.setLineDash([6 / zoom, 4 / zoom]);
    octx.strokeRect(r.x, r.y, r.w, r.h);
    octx.strokeStyle = "#111";
    octx.lineDashOffset = 6 / zoom;
    octx.strokeRect(r.x, r.y, r.w, r.h);
  }
  if (r?.inverted) {
    octx.strokeStyle = "#fff";
    octx.lineWidth = 1 / zoom;
    octx.strokeRect(0, 0, W, H);
  }
  $("invertSelection").hidden = !["select", "wand"].includes(tool);
  $("invertSelection").disabled = !selection;
  $("clearSelected").hidden = !["select", "wand"].includes(tool);
  $("clearSelected").disabled = !selection;
  $("invertSelection").setAttribute(
    "aria-pressed",
    String(!!selection?.inverted),
  );
  $("cropApply").hidden = !(selection && tool === "crop");
  if (tool === "pen") drawPenOverlay();
}
let panelKey = "";
const thumbnailCache = new WeakMap();
function thumbnail(c) {
  if (!thumbnailCache.has(c)) {
    const small = surface(88, 66),
      g = small.getContext("2d"),
      scale = Math.min(88 / c.width, 66 / c.height);
    g.drawImage(
      c,
      (88 - c.width * scale) / 2,
      (66 - c.height * scale) / 2,
      c.width * scale,
      c.height * scale,
    );
    thumbnailCache.set(c, small.toDataURL());
  }
  return thumbnailCache.get(c);
}
function panel() {
  const key = layers
    .map((l, i) =>
      [
        canvasKey(l.c),
        l.name,
        l.visible,
        !!l.text,
        !!l.vector,
        i === active,
      ].join(":"),
    )
    .join("|");
  if (key !== panelKey) {
    panelKey = key;
    const list = $("layers");
    list.replaceChildren();
    layers.forEach((l, i) => {
      const row = document.createElement("div");
      row.className = "layer" + (i === active ? " selected" : "");
      const b = document.createElement("button");
      b.innerHTML = icon(l.visible ? "eye" : "eyeOff");
      b.title = l.visible ? "Hide layer" : "Show layer";
      b.setAttribute("aria-label", b.title);
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", "Select layer " + l.name);
      row.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          active = i;
          panel();
        }
      };
      b.onclick = (e) => {
        e.stopPropagation();
        checkpoint();
        l.visible = !l.visible;
        refresh();
      };
      const thumb = document.createElement("img");
      thumb.src = thumbnail(l.c);
      thumb.alt = "";
      if (l.text) row.title = "Editable text: double-click to edit";
      const name = document.createElement("span");
      name.textContent = l.name;
      row.append(b, thumb, name);
      row.onclick = () => {
        active = i;
        panel();
      };
      row.ondblclick = () => {
        active = i;
        if (current().vector) {
          editVectorPaths();
          return;
        }
        if (current().text) openTextDialog(null, current());
      };
      list.prepend(row);
    });
  }
  const l = current();
  for (const id of ["vectorStyle", "vectorEdit", "vectorRasterize"])
    $(id).disabled = !l.vector;
  $("editText").disabled = !l.text;
  $("rasterizeText").disabled = !l.text;
  for (const p of ["brightness", "contrast", "saturation", "blend"])
    $(p).value = l[p];
  $("opacity").value = l.opacity * 100;
  for (const id of ["brightness", "contrast", "saturation", "opacity"])
    $(id).setAttribute("aria-valuetext", $(id).value + "%");
}
function refresh() {
  render();
  panel();
  penPanel();
}
