"use strict";
// clipboard.js — shared editor source; load order is declared in index.html.
function editingContext(l) {
  if (l.vector) throw new Error("Rasterise the vector before editing pixels.");
  if (!selection?.bits) invalidateCanvas(l.c);
  return selection?.bits
    ? surface(l.c.width, l.c.height).getContext("2d")
    : l.c.getContext("2d");
}
function commitSelectionEdit(l, g, erase) {
  if (!selection?.bits) return;
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.drawImage(selectionMask(selection), -l.x, -l.y);
  g.restore();
  invalidateCanvas(l.c);
  const target = l.c.getContext("2d");
  target.save();
  target.globalCompositeOperation = erase ? "destination-out" : "source-over";
  target.drawImage(g.canvas, 0, 0);
  target.restore();
}
function typingTarget(target) {
  return (
    !!target &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}
async function pasteImageBlob(blob) {
  if (busy) {
    $("clipboardStatus").textContent = "Please wait for the current operation.";
    return;
  }
  setBusy(true);
  const url = URL.createObjectURL(blob);
  try {
    const im = await decode(url);
    validSize(im.width, im.height);
    const c = surface(im.width, im.height);
    c.getContext("2d").drawImage(im, 0, 0);
    checkpoint("Paste image");
    const l = layer("Pasted image", c);
    l.x = Math.round((W - im.width) / 2);
    l.y = Math.round((H - im.height) / 2);
    layers.push(l);
    active = layers.length - 1;
    refresh();
    $("clipboardStatus").textContent = "Image pasted as a new layer";
  } catch (e) {
    $("clipboardStatus").textContent = "Paste failed: " + e.message;
  } finally {
    setBusy(false);
    URL.revokeObjectURL(url);
  }
}
document.addEventListener("paste", (e) => {
  if (typingTarget(e.target) || $("dialog").open || $("commandDialog").open)
    return;
  const item = [...(e.clipboardData?.items || [])].find(
    (item) => item.kind === "file" && item.type.startsWith("image/"),
  );
  if (item) {
    const blob = item.getAsFile();
    if (blob) {
      e.preventDefault();
      pasteImageBlob(blob);
    }
  } else if (
    e.clipboardData?.types.includes("text/html") ||
    e.clipboardData?.types.includes("text/plain")
  ) {
    $("clipboardStatus").textContent =
      "No image pixels found. Use Copy image on the website, not Copy image address.";
  }
});
$("pasteImage").onclick = async () => {
  if (!navigator.clipboard?.read) {
    $("clipboardStatus").textContent = "Use Ctrl/Cmd+V after copying an image.";
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) {
        await pasteImageBlob(await item.getType(type));
        return;
      }
    }
    $("clipboardStatus").textContent =
      "No image on clipboard. Use Copy image on the website.";
  } catch (e) {
    $("clipboardStatus").textContent =
      "Clipboard access unavailable. Use Ctrl/Cmd+V.";
  }
};

function clipSelection(g, l) {
  if (!selection || selection.bits) return;
  g.beginPath();
  if (selection.inverted) g.rect(-l.x, -l.y, W, H);
  g.rect(selection.x - l.x, selection.y - l.y, selection.w, selection.h);
  g.clip(selection.inverted ? "evenodd" : "nonzero");
}
$("invertSelection").onclick = () => {
  if (!selection) return;
  selection.inverted = !selection.inverted;
  if (selection.bits) {
    selection.effective = null;
    selectionMask(selection);
  }
  outline();
  markSessionState();
};
function rulerStep(scale) {
  const desired = 60 / scale,
    power = 10 ** Math.floor(Math.log10(desired)),
    ratio = desired / power;
  return (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power;
}
