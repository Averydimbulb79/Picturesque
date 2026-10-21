"use strict";
// gradients.js — shared editor source; load order is declared in index.html.
let gradientStops = [
  { pos: 0, colour: "#000000", alpha: 100 },
  { pos: 100, colour: "#ffffff", alpha: 100 },
];
function validateStops(stops) {
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > 8)
    throw new Error("Use two to eight colour stops.");
  for (const stop of stops) {
    parseHex(stop.colour);
    if (
      !Number.isFinite(stop.pos) ||
      stop.pos < 0 ||
      stop.pos > 100 ||
      !Number.isFinite(stop.alpha) ||
      stop.alpha < 0 ||
      stop.alpha > 100
    )
      throw new Error("Stop position and opacity must be from 0 to 100.");
  }
  return stops.map((s) => ({ ...s })).sort((a, b) => a.pos - b.pos);
}
function gradientColour(stop) {
  const rgb = parseHex(stop.colour);
  return "rgba(" + rgb.join(",") + "," + stop.alpha / 100 + ")";
}
function makeGradient(g, start, end, stops, type, reverse) {
  const radius = Math.hypot(end.x - start.x, end.y - start.y);
  if (radius < 1)
    throw new Error("Drag at least one pixel to create a gradient.");
  const fill =
    type === "radial"
      ? g.createRadialGradient(start.x, start.y, 0, start.x, start.y, radius)
      : g.createLinearGradient(start.x, start.y, end.x, end.y);
  const entries = validateStops(stops)
    .map((stop) => ({ ...stop, pos: reverse ? 100 - stop.pos : stop.pos }))
    .sort((a, b) => a.pos - b.pos);
  for (const stop of entries)
    fill.addColorStop(stop.pos / 100, gradientColour(stop));
  return fill;
}
function gradientSurface(start, end) {
  const opacity = +$("gradientOpacity").value;
  if (!Number.isFinite(opacity) || opacity < 1 || opacity > 100)
    throw new Error("Gradient opacity must be from 1 to 100%.");
  const c = surface(),
    g = c.getContext("2d");
  g.save();
  clipSelection(g, { x: 0, y: 0 });
  g.globalAlpha = opacity / 100;
  g.fillStyle = makeGradient(
    g,
    start,
    end,
    gradientStops,
    $("gradientType").value,
    $("gradientReverse").checked,
  );
  g.fillRect(0, 0, W, H);
  g.restore();
  if (selection?.bits) {
    g.globalCompositeOperation = "destination-in";
    g.drawImage(selectionMask(selection), 0, 0);
    g.globalCompositeOperation = "source-over";
  }
  return c;
}
function previewGradient(start, end) {
  octx.clearRect(0, 0, W, H);
  try {
    octx.drawImage(gradientSurface(start, end), 0, 0);
    octx.save();
    octx.setLineDash([5 / zoom, 4 / zoom]);
    octx.strokeStyle = "#fff";
    octx.lineWidth = 1.5 / zoom;
    octx.beginPath();
    octx.moveTo(start.x, start.y);
    octx.lineTo(end.x, end.y);
    octx.stroke();
    octx.setLineDash([]);
    for (const p of [start, end]) {
      octx.beginPath();
      octx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
      octx.fillStyle = "#fff";
      octx.fill();
      octx.strokeStyle = "#222";
      octx.stroke();
    }
    octx.restore();
  } catch {
    outline();
  }
}
function applyGradient(start, end) {
  if (current().vector)
    throw new Error("Rasterise the vector before applying a pixel gradient.");
  if (Math.hypot(end.x - start.x, end.y - start.y) < 1) return;
  const l = current();
  if (l.text)
    throw new Error("Rasterise this text layer before filling pixels.");
  const fill = gradientSurface(start, end),
    left = Math.floor(Math.min(0, l.x)),
    top = Math.floor(Math.min(0, l.y)),
    width = Math.ceil(Math.max(W, l.x + l.c.width)) - left,
    height = Math.ceil(Math.max(H, l.y + l.c.height)) - top;
  validSize(width, height);
  const c = surface(width, height),
    g = c.getContext("2d");
  g.drawImage(l.c, l.x - left, l.y - top);
  g.drawImage(fill, -left, -top);
  checkpoint("Gradient fill");
  l.c = c;
  l.x = left;
  l.y = top;
  $("clipboardStatus").textContent = "Gradient applied";
}
$("gradientSettings").onclick = () => {
  const dialog = $("dialog");
  dialog.classList.add("text-dialog");
  $("dialogTitle").textContent = "Gradient colour stops";
  $("fields").innerHTML =
    '<div class="text-controls-column"><h3>Colour stops</h3><p class="font-info">Position runs from 0% (start/centre) to 100% (end/edge). Stop opacity supports colour-to-transparent fills.</p><div id="gradientStops"></div><button id="addGradientStop" type="button">Add colour stop</button></div><div class="text-preview-column"><h3>Colour progression</h3><div id="gradientSwatch"></div><p id="gradientStatus" class="font-info" role="status"></p><p class="font-info">Save settings, then drag on the canvas. Choose Linear or Radial in the toolbar. Reverse swaps the progression.</p></div>';
  let draft = gradientStops.map((s) => ({ ...s }));
  const identity = $("gradientStops");
  function preview() {
    try {
      const sorted = validateStops(draft);
      $("gradientSwatch").style.backgroundImage =
        "linear-gradient(to right," +
        sorted
          .map((stop) => gradientColour(stop) + " " + stop.pos + "%")
          .join(",") +
        ")";
      $("gradientStatus").textContent = draft.length + " stops";
      return true;
    } catch (e) {
      $("gradientStatus").textContent = e.message;
      return false;
    }
  }
  function rows() {
    identity.replaceChildren();
    draft.forEach((stop, index) => {
      const row = document.createElement("div");
      row.className = "gradient-stop-row";
      for (const [key, label, type] of [
        ["pos", "Position %", "number"],
        ["colour", "Colour", "color"],
        ["alpha", "Opacity %", "number"],
      ]) {
        const wrapper = document.createElement("label");
        wrapper.textContent = label;
        const input = document.createElement("input");
        input.type = type;
        input.value = stop[key];
        input.setAttribute("aria-label", "Stop " + (index + 1) + " " + label);
        if (type === "number") {
          input.min = 0;
          input.max = 100;
          input.step = "any";
          input.required = true;
        }
        input.oninput = () => {
          stop[key] = type === "number" ? +input.value : input.value;
          preview();
        };
        wrapper.append(input);
        row.append(wrapper);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Remove stop " + (index + 1);
      remove.setAttribute("aria-label", remove.title);
      remove.disabled = draft.length <= 2;
      remove.onclick = () => {
        draft.splice(index, 1);
        rows();
      };
      row.append(remove);
      identity.append(row);
    });
    $("addGradientStop").disabled = draft.length >= 8;
    preview();
  }
  $("addGradientStop").onclick = () => {
    if (draft.length < 8) {
      draft.push({ pos: 50, colour: $("color").value, alpha: 100 });
      rows();
    }
  };
  const submit = $("form").querySelector('button[type="submit"]');
  submit.disabled = false;
  submit.textContent = "Save gradient";
  $("form").onsubmit = (e) => {
    e.preventDefault();
    if ($("gradientStops") !== identity || !preview()) return;
    gradientStops = validateStops(draft);
    dialog.close();
  };
  rows();
  dialog.showModal();
};

function fillPixels(bits, rgb, alpha) {
  const data = new Uint8ClampedArray(bits.length * 4);
  let count = 0;
  for (let i = 0; i < bits.length; i++)
    if (bits[i]) {
      const at = i * 4;
      data[at] = rgb[0];
      data[at + 1] = rgb[1];
      data[at + 2] = rgb[2];
      data[at + 3] = alpha;
      count++;
    }
  return { data, count };
}
function paintBucket(p) {
  if (busy) return;
  const l = current();
  if (l.text || l.vector) {
    $("clipboardStatus").textContent =
      "Rasterise this editable layer before filling pixels.";
    return;
  }
  try {
    const x = Math.floor(p.x),
      y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const tolerance = +$("wandTolerance").value,
      opacity = +$("bucketOpacity").value;
    if (
      !Number.isInteger(tolerance) ||
      tolerance < 0 ||
      tolerance > 255 ||
      !Number.isFinite(opacity) ||
      opacity < 1 ||
      opacity > 100
    )
      throw new Error("Use tolerance 0–255 and fill opacity 1–100%.");
    const source = surface(),
      g = source.getContext("2d");
    if ($("wandMerged").checked) composite(source);
    else g.drawImage(l.c, l.x, l.y);
    const bits = wandBits(
      g.getImageData(0, 0, W, H).data,
      W,
      H,
      x,
      y,
      tolerance,
      $("wandContiguous").checked,
      selectionBits(selection),
    );
    const fill = fillPixels(
      bits,
      parseHex($("color").value),
      Math.round((opacity * 255) / 100),
    );
    if (!fill.count) {
      $("clipboardStatus").textContent = "No editable pixels at this position.";
      return;
    }
    const left = Math.floor(Math.min(0, l.x)),
      top = Math.floor(Math.min(0, l.y)),
      width = Math.ceil(Math.max(W, l.x + l.c.width)) - left,
      height = Math.ceil(Math.max(H, l.y + l.c.height)) - top;
    validSize(width, height);
    const c = surface(width, height),
      target = c.getContext("2d");
    target.drawImage(l.c, l.x - left, l.y - top);
    const colour = surface(),
      cg = colour.getContext("2d"),
      pixels = cg.createImageData(W, H);
    pixels.data.set(fill.data);
    cg.putImageData(pixels, 0, 0);
    target.drawImage(colour, -left, -top);
    checkpoint("Paint bucket");
    l.c = c;
    l.x = left;
    l.y = top;
    refresh();
    $("clipboardStatus").textContent =
      "Filled " + fill.count.toLocaleString() + " pixels";
  } catch (e) {
    $("clipboardStatus").textContent = "Fill failed: " + e.message;
  }
}

function wandBits(data, w, h, x, y, tolerance, contiguous, allowed = null) {
  const count = w * h,
    bits = new Uint8Array(count),
    seed = y * w + x,
    at = seed * 4,
    red = data[at],
    green = data[at + 1],
    blue = data[at + 2],
    alpha = data[at + 3];
  if (allowed && !allowed[seed]) return bits;
  function matches(i) {
    if (allowed && !allowed[i]) return false;
    const j = i * 4;
    if (Math.abs(data[j + 3] - alpha) > tolerance) return false;
    if (alpha === 0 && data[j + 3] === 0) return true;
    return (
      Math.max(
        Math.abs(data[j] - red),
        Math.abs(data[j + 1] - green),
        Math.abs(data[j + 2] - blue),
      ) <= tolerance
    );
  }
  if (!contiguous) {
    for (let i = 0; i < count; i++) if (matches(i)) bits[i] = 1;
    return bits;
  }
  const queue = new Uint32Array(count);
  let head = 0,
    tail = 1;
  queue[0] = seed;
  bits[seed] = 1;
  function visit(i) {
    if (!bits[i] && matches(i)) {
      bits[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++],
      column = i % w;
    if (column > 0) visit(i - 1);
    if (column < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < count - w) visit(i + w);
  }
  return bits;
}
function selectionMask(sel) {
  if (sel.effective) return sel.effective;
  const c = surface(),
    g = c.getContext("2d"),
    pixels = g.createImageData(W, H);
  for (let i = 0; i < sel.bits.length; i++)
    pixels.data[i * 4 + 3] = (sel.inverted ? !sel.bits[i] : sel.bits[i])
      ? 255
      : 0;
  g.putImageData(pixels, 0, 0);
  sel.effective = c;
  return c;
}
function selectionEdge(bits, w, h) {
  const c = surface(w, h),
    g = c.getContext("2d"),
    pixels = g.createImageData(w, h);
  for (let i = 0; i < bits.length; i++) {
    if (!bits[i]) continue;
    const x = i % w;
    if (
      x === 0 ||
      x === w - 1 ||
      i < w ||
      i >= w * (h - 1) ||
      !bits[i - 1] ||
      !bits[i + 1] ||
      !bits[i - w] ||
      !bits[i + w]
    ) {
      const j = i * 4;
      pixels.data[j] = 70;
      pixels.data[j + 1] = 225;
      pixels.data[j + 2] = 255;
      pixels.data[j + 3] = 255;
    }
  }
  g.putImageData(pixels, 0, 0);
  return c;
}
function magicWand(p) {
  if (busy) return;
  flushCanvas();
  const x = Math.max(0, Math.min(W - 1, Math.floor(p.x))),
    y = Math.max(0, Math.min(H - 1, Math.floor(p.y))),
    t = +$("wandTolerance").value;
  if (!Number.isInteger(t) || t < 0 || t > 255) {
    $("clipboardStatus").textContent =
      "Tolerance must be a whole number from 0 to 255.";
    return;
  }
  let source = view;
  if (!$("wandMerged").checked) {
    source = surface();
    const l = current();
    source.getContext("2d").drawImage(l.c, l.x, l.y);
  }
  const data = source.getContext("2d").getImageData(0, 0, W, H).data,
    bits = wandBits(data, W, H, x, y, t, $("wandContiguous").checked);
  acceptSelection(bits, $("selectionMode").value);
  $("clipboardStatus").textContent = "Colour selection ready";
  outline();
}
