"use strict";
// text.js — shared editor source; load order is declared in index.html.
const popularFonts = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Inter",
  "Nunito",
  "Nunito Sans",
  "Raleway",
  "Ubuntu",
  "Oswald",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Quicksand",
  "Rubik",
  "Barlow",
  "Figtree",
  "Outfit",
  "Source Sans 3",
  "Noto Sans",
  "Noto Sans SC",
  "Noto Sans TC",
  "Noto Sans JP",
  "Noto Sans KR",
  "Noto Serif SC",
  "Noto Serif TC",
  "Noto Serif JP",
  "ZCOOL XiaoWei",
  "Ma Shan Zheng",
  "ZCOOL KuaiLe",
  "Long Cang",
  "Liu Jian Mao Cao",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "PT Serif",
  "Libre Baskerville",
  "Cormorant Garamond",
  "EB Garamond",
  "Bodoni Moda",
  "DM Serif Display",
  "Bitter",
  "Roboto Slab",
  "Arvo",
  "Crimson Text",
  "Source Serif 4",
  "Cinzel",
  "Abril Fatface",
  "Anton",
  "Bebas Neue",
  "Righteous",
  "Pacifico",
  "Dancing Script",
  "Great Vibes",
  "Sacramento",
  "Caveat",
  "Satisfy",
  "Kalam",
  "Shadows Into Light",
  "Permanent Marker",
  "Lobster",
  "Amatic SC",
  "Indie Flower",
  "Space Mono",
  "Roboto Mono",
  "JetBrains Mono",
  "Fira Code",
  "IBM Plex Mono",
  "VT323",
  "Press Start 2P",
];
let fontFamilies = [...popularFonts].sort(),
  lastFont = "Roboto",
  cataloguePromise = null;
const fontLoads = new Map();
function fontName(value) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100 || !/^[\p{L}\p{M}\p{N} ._-]+$/u.test(name))
    throw new Error(
      "Enter a Google Fonts family name, for example Playfair Display.",
    );
  return name;
}
function fontSpec(name, size = 32) {
  return size + "px " + JSON.stringify(name);
}
function loadGoogleFont(value, bold = false, italic = false) {
  const name = fontName(value),
    key = name + "|" + (bold ? 700 : 400) + "|" + (italic ? 1 : 0);
  if (fontLoads.has(key)) return fontLoads.get(key);
  const promise = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(name).replace(/%20/g, "+") +
      (bold || italic
        ? ":ital,wght@" + (italic ? 1 : 0) + "," + (bold ? 700 : 400)
        : "") +
      "&display=swap";
    let settled = false;
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "Font loading timed out. Check your connection and try again.",
          ),
        ),
      15000,
    );
    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        link.remove();
        reject(err);
      } else resolve(name);
    }
    link.onerror = () =>
      finish(
        new Error(
          "Could not load this font. Check its family name and your connection.",
        ),
      );
    link.onload = async () => {
      try {
        const faces = await document.fonts.load(
          (italic ? "italic " : "") + (bold ? "700 " : "") + fontSpec(name),
          "Aa",
        );
        if (!faces.length)
          throw new Error(
            "This font or style is unavailable. Try another family or turn off bold/italic.",
          );
        finish();
      } catch (e) {
        finish(e);
      }
    };
    document.head.append(link);
  });
  fontLoads.set(key, promise);
  promise.catch(() => fontLoads.delete(key));
  return promise;
}
async function fontCatalogue() {
  if (!cataloguePromise)
    cataloguePromise = (async () => {
      try {
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 8000);
        let response;
        try {
          response = await fetch("https://fonts.google.com/metadata/fonts", {
            signal: controller.signal,
            credentials: "omit",
          });
        } finally {
          clearTimeout(timer);
        }
        if (!response.ok) throw new Error("Catalogue unavailable");
        const text = await response.text(),
          data = JSON.parse(text.replace(/^\)\]\}'\s*/, ""));
        if (!Array.isArray(data.familyMetadata))
          throw new Error("Invalid catalogue");
        const names = data.familyMetadata
          .map((f) => f.family)
          .filter((n) => typeof n === "string");
        if (names.length)
          fontFamilies = [...new Set([...popularFonts, ...names])].sort();
        return true;
      } catch {
        return false;
      }
    })();
  return cataloguePromise;
}
function fillFontChoices() {
  const list = $("fontFamilies");
  if (!list) return;
  list.replaceChildren();
  for (const name of fontFamilies) {
    const option = document.createElement("option");
    option.value = name;
    list.append(option);
  }
}

function sameTextStyle(a, b) {
  return (
    a.family === b.family &&
    a.size === b.size &&
    a.colour === b.colour &&
    a.tracking === b.tracking &&
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline
  );
}
function compactRuns(runs) {
  const result = [];
  for (const run of runs) {
    if (!run.text) continue;
    const last = result.at(-1);
    if (last && sameTextStyle(last, run)) last.text += run.text;
    else result.push({ ...run });
  }
  return result;
}
function runsSlice(runs, start, end) {
  let offset = 0;
  const result = [];
  for (const run of runs) {
    const a = Math.max(0, start - offset),
      b = Math.min(run.text.length, end - offset);
    if (b > a) result.push({ ...run, text: run.text.slice(a, b) });
    offset += run.text.length;
  }
  return result;
}
function runStyleAt(runs, index, fallback) {
  let at = 0;
  for (const run of runs) {
    at += run.text.length;
    if (index < at) return { ...run, text: "" };
  }
  return { ...(runs.at(-1) || fallback), text: "" };
}
function formatRuns(runs, start, end, style) {
  const total = runs.reduce((n, r) => n + r.text.length, 0);
  return compactRuns([
    ...runsSlice(runs, 0, start),
    ...runsSlice(runs, start, end).map((r) => ({
      ...r,
      ...style,
      text: r.text,
    })),
    ...runsSlice(runs, end, total),
  ]);
}
function replaceRunText(runs, oldText, newText, fallback) {
  let start = 0;
  while (
    start < oldText.length &&
    start < newText.length &&
    oldText[start] === newText[start]
  )
    start++;
  let oldEnd = oldText.length,
    newEnd = newText.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }
  const inherited = runStyleAt(runs, Math.max(0, start - 1), fallback);
  return compactRuns([
    ...runsSlice(runs, 0, start),
    { ...inherited, text: newText.slice(start, newEnd) },
    ...runsSlice(runs, oldEnd, oldText.length),
  ]);
}
function validateRichText(text) {
  if (
    text.version !== 1 ||
    !Number.isFinite(text.x) ||
    !Number.isFinite(text.y) ||
    !Number.isFinite(text.leading) ||
    text.leading < 1 ||
    text.leading > 3000 ||
    !Array.isArray(text.runs) ||
    text.runs.length > 10000
  )
    throw new Error("Invalid editable text layer");
  let length = 0;
  for (const r of text.runs) {
    if (
      typeof r.text !== "string" ||
      typeof r.family !== "string" ||
      !Number.isInteger(r.size) ||
      r.size < 1 ||
      r.size > 1000 ||
      !/^#[0-9a-f]{6}$/i.test(r.colour) ||
      !Number.isFinite(r.tracking) ||
      r.tracking < -100 ||
      r.tracking > 500
    )
      throw new Error("Invalid text formatting");
    for (const key of ["bold", "italic", "underline"])
      if (r[key] !== undefined && typeof r[key] !== "boolean")
        throw new Error("Invalid text style");
    fontName(r.family);
    length += r.text.length;
  }
  if (length > 100000) throw new Error("Text layer exceeds 100,000 characters");
}
function richFontSpec(run) {
  return (
    (run.italic ? "italic " : "") +
    (run.bold ? "700 " : "") +
    fontSpec(run.family, run.size)
  );
}
function paintRichText(g, model) {
  let x = model.x,
    y = model.y;
  g.save();
  g.fontKerning = "normal";
  for (const run of model.runs) {
    g.font = richFontSpec(run);
    g.fillStyle = run.colour;
    if (run.tracking !== 0 && !("letterSpacing" in g))
      throw new Error("Nonzero letter spacing needs a newer browser.");
    if ("letterSpacing" in g) g.letterSpacing = run.tracking + "px";
    const lines = run.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (i) {
        x = model.x;
        y += model.leading;
      }
      if (lines[i]) {
        g.fillText(lines[i], x, y);
        const width = g.measureText(lines[i]).width;
        if (run.underline) {
          g.save();
          g.strokeStyle = run.colour;
          g.lineWidth = Math.max(1, run.size * 0.055);
          g.beginPath();
          g.moveTo(x, y + run.size * 0.13);
          g.lineTo(x + width, y + run.size * 0.13);
          g.stroke();
          g.restore();
        }
        x += width;
      }
    }
  }
  g.restore();
}
async function prepareRichFonts(model) {
  const variants = new Map();
  for (const run of model.runs)
    variants.set(run.family + "|" + !!run.bold + "|" + !!run.italic, run);
  await Promise.all(
    [...variants.values()].map((r) =>
      loadGoogleFont(r.family, !!r.bold, !!r.italic),
    ),
  );
  await Promise.all(
    model.runs
      .filter((r) => r.text)
      .map((r) => document.fonts.load(richFontSpec(r), r.text)),
  );
}
$("editText").onclick = () => {
  if (current().text) openTextDialog(null, current());
};
$("rasterizeText").onclick = () => {
  if (!current().text) return;
  checkpoint();
  delete current().text;
  refresh();
};
function openTextDialog(position, existing = null) {
  const dialog = $("dialog"),
    model = existing
      ? JSON.parse(JSON.stringify(existing.text))
      : {
          version: 1,
          x: position.x,
          y: position.y,
          leading: 80,
          runs: [
            {
              text: "Hello, beautiful.",
              family: lastFont,
              size: 64,
              colour: $("color").value,
              tracking: 0,
            },
          ],
        };
  validateRichText(model);
  dialog.classList.add("text-dialog");
  $("dialogTitle").textContent = existing
    ? "Edit text layer · mixed formatting"
    : "Add text · mixed formatting";
  $("fields").innerHTML =
    '<div class="text-controls-column"><h3>Text & formatting</h3><label>Text — highlight the words to format<textarea id="textContent" required spellcheck="false"></textarea></label><label>Formatting target<select id="textFormatTarget"><option value="selection">Selected words</option><option value="all">Entire layer</option></select></label><p id="textSelectionInfo" class="font-info" role="status"></p><label>Font family<input id="fontFamily" list="fontFamilies" autocomplete="off" required><datalist id="fontFamilies"></datalist></label><div id="fontCatalogueStatus" class="font-info"></div><div class="type-grid"><label>Size (px)<input id="textSize" type="number" min="1" max="1000" required></label><label>Word colour<input id="textColour" type="color"></label></div><div class="text-style-buttons" role="group" aria-label="Text style"><label><input id="textBold" type="checkbox"> <strong>Bold</strong></label><label><input id="textItalic" type="checkbox"> <em>Italic</em></label><label><input id="textUnderline" type="checkbox"> <span style="text-decoration:underline">Underline</span></label></div><div class="type-grid"><label>Letter spacing (px)<input id="textTracking" type="number" min="-100" max="500" step="0.1" required></label><label>Layer leading (px)<input id="textLeading" type="number" min="1" max="3000" step="0.1" required></label></div><button id="applyWordFormat" type="button">Apply formatting</button><p class="font-info">Highlight words in the text box or preview, choose formatting, then Apply. Use Entire layer explicitly to change everything.</p></div><div class="text-preview-column"><h3>Mixed-font preview</h3><div id="fontPreview" class="font-preview" aria-label="Mixed formatting preview"></div><p id="fontStatus" class="font-info" role="status" aria-live="polite"></p><p class="font-info">Font changes load from Google. <a href="https://fonts.google.com/" target="_blank" rel="noopener noreferrer">Browse Google Fonts</a>. Text remains editable in saved projects. Double-click a text layer or use Edit text to reopen it.</p></div>';
  const editor = $("textContent"),
    familyField = $("fontFamily"),
    submit = $("form").querySelector('button[type="submit"]');
  editor.value = model.runs.map((r) => r.text).join("");
  let oldText = editor.value,
    formatBusy = false,
    draftChanged = false,
    rememberedRange = null;
  const defaultStyle = model.runs[0] || {
    family: lastFont,
    size: 64,
    colour: $("color").value,
    tracking: 0,
  };
  function setControls(style) {
    $("fontFamily").value = style.family;
    $("textSize").value = style.size;
    $("textColour").value = style.colour;
    $("textTracking").value = style.tracking;
    $("textBold").checked = !!style.bold;
    $("textItalic").checked = !!style.italic;
    $("textUnderline").checked = !!style.underline;
  }
  $("textLeading").value = model.leading;
  setControls(defaultStyle);
  fillFontChoices();
  $("fontCatalogueStatus").textContent = "Search a Google Fonts family";
  fontCatalogue().then((ok) => {
    if ($("fontFamily") !== familyField) return;
    fillFontChoices();
    $("fontCatalogueStatus").textContent = ok
      ? fontFamilies.length + " font families available"
      : "Popular fonts listed; any exact family name can be entered";
  });
  function drawPreview() {
    if ($("fontFamily") !== familyField) return;
    const root = $("fontPreview");
    root.replaceChildren();
    const maxSize = Math.max(1, ...model.runs.map((r) => r.size)),
      scale = Math.min(1, 52 / maxSize);
    root.style.fontSize = "";
    root.style.lineHeight = model.leading * scale + "px";
    root.style.letterSpacing = "";
    root.style.fontFamily = "";
    root.style.whiteSpace = "pre";
    for (const run of model.runs) {
      const span = document.createElement("span");
      span.textContent = run.text;
      span.style.fontFamily = JSON.stringify(run.family) + ", sans-serif";
      span.style.fontSize = run.size * scale + "px";
      span.style.fontWeight = run.bold ? "700" : "400";
      span.style.fontStyle = run.italic ? "italic" : "normal";
      span.style.textDecoration = run.underline ? "underline" : "none";
      span.style.color = run.colour;
      span.style.letterSpacing = run.tracking * scale + "px";
      root.append(span);
    }
  }
  function targetRange() {
    if ($("textFormatTarget").value === "all")
      return { start: 0, end: editor.value.length };
    if (
      !rememberedRange ||
      rememberedRange.end > editor.value.length ||
      rememberedRange.start >= rememberedRange.end
    )
      return null;
    return { ...rememberedRange };
  }
  function selectionInfo() {
    if ($("fontFamily") !== familyField) return;
    const range = targetRange();
    $("textSelectionInfo").textContent = range
      ? ($("textFormatTarget").value === "all"
          ? "Entire layer"
          : JSON.stringify(
              editor.value.slice(range.start, range.end).slice(0, 45),
            )) +
        " · " +
        (range.end - range.start) +
        " characters"
      : "Highlight words in the text box or preview first.";
    $("applyWordFormat").textContent =
      $("textFormatTarget").value === "all"
        ? "Apply to entire layer"
        : "Apply to selected words";
    $("applyWordFormat").disabled = formatBusy || !range;
  }
  function rememberRange(start, end, updateControls = false) {
    if (end > start) {
      rememberedRange = { start, end };
      $("textFormatTarget").value = "selection";
      if (updateControls) {
        setControls(runStyleAt(model.runs, start, defaultStyle));
        draftChanged = false;
      }
    }
    selectionInfo();
  }
  function captureEditorRange(updateControls = false) {
    if (editor.selectionEnd > editor.selectionStart)
      rememberRange(editor.selectionStart, editor.selectionEnd, updateControls);
  }
  editor.onselect = () => captureEditorRange(document.activeElement === editor);
  editor.onblur = () => captureEditorRange(false);
  editor.onmouseup = () => {
    if (editor.selectionStart === editor.selectionEnd) rememberedRange = null;
    captureEditorRange(true);
    selectionInfo();
  };
  editor.onkeyup = () => {
    if (editor.selectionStart === editor.selectionEnd) rememberedRange = null;
    captureEditorRange(true);
    selectionInfo();
  };
  function capturePreviewRange() {
    const selected = window.getSelection();
    if (!selected || !selected.rangeCount || selected.isCollapsed) return;
    const range = selected.getRangeAt(0),
      preview = $("fontPreview");
    if (
      !preview.contains(range.startContainer) ||
      !preview.contains(range.endContainer)
    )
      return;
    const before = document.createRange();
    before.selectNodeContents(preview);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    rememberRange(start, start + range.toString().length, true);
  }
  $("fontPreview").onmouseup = capturePreviewRange;
  $("fontPreview").onkeyup = capturePreviewRange;
  $("textFormatTarget").onchange = selectionInfo;
  editor.oninput = () => {
    const next = editor.value;
    model.runs = replaceRunText(model.runs, oldText, next, defaultStyle);
    oldText = next;
    rememberedRange = null;
    drawPreview();
    selectionInfo();
  };
  for (const id of [
    "fontFamily",
    "textSize",
    "textColour",
    "textTracking",
    "textBold",
    "textItalic",
    "textUnderline",
  ])
    $(id).oninput = () => (draftChanged = true);
  $("textLeading").oninput = () => {
    const leading = +$("textLeading").value;
    if (Number.isFinite(leading) && leading >= 1 && leading <= 3000) {
      model.leading = leading;
      drawPreview();
    }
  };
  async function applyFormat() {
    if (formatBusy) return false;
    const range = targetRange();
    if (!range) {
      $("fontStatus").textContent =
        "Highlight the words to format, or choose Entire layer.";
      return false;
    }
    formatBusy = true;
    $("applyWordFormat").disabled = true;
    const { start, end } = range,
      content = editor.value;
    try {
      const style = {
        family: fontName(familyField.value),
        size: +$("textSize").value,
        colour: $("textColour").value,
        tracking: +$("textTracking").value,
        bold: $("textBold").checked,
        italic: $("textItalic").checked,
        underline: $("textUnderline").checked,
      };
      const probe = { ...model, runs: [{ ...style, text: content }] };
      validateRichText(probe);
      $("fontStatus").textContent = "Loading selected font…";
      await prepareRichFonts(probe);
      if ($("fontFamily") !== familyField || !dialog.open) return false;
      if (editor.value !== content)
        throw new Error(
          "Text changed while the font loaded. Apply formatting again.",
        );
      model.runs = formatRuns(model.runs, start, end, style);
      if (!model.runs.length) model.runs = [{ ...style, text: "" }];
      lastFont = style.family;
      draftChanged = false;
      drawPreview();
      $("fontStatus").textContent =
        "Formatting applied. Save the layer when ready.";
      return true;
    } catch (e) {
      if ($("fontFamily") === familyField)
        $("fontStatus").textContent = e.message;
      return false;
    } finally {
      formatBusy = false;
      if ($("fontFamily") === familyField) selectionInfo();
    }
  }
  $("applyWordFormat").onclick = applyFormat;
  submit.disabled = false;
  submit.textContent = existing ? "Save text layer" : "Add text layer";
  $("form").onsubmit = async (e) => {
    e.preventDefault();
    if (submit.disabled || formatBusy) return;
    submit.disabled = true;
    try {
      if (draftChanged && !(await applyFormat())) return;
      model.leading = +$("textLeading").value;
      validateRichText(model);
      if (!editor.value.length) throw new Error("Enter some text.");
      await prepareRichFonts(model);
      if ($("fontFamily") !== familyField || !dialog.open) return;
      const c = surface(
        existing ? existing.c.width : W,
        existing ? existing.c.height : H,
      );
      paintRichText(c.getContext("2d"), model);
      checkpoint(existing ? "Edit text" : "Add text");
      if (existing) {
        existing.c = c;
        existing.text = JSON.parse(JSON.stringify(model));
        active = layers.indexOf(existing);
      } else {
        const l = layer(editor.value.slice(0, 24) || "Text", c);
        l.text = JSON.parse(JSON.stringify(model));
        layers.push(l);
        active = layers.length - 1;
      }
      dialog.close();
      refresh();
    } catch (e) {
      if ($("fontFamily") === familyField)
        $("fontStatus").textContent = e.message;
    } finally {
      submit.disabled = false;
    }
  };
  dialog.showModal();
  selectionInfo();
  drawPreview();
  prepareRichFonts(model)
    .then(() => {
      if ($("fontFamily") === familyField) {
        drawPreview();
        $("fontStatus").textContent =
          "Fonts ready. Select words in the text box to format them.";
      }
    })
    .catch((e) => {
      if ($("fontFamily") === familyField)
        $("fontStatus").textContent = e.message;
    });
}
