"use strict";
// selections.js — shared editor source; load order is declared in index.html.
let snapTargets = [];
function chooseSelectionShape(shape) {
  $("selectionShape").value = shape;
  setTool("select");
}
function ellipseSelectionBits(rect, w, h) {
  const bits = new Uint8Array(w * h),
    rx = rect.w / 2,
    ry = rect.h / 2;
  if (rx <= 0 || ry <= 0) return bits;
  const cx = rect.x + rx,
    cy = rect.y + ry;
  for (
    let y = Math.max(0, Math.floor(rect.y));
    y < Math.min(h, Math.ceil(rect.y + rect.h));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(rect.x));
      x < Math.min(w, Math.ceil(rect.x + rect.w));
      x++
    )
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1)
        bits[y * w + x] = 1;
  return bits;
}
function polygonSelectionBits(points, w, h) {
  const bits = new Uint8Array(w * h);
  if (points.length < 3) return bits;
  const y0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y)))),
    y1 = Math.min(h, Math.ceil(Math.max(...points.map((p) => p.y))));
  for (let y = y0; y < y1; y++) {
    const scan = y + 0.5,
      hits = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j],
        b = points[i];
      if ((a.y <= scan && b.y > scan) || (b.y <= scan && a.y > scan))
        hits.push(a.x + ((scan - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const x0 = Math.max(0, Math.min(w, Math.ceil(hits[i] - 0.5))),
        x1 = Math.max(0, Math.min(w, Math.ceil(hits[i + 1] - 0.5)));
      if (x1 > x0) bits.fill(1, y * w + x0, y * w + x1);
    }
  }
  return bits;
}
function previewShapeSelection(state, p) {
  octx.clearRect(0, 0, W, H);
  octx.save();
  octx.lineWidth = 1 / zoom;
  octx.setLineDash([5 / zoom, 4 / zoom]);
  octx.strokeStyle = "#fff";
  octx.beginPath();
  if (state.kind === "ellipse") {
    const r = bounds(state.start, p);
    octx.ellipse(
      r.x + r.w / 2,
      r.y + r.h / 2,
      r.w / 2,
      r.h / 2,
      0,
      0,
      Math.PI * 2,
    );
  } else {
    state.points.forEach((v, i) =>
      i ? octx.lineTo(v.x, v.y) : octx.moveTo(v.x, v.y),
    );
    octx.lineTo(p.x, p.y);
    octx.closePath();
  }
  octx.stroke();
  octx.strokeStyle = "#111";
  octx.lineDashOffset = 5 / zoom;
  octx.stroke();
  octx.restore();
}
function visibleLayerBounds(c) {
  const cached = layerBoundsCache.get(c);
  if (cached) return cached;
  const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let left = c.width,
    top = c.height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (data[(y * c.width + x) * 4 + 3]) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
  const result =
    right > left
      ? { left, top, right, bottom }
      : { left: 0, top: 0, right: c.width, bottom: c.height };
  layerBoundsCache.set(c, result);
  return result;
}
function snapAxis(position, offsets, targets, threshold) {
  let delta = Infinity,
    guide = null;
  for (const target of targets)
    for (const offset of offsets) {
      const d = target - (position + offset);
      if (Math.abs(d) <= threshold && Math.abs(d) < Math.abs(delta)) {
        delta = d;
        guide = target;
      }
    }
  return {
    position: guide === null ? Math.round(position) : position + delta,
    guide,
  };
}
function snappedLayerPosition(x, y, b, bypass) {
  if (bypass || !$("snapGuides").checked || !guidesVisible)
    return { x: Math.round(x), y: Math.round(y), targets: [] };
  const usable = guides.filter(
      (g) => g.pos >= 0 && g.pos <= (g.axis === "v" ? W : H),
    ),
    sx = snapAxis(
      x,
      [b.left, (b.left + b.right) / 2, b.right],
      usable.filter((g) => g.axis === "v").map((g) => g.pos),
      6 / zoom,
    ),
    sy = snapAxis(
      y,
      [b.top, (b.top + b.bottom) / 2, b.bottom],
      usable.filter((g) => g.axis === "h").map((g) => g.pos),
      6 / zoom,
    ),
    targets = [];
  if (sx.guide !== null) targets.push({ axis: "v", pos: sx.guide });
  if (sy.guide !== null) targets.push({ axis: "h", pos: sy.guide });
  return { x: sx.position, y: sy.position, targets };
}

function rectangleBits(rect) {
  const bits = new Uint8Array(W * H),
    x0 = Math.min(W, Math.max(0, Math.floor(rect.x))),
    x1 = Math.max(0, Math.min(W, Math.ceil(rect.x + rect.w))),
    y0 = Math.min(H, Math.max(0, Math.floor(rect.y))),
    y1 = Math.max(0, Math.min(H, Math.ceil(rect.y + rect.h)));
  for (let y = y0; y < y1; y++) bits.fill(1, y * W + x0, y * W + x1);
  return bits;
}
function combineBits(old, incoming, mode) {
  const out = new Uint8Array(incoming.length);
  for (let i = 0; i < out.length; i++) {
    const a = old ? old[i] : 0,
      b = incoming[i];
    out[i] =
      mode === "add"
        ? a || b
        : mode === "subtract"
          ? a && !b
          : mode === "intersect"
            ? a && b
            : b;
  }
  return out;
}
function selectionBits(sel) {
  if (!sel) return null;
  const bits = sel.bits ? sel.bits.slice() : rectangleBits(sel);
  if (sel.inverted)
    for (let i = 0; i < bits.length; i++) bits[i] = bits[i] ? 0 : 1;
  return bits;
}
function markSessionState() {
  documentDirty = true;
  autosaveDirty = true;
  renderDocumentTabs();
  scheduleAutosave();
}
function acceptSelection(incoming, mode = "replace") {
  const bits =
    mode === "replace"
      ? incoming
      : combineBits(selectionBits(selection), incoming, mode);
  selection = {
    bits,
    edge: selectionEdge(bits, W, H),
    inverted: false,
    effective: null,
  };
  selectionMask(selection);
  outline();
  markSessionState();
}
function allPixels() {
  acceptSelection(new Uint8Array(W * H).fill(1));
  setTool("select");
}
function colourBits(data, target, tolerance, transparent = false) {
  const bits = new Uint8Array(data.length / 4);
  for (let i = 0; i < bits.length; i++) {
    const j = i * 4;
    bits[i] = transparent
      ? data[j + 3] <= tolerance
        ? 1
        : 0
      : data[j + 3] > 0 &&
          Math.max(
            Math.abs(data[j] - target[0]),
            Math.abs(data[j + 1] - target[1]),
            Math.abs(data[j + 2] - target[2]),
          ) <= tolerance
        ? 1
        : 0;
  }
  return bits;
}
function parseHex(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex))
    throw new Error("Enter a six-digit HEX colour, such as #FFFFFF.");
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function colourSelectionDialog(preset) {
  if (busy) return;
  const dialog = $("dialog");
  dialog.classList.add("text-dialog");
  $("dialogTitle").textContent =
    preset === "transparent"
      ? "Select transparent pixels"
      : "Select colour range";
  $("fields").innerHTML =
    '<div class="text-controls-column"><h3>Selection settings</h3><label>Colour<input id="rangeColour" type="color"></label><label>HEX<input id="rangeHex" type="text" pattern="#[0-9A-Fa-f]{6}" required></label><label id="rangeToleranceLabel">Tolerance (0–255)<input id="rangeTolerance" type="number" min="0" max="255" value="32" required></label><label>Sample<select id="rangeSource"><option value="merged">Merged image</option><option value="layer">Active layer</option></select></label><label>Selection mode<select id="rangeMode"><option value="replace">Replace</option><option value="add">Add</option><option value="subtract">Subtract</option><option value="intersect">Intersect</option></select></label><p class="font-info">Click the image preview to sample a colour. Cyan shows the resulting selection. Transparent pixels are excluded from colour matching.</p></div><div class="text-preview-column"><h3>Selection preview</h3><canvas id="rangePreview" aria-label="Colour range preview; click to sample a colour"></canvas><p id="rangeStatus" class="font-info" role="status"></p></div>';
  const field = $("rangeColour"),
    transparent = preset === "transparent";
  field.value =
    preset === "white"
      ? "#ffffff"
      : preset === "black"
        ? "#000000"
        : $("color").value;
  $("rangeHex").value = field.value;
  $("rangeMode").value = $("selectionMode").value;
  $("rangeSource").value = $("wandMerged").checked ? "merged" : "layer";
  if (transparent) {
    field.parentElement.hidden = true;
    $("rangeHex").parentElement.hidden = true;
    $("rangeTolerance").value = 0;
    $("rangeToleranceLabel").firstChild.textContent =
      "Maximum alpha (0 = fully transparent, 254 = partly transparent)";
    $("rangeTolerance").max = 254;
  }
  let source, bits, delay;
  function sampleData() {
    const c = surface();
    if ($("rangeSource").value === "merged") composite(c);
    else {
      const l = current();
      c.getContext("2d").drawImage(l.c, l.x, l.y);
    }
    source = c;
    return c.getContext("2d").getImageData(0, 0, W, H).data;
  }
  let data = sampleData();
  function preview() {
    if ($("rangeColour") !== field) return;
    try {
      const tolerance = +$("rangeTolerance").value;
      if (
        !Number.isInteger(tolerance) ||
        tolerance < 0 ||
        tolerance > (transparent ? 254 : 255)
      )
        throw new Error("Check the tolerance value.");
      bits = colourBits(
        data,
        parseHex($("rangeHex").value),
        tolerance,
        transparent,
      );
      const result =
          $("rangeMode").value === "replace"
            ? bits
            : combineBits(selectionBits(selection), bits, $("rangeMode").value),
        mask = surface(),
        mg = mask.getContext("2d"),
        pixels = mg.createImageData(W, H);
      let count = 0;
      for (let i = 0; i < result.length; i++)
        if (result[i]) {
          count++;
          pixels.data[i * 4] = 50;
          pixels.data[i * 4 + 1] = 220;
          pixels.data[i * 4 + 2] = 255;
          pixels.data[i * 4 + 3] = 140;
        }
      mg.putImageData(pixels, 0, 0);
      const c = $("rangePreview"),
        scale = Math.min(1, 430 / W, 350 / H);
      c.width = Math.max(1, Math.round(W * scale));
      c.height = Math.max(1, Math.round(H * scale));
      const g = c.getContext("2d");
      g.drawImage(source, 0, 0, c.width, c.height);
      g.drawImage(mask, 0, 0, c.width, c.height);
      $("rangeStatus").textContent =
        count.toLocaleString() +
        " pixels selected (" +
        ((count / (W * H)) * 100).toFixed(1) +
        "%).";
      return true;
    } catch (e) {
      bits = null;
      $("rangeStatus").textContent = e.message;
      return false;
    }
  }
  function queue() {
    clearTimeout(delay);
    delay = setTimeout(preview, 160);
  }
  field.oninput = () => {
    $("rangeHex").value = field.value;
    queue();
  };
  $("rangeHex").oninput = () => {
    if (/^#[0-9a-f]{6}$/i.test($("rangeHex").value))
      field.value = $("rangeHex").value;
    queue();
  };
  $("rangeTolerance").oninput = queue;
  $("rangeMode").onchange = preview;
  $("rangeSource").onchange = () => {
    data = sampleData();
    preview();
  };
  $("rangePreview").onclick = (e) => {
    if (transparent) return;
    const rect = e.target.getBoundingClientRect(),
      x = Math.max(
        0,
        Math.min(W - 1, Math.floor(((e.clientX - rect.left) / rect.width) * W)),
      ),
      y = Math.max(
        0,
        Math.min(H - 1, Math.floor(((e.clientY - rect.top) / rect.height) * H)),
      ),
      i = (y * W + x) * 4;
    field.value =
      "#" +
      [data[i], data[i + 1], data[i + 2]]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    $("rangeHex").value = field.value;
    preview();
  };
  const submit = $("form").querySelector('button[type="submit"]');
  submit.disabled = false;
  submit.textContent = "Apply selection";
  $("form").onsubmit = (e) => {
    e.preventDefault();
    clearTimeout(delay);
    if (!preview()) return;
    acceptSelection(bits, $("rangeMode").value);
    dialog.close();
    setTool("select");
  };
  dialog.showModal();
  preview();
}
$("selectionPreset").onchange = () => {
  const value = $("selectionPreset").value;
  $("selectionPreset").value = "";
  if (value === "all") allPixels();
  else if (value) colourSelectionDialog(value);
};
