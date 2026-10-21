"use strict";
// canvas.js — shared editor source; load order is declared in index.html.
const paperPresets = {
  Custom: null,
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  B4: [250, 353],
  B5: [176, 250],
  "US Letter": [215.9, 279.4],
  "US Legal": [215.9, 355.6],
  "US Tabloid": [279.4, 431.8],
};
function pixelsFrom(value, unit, dpi) {
  return Math.round(
    value *
      (unit === "mm"
        ? dpi / 25.4
        : unit === "cm"
          ? dpi / 2.54
          : unit === "in"
            ? dpi
            : 1),
  );
}
function canvasDialog(resize) {
  const dialog = $("dialog");
  dialog.classList.remove("text-dialog");
  $("dialogTitle").textContent = resize ? "Canvas size" : "New canvas";
  $("fields").innerHTML =
    '<label>Paper preset<select id="paperPreset"></select></label><div class="type-grid"><label>Orientation<select id="paperOrientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label>Units<select id="paperUnit"><option value="px">Pixels</option><option value="mm">Millimetres</option><option value="cm">Centimetres</option><option value="in">Inches</option></select></label></div><div class="type-grid"><label>Width<input id="paperWidth" type="number" min="0.001" step="any" required></label><label>Height<input id="paperHeight" type="number" min="0.001" step="any" required></label></div><label>Resolution (DPI / pixels per inch)<input id="paperDpi" type="number" min="1" max="2400" step="1" required></label><p id="paperSummary" class="font-info" role="status"></p><p class="font-info">DPI converts physical sizes into pixels. PNG export includes this resolution; JPEG/WebP export currently retains pixels only. Canvas resizing keeps layers at their top-left positions and does not resample them. Sizes above the current pixel limit must use a lower DPI.</p>';
  for (const name of Object.keys(paperPresets)) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    $("paperPreset").append(o);
  }
  $("paperWidth").value = resize ? W : 1200;
  $("paperHeight").value = resize ? H : 800;
  $("paperDpi").value = resize ? DPI : 300;
  let lastUnit = "px";
  function dimensions() {
    const dpi = +$("paperDpi").value,
      w = +$("paperWidth").value,
      h = +$("paperHeight").value;
    if (
      !Number.isInteger(dpi) ||
      dpi < 1 ||
      dpi > 2400 ||
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w <= 0 ||
      h <= 0
    )
      throw new Error(
        "Enter positive dimensions and a whole DPI from 1 to 2400.",
      );
    const pw = pixelsFrom(w, $("paperUnit").value, dpi),
      ph = pixelsFrom(h, $("paperUnit").value, dpi);
    validSize(pw, ph);
    return { w: pw, h: ph, dpi };
  }
  function summary() {
    try {
      const d = dimensions();
      $("paperSummary").textContent =
        d.w +
        " × " +
        d.h +
        " px · " +
        ((d.w / d.dpi) * 25.4).toFixed(2) +
        " × " +
        ((d.h / d.dpi) * 25.4).toFixed(2) +
        " mm at " +
        d.dpi +
        " DPI";
    } catch (e) {
      $("paperSummary").textContent = e.message;
    }
  }
  function preset() {
    const dims = paperPresets[$("paperPreset").value];
    if (dims) {
      $("paperUnit").value = lastUnit = "mm";
      const [w, h] =
        $("paperOrientation").value === "landscape" ? [dims[1], dims[0]] : dims;
      $("paperWidth").value = w;
      $("paperHeight").value = h;
    }
    summary();
  }
  $("paperPreset").onchange = preset;
  $("paperOrientation").onchange = () => {
    if (paperPresets[$("paperPreset").value]) preset();
    else {
      const a = $("paperWidth").value;
      $("paperWidth").value = $("paperHeight").value;
      $("paperHeight").value = a;
      summary();
    }
  };
  $("paperUnit").onchange = () => {
    const unit = $("paperUnit").value,
      dpi = +$("paperDpi").value;
    if (dpi > 0)
      for (const id of ["paperWidth", "paperHeight"]) {
        const px =
          +$(id).value *
          (lastUnit === "mm"
            ? dpi / 25.4
            : lastUnit === "cm"
              ? dpi / 2.54
              : lastUnit === "in"
                ? dpi
                : 1);
        $(id).value = +(
          px /
          (unit === "mm"
            ? dpi / 25.4
            : unit === "cm"
              ? dpi / 2.54
              : unit === "in"
                ? dpi
                : 1)
        ).toFixed(4);
      }
    lastUnit = unit;
    summary();
  };
  for (const id of ["paperWidth", "paperHeight"])
    $(id).oninput = () => {
      $("paperPreset").value = "Custom";
      summary();
    };
  $("paperDpi").oninput = summary;
  const submit = $("form").querySelector('button[type="submit"]');
  submit.disabled = false;
  submit.textContent = resize ? "Resize canvas" : "Create canvas";
  $("form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const d = dimensions();
      if (resize) {
        checkpoint("Canvas size");
        W = d.w;
        H = d.h;
        DPI = d.dpi;
        selection = null;
        refresh();
        fit();
      } else newDoc(d.w, d.h, false, d.dpi);
      dialog.close();
    } catch (e) {
      $("paperSummary").textContent = e.message;
    }
  };
  summary();
  dialog.showModal();
}
$("canvasSize").onclick = () => canvasDialog(true);
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function pngResolution(blob, dpi) {
  const raw = new Uint8Array(await blob.arrayBuffer()),
    chunk = new Uint8Array(21),
    d = new DataView(chunk.buffer);
  d.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  const ppm = Math.round(dpi / 0.0254);
  d.setUint32(8, ppm);
  d.setUint32(12, ppm);
  chunk[16] = 1;
  d.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts = [raw.subarray(0, 8)];
  let offset = 8,
    inserted = false;
  while (offset < raw.length) {
    const size = new DataView(raw.buffer, raw.byteOffset + offset, 4).getUint32(
        0,
      ),
      end = offset + size + 12,
      type = String.fromCharCode(...raw.subarray(offset + 4, offset + 8));
    if (type !== "pHYs") parts.push(raw.subarray(offset, end));
    if (type === "IHDR") {
      parts.push(chunk);
      inserted = true;
    }
    offset = end;
  }
  if (!inserted) throw new Error("Invalid PNG export");
  return new Blob(parts, { type: "image/png" });
}
