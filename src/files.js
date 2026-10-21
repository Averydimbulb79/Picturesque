"use strict";
// files.js — shared editor source; load order is declared in index.html.
async function download(blob, name) {
  try {
    if (desktopBridge) {
      return await desktopBridge.exportFile({
        name,
        bytes: await blob.arrayBuffer(),
      });
    }
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return { cancelled: false, name };
  } catch (error) {
    $("projectSaveStatus").textContent =
      "File operation failed: " + error.message;
    throw error;
  }
}
function projectBlob(project) {
  validateProject(project);
  const blob = new Blob([JSON.stringify(project)], {
    type: "application/json",
  });
  if (blob.size > PROJECT_MAX_BYTES)
    throw new Error(
      "Project exceeds the 150 MB save/open limit. Keep this document open; reduce its size or split it into smaller projects.",
    );
  return blob;
}
async function saveProject(saveAs = false) {
  if (busy || drag || guideDrag || penDrag || $("dialog").open) {
    $("projectSaveStatus").textContent =
      "Project: finish the current operation before saving";
    return;
  }
  const status = $("projectSaveStatus");
  setBusy(true);
  try {
    status.textContent = "Project: checking save…";
    const project = snapshot(),
      blob = projectBlob(project);
    await decodeProject(JSON.parse(await blob.text()));
    const name = safeDocumentName() + ".picturesque";
    let result;
    if (desktopBridge) {
      result = await desktopBridge.saveProject({
        token: saveAs
          ? null
          : nativeProjectTokens.get(activeDocumentId) || null,
        name,
        text: await blob.text(),
      });
      if (result.cancelled) {
        status.textContent = "Project save cancelled";
        return;
      }
      nativeProjectTokens.set(activeDocumentId, result.token);
    } else result = await download(blob, name);
    documentDirty = false;
    autosaveDirty = true;
    captureDocument();
    renderDocumentTabs();
    scheduleAutosave();
    status.textContent =
      (desktopBridge ? "Saved: " : "Download started: ") +
      (result.name || name) +
      " · " +
      (blob.size / 1000000).toFixed(2) +
      " MB";
    status.title = desktopBridge
      ? "Project written successfully. Selections and view settings are included; undo history and font files are not embedded."
      : "Check your browser downloads. Starting a download cannot confirm that the file was retained. Selections and view settings are included; undo history and font files are not embedded.";
  } catch (err) {
    status.textContent = "Project save failed: " + err.message;
    alert("Project was not saved: " + err.message);
  } finally {
    setBusy(false);
  }
}
$("save").onclick = () => saveProject(false);
$("save").title = "Download editable project (Ctrl/Cmd+S)";
$("load").onclick = () =>
  desktopBridge ? openNativeFile("project") : $("projectFile").click();
$("projectFile").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || busy || !documentSlotAvailable()) return;
  setBusy(true);
  try {
    if (file.size > PROJECT_MAX_BYTES)
      throw new Error("Project exceeds the 150 MB save/open limit");
    const project = JSON.parse(await file.text()),
      decoded = await decodeProject(project);
    openDocumentState(
      decoded,
      decoded.name || file.name.replace(/\.(picturesque|json)$/i, ""),
      false,
    );
    if (!decoded.view) fit();
    $("projectSaveStatus").textContent = "Project opened: " + file.name;
  } catch (err) {
    $("projectSaveStatus").textContent = "Project open failed: " + err.message;
    alert("Could not open project: " + err.message);
  } finally {
    setBusy(false);
  }
};
function checkedExportOptions(v) {
  if (!["png", "jpeg", "webp"].includes(v.format))
    throw new Error("Choose an available image format.");
  const width = Number(v.width),
    height = Number(v.height),
    dpi = Number(v.dpi),
    quality = Number(v.quality);
  validSize(width, height);
  if (!Number.isInteger(dpi) || dpi < 1 || dpi > 2400)
    throw new Error("Resolution must be between 1 and 2400 DPI.");
  if (!Number.isFinite(quality) || quality < 1 || quality > 100)
    throw new Error("Quality must be between 1 and 100.");
  if (!/^#[0-9a-f]{6}$/i.test(v.background))
    throw new Error("Choose a background colour.");
  const name = String(v.name)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\.(png|jpe?g|webp)$/i, "");
  if (!name) throw new Error("Enter a filename.");
  return {
    ...v,
    width,
    height,
    dpi,
    quality,
    name,
    transparent: v.format !== "jpeg" && !!v.transparent,
  };
}
async function exportRaster(options) {
  const v = checkedExportOptions(options),
    source = surface();
  composite(source);
  const out = surface(v.width, v.height),
    g = out.getContext("2d");
  if (!v.transparent) {
    g.fillStyle = v.background;
    g.fillRect(0, 0, v.width, v.height);
  }
  g.imageSmoothingEnabled = !!v.smoothing;
  g.imageSmoothingQuality = "high";
  g.drawImage(source, 0, 0, v.width, v.height);
  const mime = "image/" + v.format,
    blob = await new Promise((resolve, reject) =>
      out.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image encoding failed."))),
        mime,
        v.quality / 100,
      ),
    );
  if (blob.type !== mime)
    throw new Error(
      "Your browser cannot export " +
        v.format.toUpperCase() +
        ". Choose PNG or JPEG.",
    );
  return {
    blob: v.format === "png" ? await pngResolution(blob, v.dpi) : blob,
    name: v.name + "." + (v.format === "jpeg" ? "jpg" : v.format),
  };
}
function openExportDialog() {
  if (busy || drag || guideDrag || penDrag) return;
  const dialog = $("dialog"),
    submit = $("form").querySelector('button[type="submit"]');
  dialog.classList.remove("text-dialog");
  dialog.classList.add("export-dialog");
  dialog.addEventListener(
    "close",
    () => dialog.classList.remove("export-dialog"),
    { once: true },
  );
  $("dialogTitle").textContent = "Export image";
  $("fields").innerHTML =
    '<div class="export-grid"><div><label>Filename<input id="exportName" type="text" required maxlength="180"></label><label>Format<select id="exportFormat"><option value="png">PNG · lossless</option><option value="jpeg">JPEG · smaller photographs</option><option value="webp">WebP · web images</option></select></label><p id="exportFormatInfo" class="export-note"></p><label id="exportQualityLabel" hidden>Quality (%)<input id="exportQuality" type="number" min="1" max="100" step="1" value="94"></label><label id="exportTransparentLabel"><input id="exportTransparent" type="checkbox" checked> Preserve transparency</label><label id="exportBackgroundLabel" hidden>Background colour<input id="exportBackground" type="color" value="#ffffff"></label></div><div><h3>Output size</h3><div class="type-grid"><label>Width (px)<input id="exportWidth" type="number" min="1" step="1" required></label><label>Height (px)<input id="exportHeight" type="number" min="1" step="1" required></label></div><label><input id="exportAspect" type="checkbox" checked> Lock aspect ratio</label><label><input id="exportSmoothing" type="checkbox" checked> Smooth resizing</label><label id="exportDpiLabel">PNG resolution (DPI)<input id="exportDpi" type="number" min="1" max="2400" step="1" required></label><p class="export-note">Export creates a flattened image. Save a .picturesque project separately to keep editable layers. Resizing here affects the exported copy only.</p></div></div><p id="exportMessage" role="status" aria-live="polite"></p>';
  $("exportName").value = safeDocumentName();
  $("exportWidth").value = W;
  $("exportHeight").value = H;
  $("exportDpi").value = DPI;
  const update = () => {
    const format = $("exportFormat").value,
      opaque = format === "jpeg" || !$("exportTransparent").checked;
    $("exportQualityLabel").hidden = format === "png";
    $("exportQuality").disabled = format === "png";
    $("exportTransparentLabel").hidden = format === "jpeg";
    $("exportBackgroundLabel").hidden = !opaque;
    $("exportDpiLabel").hidden = format !== "png";
    $("exportDpi").disabled = format !== "png";
    $("exportFormatInfo").textContent = {
      png: "Lossless pixels, optional transparency and embedded resolution. PNG has no quality slider.",
      jpeg: "Lossy compression. Transparent areas use the chosen background. Resolution metadata is not written.",
      webp: "Lossy compression with optional transparency. Browser encoder support is required. Resolution metadata is not written.",
    }[format];
    $("exportMessage").textContent = "";
  };
  $("exportFormat").onchange = update;
  $("exportTransparent").onchange = update;
  for (const axis of ["Width", "Height"])
    $("export" + axis).oninput = () => {
      if ($("exportAspect").checked) {
        const value = +$("export" + axis).value;
        if (Number.isFinite(value) && value > 0)
          $("export" + (axis === "Width" ? "Height" : "Width")).value =
            Math.max(1, Math.round(value * (axis === "Width" ? H / W : W / H)));
      }
    };
  update();
  submit.disabled = false;
  submit.textContent = "Export image";
  $("form").onsubmit = async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    try {
      const options = checkedExportOptions({
        name: $("exportName").value,
        format: $("exportFormat").value,
        width: $("exportWidth").value,
        height: $("exportHeight").value,
        quality: $("exportQuality").value,
        dpi: $("exportDpi").value,
        transparent: $("exportTransparent").checked,
        background: $("exportBackground").value,
        smoothing: $("exportSmoothing").checked,
      });
      submit.disabled = true;
      $("cancel").disabled = true;
      setBusy(true);
      $("exportMessage").textContent = "Encoding image…";
      const result = await exportRaster(options);
      const written = await download(result.blob, result.name);
      if (written?.cancelled) {
        $("exportMessage").textContent = "Export cancelled";
        return;
      }
      $("exportMessage").textContent =
        (desktopBridge ? "Exported: " : "Download started: ") +
        result.name +
        " · " +
        (result.blob.size / 1000000).toFixed(2) +
        " MB. Check browser downloads.";
    } catch (err) {
      $("exportMessage").textContent = "Export failed: " + err.message;
    } finally {
      submit.disabled = false;
      $("cancel").disabled = false;
      setBusy(false);
    }
  };
  dialog.showModal();
}
$("export").onclick = openExportDialog;
