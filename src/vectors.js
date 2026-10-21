"use strict";
// vectors.js — shared editor source; load order is declared in index.html.
function clonePen(value) {
  return JSON.parse(JSON.stringify(value));
}
function validateDocumentPaths(paths) {
  if (!Array.isArray(paths) || paths.length > 100)
    throw new Error("At most 100 paths are supported.");
  for (const p of paths) {
    if (
      typeof p.name !== "string" ||
      p.name.length > 200 ||
      typeof p.closed !== "boolean" ||
      !Array.isArray(p.nodes) ||
      p.nodes.length > 10000
    )
      throw new Error("Invalid saved path");
    for (const n of p.nodes) {
      if (
        !Number.isFinite(n.x) ||
        !Number.isFinite(n.y) ||
        Math.abs(n.x) > 1000000 ||
        Math.abs(n.y) > 1000000
      )
        throw new Error("Invalid anchor coordinates");
      for (const h of [n.in, n.out])
        if (
          h !== null &&
          (!h ||
            !Number.isFinite(h.x) ||
            !Number.isFinite(h.y) ||
            Math.abs(h.x) > 1000000 ||
            Math.abs(h.y) > 1000000)
        )
          throw new Error("Invalid path handle");
    }
  }
  return clonePen(paths);
}
function validateVector(v) {
  if (
    !v ||
    v.version !== 1 ||
    !["evenodd", "nonzero"].includes(v.fillRule) ||
    !["fill", "stroke"].every(
      (k) => v[k] === null || /^#[0-9a-f]{6}$/i.test(v[k]),
    ) ||
    !Number.isFinite(v.strokeWidth) ||
    v.strokeWidth < 0.1 ||
    v.strokeWidth > 500
  )
    throw new Error("Invalid vector style");
  validateDocumentPaths(v.paths);
}
function vectorPenMode() {
  return $("penSource").value === "layer" && !!current()?.vector;
}
function editablePaths() {
  return vectorPenMode() ? current().vector.paths : documentPaths;
}
function penLocalPoint(p) {
  return vectorPenMode() ? { x: p.x - current().x, y: p.y - current().y } : p;
}
const vectorRasterKeys = new WeakMap();
function updateVectorRaster(l) {
  if (!l.vector) return;
  const key = JSON.stringify(l.vector) + "|" + l.c.width + "x" + l.c.height;
  if (vectorRasterKeys.get(l.c) === key) return;
  const g = l.c.getContext("2d");
  g.clearRect(0, 0, l.c.width, l.c.height);
  g.beginPath();
  for (const path of l.vector.paths) tracePenPath(g, path, true);
  if (l.vector.fill) {
    g.fillStyle = l.vector.fill;
    g.fill(l.vector.fillRule);
  }
  if (l.vector.stroke) {
    g.strokeStyle = l.vector.stroke;
    g.lineWidth = l.vector.strokeWidth;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.stroke();
  }
  invalidateCanvas(l.c);
  vectorRasterKeys.set(l.c, key);
}
function addVectorLayer(paths, name = "Vector shape") {
  const l = layer(name);
  l.vector = {
    version: 1,
    paths: clonePen(paths),
    fill: $("color").value,
    stroke: null,
    strokeWidth: 3,
    fillRule: "evenodd",
  };
  layers.push(l);
  active = layers.length - 1;
  updateVectorRaster(l);
  return l;
}
function shapePath(kind, r) {
  const node = (x, y) => ({ x, y, in: null, out: null, smooth: false });
  if (kind === "rect")
    return {
      name: "Rectangle",
      closed: true,
      nodes: [
        node(r.x, r.y),
        node(r.x + r.w, r.y),
        node(r.x + r.w, r.y + r.h),
        node(r.x, r.y + r.h),
      ],
    };
  const cx = r.x + r.w / 2,
    cy = r.y + r.h / 2,
    rx = r.w / 2,
    ry = r.h / 2,
    k = 0.5522847498307936,
    nodes = [
      node(cx + rx, cy),
      node(cx, cy + ry),
      node(cx - rx, cy),
      node(cx, cy - ry),
    ];
  nodes[0].in = { x: cx + rx, y: cy - k * ry };
  nodes[0].out = { x: cx + rx, y: cy + k * ry };
  nodes[1].in = { x: cx + k * rx, y: cy + ry };
  nodes[1].out = { x: cx - k * rx, y: cy + ry };
  nodes[2].in = { x: cx - rx, y: cy + k * ry };
  nodes[2].out = { x: cx - rx, y: cy - k * ry };
  nodes[3].in = { x: cx - k * rx, y: cy - ry };
  nodes[3].out = { x: cx + k * rx, y: cy - ry };
  nodes.forEach((n) => (n.smooth = true));
  return { name: "Ellipse", closed: true, nodes };
}
function editVectorPaths() {
  if (!current().vector) return;
  $("penSource").value = "layer";
  activePath = 0;
  chosenAnchor = -1;
  penDrawing = false;
  setTool("pen");
  refresh();
  $("penMode").value = "edit";
  $("clipboardStatus").textContent =
    "Edit vector subpaths here. New path adds a subpath; even-odd fill makes overlapping enclosed areas into holes.";
}
function transformVector(kind, factor) {
  const l = current(),
    ow = l.c.width,
    oh = l.c.height,
    turn = ["left", "right"].includes(kind),
    nw = turn ? oh : Math.max(1, Math.round(ow * factor)),
    nh = turn ? ow : Math.max(1, Math.round(oh * factor));
  validSize(nw, nh);
  checkpoint("Transform vector");
  const map = (p) => {
    const x = p.x - ow / 2,
      y = p.y - oh / 2;
    return kind === "right"
      ? { x: -y + nw / 2, y: x + nh / 2 }
      : kind === "left"
        ? { x: y + nw / 2, y: -x + nh / 2 }
        : kind === "flipX"
          ? { x: ow - p.x, y: p.y }
          : kind === "flipY"
            ? { x: p.x, y: oh - p.y }
            : { x: (p.x * nw) / ow, y: (p.y * nh) / oh };
  };
  l.vector = clonePen(l.vector);
  for (const path of l.vector.paths)
    path.nodes = path.nodes.map((n) => ({
      ...n,
      ...map(n),
      in: n.in ? map(n.in) : null,
      out: n.out ? map(n.out) : null,
    }));
  if (!turn && !["flipX", "flipY"].includes(kind))
    l.vector.strokeWidth = Math.max(
      0.1,
      Math.min(500, l.vector.strokeWidth * factor),
    );
  l.c = surface(nw, nh);
  l.x += Math.round((ow - nw) / 2);
  l.y += Math.round((oh - nh) / 2);
  refresh();
}
function vectorStyleDialog() {
  const l = current();
  if (!l.vector) return;
  const d = $("dialog"),
    submit = $("form").querySelector('button[type="submit"]');
  d.classList.remove("text-dialog");
  $("dialogTitle").textContent = "Vector fill and stroke";
  $("fields").innerHTML =
    '<label><input id="vectorFillOn" type="checkbox"> Fill</label><label>Fill colour<input id="vectorFillColour" type="color"></label><label><input id="vectorStrokeOn" type="checkbox"> Stroke</label><label>Stroke colour<input id="vectorStrokeColour" type="color"></label><label>Stroke width (px)<input id="vectorWidth" type="number" min="0.1" max="500" step="0.1" required></label><label>Compound fill rule<select id="vectorRule"><option value="evenodd">Even-odd · enclosed overlaps form holes</option><option value="nonzero">Nonzero · follows path winding</option></select></label><p class="quiet">Use Edit paths to choose, duplicate, delete or draw subpaths. Vector shapes are independent of document paths.</p>';
  $("vectorFillOn").checked = !!l.vector.fill;
  $("vectorStrokeOn").checked = !!l.vector.stroke;
  $("vectorFillColour").value = l.vector.fill || "#ffffff";
  $("vectorStrokeColour").value = l.vector.stroke || "#000000";
  $("vectorWidth").value = l.vector.strokeWidth;
  $("vectorRule").value = l.vector.fillRule;
  submit.textContent = "Apply style";
  submit.disabled = false;
  $("form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const v = {
        ...l.vector,
        fill: $("vectorFillOn").checked ? $("vectorFillColour").value : null,
        stroke: $("vectorStrokeOn").checked
          ? $("vectorStrokeColour").value
          : null,
        strokeWidth: +$("vectorWidth").value,
        fillRule: $("vectorRule").value,
      };
      validateVector(v);
      checkpoint("Vector style");
      l.vector = v;
      d.close();
      refresh();
    } catch (e) {
      alert(e.message);
    }
  };
  d.showModal();
}
$("vectorStyle").onclick = vectorStyleDialog;
$("vectorEdit").onclick = editVectorPaths;
$("vectorRasterize").onclick = () => {
  if (!current().vector) return;
  checkpoint("Rasterise vector");
  updateVectorRaster(current());
  delete current().vector;
  $("penSource").value = "document";
  refresh();
};
$("penSource").onchange = () => {
  if ($("penSource").value === "layer" && !current().vector) {
    $("penSource").value = "document";
    $("clipboardStatus").textContent = "Select a vector layer first.";
  }
  activePath = 0;
  chosenAnchor = -1;
  penDrawing = false;
  refresh();
};
$("penVector").onclick = () => {
  const path = selectedPenPath();
  if (!path || path.nodes.length < 2) return;
  const paths = vectorPenMode() ? editablePaths() : [path],
    offset = vectorPenMode()
      ? { x: current().x, y: current().y }
      : { x: 0, y: 0 };
  checkpoint("Path to vector layer");
  const l = addVectorLayer(paths, path.name + " vector");
  l.x = offset.x;
  l.y = offset.y;
  editVectorPaths();
};
$("penDuplicate").onclick = () => {
  const path = selectedPenPath();
  if (!path || editablePaths().length >= 100) return;
  checkpoint("Duplicate subpath");
  const copy = clonePen(path);
  copy.name = (copy.name + " copy").slice(0, 200);
  copy.nodes = copy.nodes.map((n) => translatePenNode(n, 20, 20));
  editablePaths().push(copy);
  activePath = editablePaths().length - 1;
  chosenAnchor = -1;
  penDrawing = false;
  refresh();
};
function selectedPenPath() {
  return editablePaths()[activePath] || null;
}
function translatePenNode(node, dx, dy) {
  return {
    ...node,
    x: node.x + dx,
    y: node.y + dy,
    in: node.in ? { x: node.in.x + dx, y: node.in.y + dy } : null,
    out: node.out ? { x: node.out.x + dx, y: node.out.y + dy } : null,
  };
}
function penPanel() {
  const select = $("penPathList");
  if (activePath >= editablePaths().length)
    activePath = editablePaths().length - 1;
  select.replaceChildren();
  if (!editablePaths().length) {
    const o = document.createElement("option");
    o.textContent = "No saved paths";
    o.value = "-1";
    select.append(o);
  }
  editablePaths().forEach((path, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = path.name + (path.closed ? " · closed" : " · open");
    select.append(o);
  });
  select.value = String(activePath);
  const path = selectedPenPath(),
    has = !!path?.nodes.length;
  for (const id of [
    "penVector",
    "penDuplicate",
    "penFinish",
    "penClose",
    "penFill",
    "penStroke",
    "penSelection",
    "penRename",
    "penDelete",
    "penSVG",
  ])
    $(id).disabled = !has;
  $("penDeleteAnchor").disabled = !has || chosenAnchor < 0;
  $("penConvert").disabled = !has || chosenAnchor < 0;
  $("penClose").disabled = !has || path.closed || path.nodes.length < 2;
  $("penDelete").disabled = !path;
  $("penRename").disabled = !path;
  $("penFill").disabled = !has || path.nodes.length < 2;
  $("penStroke").disabled = !has || path.nodes.length < 2;
  $("penSelection").disabled = !has || path.nodes.length < 2;
}
function tracePenPath(g, path, append = false) {
  const nodes = path.nodes;
  if (!append) g.beginPath();
  if (!nodes.length) return;
  g.moveTo(nodes[0].x, nodes[0].y);
  for (let i = 1; i < nodes.length + (path.closed ? 1 : 0); i++) {
    const a = nodes[(i - 1) % nodes.length],
      b = nodes[i % nodes.length],
      c1 = a.out || a,
      c2 = b.in || b;
    g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
  }
  if (path.closed) g.closePath();
}
function drawPenOverlay() {
  octx.save();
  if (vectorPenMode()) octx.translate(current().x, current().y);
  octx.setLineDash([]);
  for (let index = 0; index < editablePaths().length; index++) {
    const path = editablePaths()[index];
    tracePenPath(octx, path);
    octx.strokeStyle = index === activePath ? "#61d8ff" : "#667e9280";
    octx.lineWidth = (index === activePath ? 1.5 : 1) / zoom;
    octx.stroke();
  }
  const path = selectedPenPath();
  if (path)
    path.nodes.forEach((n, i) => {
      if (i === chosenAnchor)
        for (const key of ["in", "out"])
          if (n[key]) {
            const h = n[key];
            octx.beginPath();
            octx.moveTo(n.x, n.y);
            octx.lineTo(h.x, h.y);
            octx.strokeStyle = "#afdfff";
            octx.lineWidth = 1 / zoom;
            octx.stroke();
            octx.beginPath();
            octx.arc(h.x, h.y, 3.5 / zoom, 0, Math.PI * 2);
            octx.fillStyle = "#fff";
            octx.fill();
            octx.stroke();
          }
      octx.fillStyle = i === chosenAnchor ? "#fff" : "#203746";
      octx.strokeStyle = "#61d8ff";
      octx.lineWidth = 1 / zoom;
      octx.fillRect(n.x - 3.5 / zoom, n.y - 3.5 / zoom, 7 / zoom, 7 / zoom);
      octx.strokeRect(n.x - 3.5 / zoom, n.y - 3.5 / zoom, 7 / zoom, 7 / zoom);
    });
  octx.restore();
}
function penHit(p) {
  const path = selectedPenPath();
  if (!path) return null;
  const node = path.nodes[chosenAnchor];
  if (node)
    for (const key of ["in", "out"])
      if (
        node[key] &&
        Math.hypot(p.x - node[key].x, p.y - node[key].y) < 8 / zoom
      )
        return { index: chosenAnchor, handle: key };
  for (let i = 0; i < path.nodes.length; i++)
    if (Math.hypot(p.x - path.nodes[i].x, p.y - path.nodes[i].y) < 8 / zoom)
      return { index: i, handle: null };
  return null;
}
function lerpPoint(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function cubicPoint(a, b, c, d, t) {
  const p = lerpPoint(a, b, t),
    q = lerpPoint(b, c, t),
    r = lerpPoint(c, d, t);
  return lerpPoint(lerpPoint(p, q, t), lerpPoint(q, r, t), t);
}
function splitPenSegment(path, index, t) {
  const next = (index + 1) % path.nodes.length,
    a = path.nodes[index],
    b = path.nodes[next],
    c1 = a.out || a,
    c2 = b.in || b,
    p = lerpPoint(a, c1, t),
    q = lerpPoint(c1, c2, t),
    r = lerpPoint(c2, b, t),
    u = lerpPoint(p, q, t),
    v = lerpPoint(q, r, t),
    middle = lerpPoint(u, v, t);
  a.out = p;
  b.in = r;
  const node = { ...middle, in: u, out: v, smooth: true };
  path.nodes.splice(index + 1, 0, node);
  return index + 1;
}
function nearestPenSegment(path, p) {
  let best = null;
  const count = path.closed ? path.nodes.length : path.nodes.length - 1;
  for (let i = 0; i < count; i++) {
    const a = path.nodes[i],
      b = path.nodes[(i + 1) % path.nodes.length];
    for (let step = 1; step < 64; step++) {
      const t = step / 64,
        v = cubicPoint(a, a.out || a, b.in || b, b, t),
        d = Math.hypot(v.x - p.x, v.y - p.y);
      if (!best || d < best.distance) best = { index: i, t, distance: d };
    }
  }
  if (!best) return null;
  const a = path.nodes[best.index],
    b = path.nodes[(best.index + 1) % path.nodes.length];
  let low = Math.max(0.0001, best.t - 1 / 64),
    high = Math.min(0.9999, best.t + 1 / 64);
  for (let i = 0; i < 16; i++) {
    const m1 = low + (high - low) / 3,
      m2 = high - (high - low) / 3,
      v1 = cubicPoint(a, a.out || a, b.in || b, b, m1),
      v2 = cubicPoint(a, a.out || a, b.in || b, b, m2);
    if (Math.hypot(v1.x - p.x, v1.y - p.y) < Math.hypot(v2.x - p.x, v2.y - p.y))
      high = m2;
    else low = m1;
  }
  best.t = (low + high) / 2;
  const v = cubicPoint(a, a.out || a, b.in || b, b, best.t);
  best.distance = Math.hypot(v.x - p.x, v.y - p.y);
  return best;
}
function beginNewPenPath() {
  if (editablePaths().length >= 100) {
    $("clipboardStatus").textContent = "Path limit reached (100).";
    return false;
  }
  checkpoint();
  editablePaths().push({
    name: "Path " + (editablePaths().length + 1),
    closed: false,
    nodes: [],
  });
  activePath = editablePaths().length - 1;
  chosenAnchor = -1;
  penDrawing = true;
  $("penMode").value = "draw";
  refresh();
  return true;
}
function finishPenPath() {
  penDrawing = false;
  penDrag = null;
  refresh();
  $("clipboardStatus").textContent =
    "Path finished. Use Direct selection to edit, or New path to draw another.";
}
function deletePenAnchor() {
  const path = selectedPenPath();
  if (!path || chosenAnchor < 0) return;
  checkpoint();
  path.nodes.splice(chosenAnchor, 1);
  if (path.nodes.length < 2) path.closed = false;
  chosenAnchor = Math.min(chosenAnchor, path.nodes.length - 1);
  penDrawing = false;
  refresh();
}
function convertPenAnchor() {
  const path = selectedPenPath(),
    n = path?.nodes[chosenAnchor];
  if (!n) return;
  checkpoint();
  if (n.in || n.out) {
    n.in = n.out = null;
    n.smooth = false;
  } else {
    const before =
        path.nodes[(chosenAnchor - 1 + path.nodes.length) % path.nodes.length],
      after = path.nodes[(chosenAnchor + 1) % path.nodes.length];
    let dx = (after?.x ?? n.x) - (before?.x ?? n.x),
      dy = (after?.y ?? n.y) - (before?.y ?? n.y),
      length = Math.hypot(dx, dy);
    if (length < 0.01) {
      dx = 1;
      dy = 0;
      length = 1;
    }
    const size = 30 / zoom;
    n.in = { x: n.x - (dx / length) * size, y: n.y - (dy / length) * size };
    n.out = { x: n.x + (dx / length) * size, y: n.y + (dy / length) * size };
    n.smooth = true;
  }
  refresh();
}
function penPointerDown(e, p) {
  p = penLocalPoint(p);
  let path = selectedPenPath();
  const mode = e.ctrlKey || e.metaKey ? "edit" : $("penMode").value,
    hit = penHit(p);
  if (mode === "remove") {
    if (hit) {
      chosenAnchor = hit.index;
      deletePenAnchor();
    }
    return;
  }
  if (mode === "convert" || (e.altKey && hit && !hit.handle)) {
    if (hit) {
      chosenAnchor = hit.index;
      convertPenAnchor();
    }
    return;
  }
  if (mode === "add") {
    if (!path) return;
    if (path.nodes.length >= 10000) {
      $("clipboardStatus").textContent = "Anchor limit reached.";
      return;
    }
    const near = nearestPenSegment(path, p);
    if (near && near.distance <= 10 / zoom) {
      checkpoint();
      chosenAnchor = splitPenSegment(path, near.index, near.t);
      penDrawing = false;
      refresh();
    }
    return;
  }
  if (mode === "edit") {
    if (!hit) {
      chosenAnchor = -1;
      outline();
      penPanel();
      return;
    }
    checkpoint();
    chosenAnchor = hit.index;
    penDrag = {
      index: hit.index,
      kind: hit.handle || "anchor",
      start: p,
      original: clonePen(path.nodes[hit.index]),
    };
    view.setPointerCapture(e.pointerId);
    outline();
    penPanel();
    return;
  }
  if (
    path &&
    penDrawing &&
    hit?.index === 0 &&
    !hit.handle &&
    path.nodes.length >= 2
  ) {
    checkpoint();
    path.closed = true;
    penDrawing = false;
    chosenAnchor = 0;
    refresh();
    return;
  }
  if (
    path &&
    !path.closed &&
    hit?.index === path.nodes.length - 1 &&
    !hit.handle
  ) {
    penDrawing = true;
    chosenAnchor = hit.index;
    checkpoint();
    penDrag = {
      index: chosenAnchor,
      kind: "curve",
      start: { x: path.nodes[chosenAnchor].x, y: path.nodes[chosenAnchor].y },
    };
    view.setPointerCapture(e.pointerId);
    refresh();
    return;
  }
  if (!path || path.closed || !penDrawing) {
    if (!beginNewPenPath()) return;
    path = selectedPenPath();
    if (!path || path.closed) return;
  } else checkpoint();
  if (path.nodes.length >= 10000) {
    $("clipboardStatus").textContent = "Anchor limit reached.";
    return;
  }
  path.nodes.push({ x: p.x, y: p.y, in: null, out: null, smooth: false });
  chosenAnchor = path.nodes.length - 1;
  penDrawing = true;
  penDrag = { index: chosenAnchor, kind: "curve", start: p };
  view.setPointerCapture(e.pointerId);
  refresh();
}
function penPointerMove(e, p) {
  p = penLocalPoint(p);
  const path = selectedPenPath(),
    n = path?.nodes[penDrag?.index];
  if (!n) return;
  if (penDrag.kind === "anchor") {
    path.nodes[penDrag.index] = translatePenNode(
      penDrag.original,
      p.x - penDrag.start.x,
      p.y - penDrag.start.y,
    );
  } else {
    const origin = { x: n.x, y: n.y };
    if (e.shiftKey) {
      const radius = Math.hypot(p.x - origin.x, p.y - origin.y),
        angle =
          (Math.round(
            Math.atan2(p.y - origin.y, p.x - origin.x) / (Math.PI / 4),
          ) *
            Math.PI) /
          4;
      p = {
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
      };
    }
    if (penDrag.kind === "curve") {
      if (Math.hypot(p.x - n.x, p.y - n.y) < 2 / zoom) return;
      n.out = { ...p };
      n.in = e.altKey ? null : { x: 2 * n.x - p.x, y: 2 * n.y - p.y };
      n.smooth = !e.altKey;
    } else {
      const key = penDrag.kind,
        other = key === "in" ? "out" : "in";
      n[key] = { ...p };
      if (e.altKey) n.smooth = false;
      else if (n.smooth && n[other]) {
        const length = Math.hypot(n[other].x - n.x, n[other].y - n.y),
          distance = Math.hypot(p.x - n.x, p.y - n.y);
        if (distance)
          n[other] = {
            x: n.x - ((p.x - n.x) / distance) * length,
            y: n.y - ((p.y - n.y) / distance) * length,
          };
      }
    }
  }
  if (vectorPenMode()) {
    updateVectorRaster(current());
    queueComposite();
  }
  outline();
}
function closePenPath() {
  const p = selectedPenPath();
  if (!p || p.nodes.length < 2 || p.closed) return;
  checkpoint();
  p.closed = true;
  penDrawing = false;
  refresh();
}
function penOutput(stroke = false) {
  const path = selectedPenPath();
  if (!path || path.nodes.length < 2) return;
  const width = +$("penStrokeWidth").value;
  if (stroke && (!Number.isFinite(width) || width < 0.1 || width > 500)) {
    alert("Stroke width must be 0.1–500 px.");
    return;
  }
  const c = surface(),
    g = c.getContext("2d");
  g.save();
  clipSelection(g, { x: 0, y: 0 });
  if (vectorPenMode()) g.translate(current().x, current().y);
  tracePenPath(g, path);
  if (stroke) {
    g.strokeStyle = $("color").value;
    g.lineWidth = width;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.stroke();
  } else {
    g.fillStyle = $("color").value;
    g.fill("evenodd");
  }
  g.restore();
  if (selection?.bits) {
    g.globalCompositeOperation = "destination-in";
    g.drawImage(selectionMask(selection), 0, 0);
  }
  checkpoint(stroke ? "Stroke path" : "Fill path");
  layers.push(layer(path.name + (stroke ? " stroke" : " fill"), c));
  active = layers.length - 1;
  refresh();
}
function penToSelection() {
  const path = selectedPenPath();
  if (!path || path.nodes.length < 2) return;
  const c = surface(),
    g = c.getContext("2d");
  if (vectorPenMode()) g.translate(current().x, current().y);
  tracePenPath(g, path);
  g.fillStyle = "#fff";
  g.fill("evenodd");
  const data = g.getImageData(0, 0, W, H).data,
    bits = new Uint8Array(W * H);
  for (let i = 0; i < bits.length; i++)
    bits[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  acceptSelection(bits, $("selectionMode").value);
  setTool("select");
}
function penPathData(path) {
  if (!path.nodes.length) return "";
  const n = path.nodes;
  let d = "M " + n[0].x + " " + n[0].y;
  for (let i = 1; i < n.length + (path.closed ? 1 : 0); i++) {
    const a = n[(i - 1) % n.length],
      b = n[i % n.length],
      p = a.out || a,
      q = b.in || b;
    d +=
      " C " + p.x + " " + p.y + " " + q.x + " " + q.y + " " + b.x + " " + b.y;
  }
  return d + (path.closed ? " Z" : "");
}
$("penNew").onclick = beginNewPenPath;
$("penFinish").onclick = finishPenPath;
$("penClose").onclick = closePenPath;
$("penDeleteAnchor").onclick = deletePenAnchor;
$("penConvert").onclick = convertPenAnchor;
$("penFill").onclick = () => penOutput(false);
$("penStroke").onclick = () => penOutput(true);
$("penSelection").onclick = penToSelection;
$("penPathList").onchange = () => {
  activePath = +$("penPathList").value;
  chosenAnchor = -1;
  penDrawing = false;
  refresh();
};
$("penMode").onchange = () => {
  penDrawing = false;
  penDrag = null;
  outline();
};
$("penRename").onclick = () => {
  const p = selectedPenPath();
  if (p)
    ask("Rename path", [["name", "Path name", "text", p.name]], (v) => {
      if (v.name.length > 200) throw new Error("Use at most 200 characters.");
      checkpoint();
      p.name = v.name;
      refresh();
    });
};
$("penDelete").onclick = () => {
  if (activePath < 0) return;
  checkpoint();
  editablePaths().splice(activePath, 1);
  activePath = Math.min(activePath, editablePaths().length - 1);
  chosenAnchor = -1;
  penDrawing = false;
  refresh();
};
$("penSVG").onclick = () => {
  const p = selectedPenPath();
  if (!p) return;
  const width = +$("penStrokeWidth").value;
  if (!Number.isFinite(width) || width < 0.1 || width > 500) return;
  download(
    new Blob(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
          W +
          " " +
          H +
          '" width="' +
          W +
          '" height="' +
          H +
          '"><path d="' +
          penPathData(p) +
          '" fill="none" stroke="' +
          $("color").value +
          '" stroke-width="' +
          width +
          '" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      ],
      { type: "image/svg+xml" },
    ),
    "Picturesque-path.svg",
  );
};
