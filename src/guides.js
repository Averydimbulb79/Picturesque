"use strict";
// guides.js — shared editor source; load order is declared in index.html.
function rulerTicks(origin, length, scale) {
  const major = rulerStep(scale),
    minor = major / 5,
    start = Math.ceil(-origin / scale / minor),
    end = Math.floor((length - origin) / scale / minor),
    ticks = [];
  for (let i = start; i <= end; i++) {
    const value = i * minor;
    ticks.push({
      value,
      at: Math.round(origin + value * scale) + 0.5,
      major: i % 5 === 0,
    });
  }
  return ticks;
}
let rulerRenderKey = "";
function drawRulers() {
  const shell = $("workspaceViewport");
  shell.classList.toggle("without-rulers", !rulersVisible);
  $("rulerCorner").hidden = !rulersVisible;
  for (const id of ["rulerHorizontal", "rulerVertical"])
    $(id).hidden = !rulersVisible;
  if (!rulersVisible) {
    rulerRenderKey = "";
    return;
  }
  const paper = $("paper").getBoundingClientRect(),
    stageRect = $("stage").getBoundingClientRect(),
    key = [
      paper.left,
      paper.top,
      stageRect.left,
      stageRect.top,
      $("stage").clientWidth,
      $("stage").clientHeight,
      zoom,
    ].join(":");
  if (key === rulerRenderKey) return;
  rulerRenderKey = key;
  for (const [id, vertical] of [
    ["rulerHorizontal", false],
    ["rulerVertical", true],
  ]) {
    const c = $(id),
      length = vertical ? $("stage").clientHeight : $("stage").clientWidth;
    c.width = vertical ? 22 : length;
    c.height = vertical ? length : 22;
    c.style.width = c.width + "px";
    c.style.height = c.height + "px";
    const rect = c.getBoundingClientRect(),
      origin = vertical ? paper.top - rect.top : paper.left - rect.left,
      g = c.getContext("2d");
    g.fillStyle = "#353535";
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "#929292";
    g.fillStyle = "#c6c6c6";
    g.font = "9px system-ui";
    g.lineWidth = 1;
    for (const tick of rulerTicks(origin, length, zoom)) {
      const { at, major, value } = tick;
      g.beginPath();
      if (vertical) {
        g.moveTo(22, at);
        g.lineTo(major ? 10 : 17, at);
        if (major) {
          g.save();
          g.translate(7, at + 3);
          g.rotate(-Math.PI / 2);
          g.fillText(String(Math.round(value)), 0, 0);
          g.restore();
        }
      } else {
        g.moveTo(at, 22);
        g.lineTo(at, major ? 10 : 17);
        if (major) g.fillText(String(Math.round(value)), at + 3, 9);
      }
      g.stroke();
    }
  }
}
let guideRenderKey = "";
function drawGuides() {
  const key = JSON.stringify([W, H, zoom, guidesVisible, guides, snapTargets]);
  if (key === guideRenderKey) return;
  guideRenderKey = key;
  const root = $("guideLayer");
  root.replaceChildren();
  root.hidden = !guidesVisible;
  if (!guidesVisible) return;
  guides.forEach((guide, index) => {
    if (guide.pos < 0 || guide.pos > (guide.axis === "v" ? W : H)) return;
    const line = document.createElement("div");
    line.className =
      "canvas-guide " +
      (guide.axis === "v" ? "vertical" : "horizontal") +
      (snapTargets.some((t) => t.axis === guide.axis && t.pos === guide.pos)
        ? " snapped"
        : "");
    line.style[guide.axis === "v" ? "left" : "top"] = guide.pos * zoom + "px";
    line.title =
      (guide.axis === "v" ? "Vertical" : "Horizontal") +
      " guide: " +
      Math.round(guide.pos) +
      " px. Drag to move; double-click to remove.";
    line.setAttribute("role", "button");
    line.tabIndex = 0;
    line.setAttribute("aria-label", line.title);
    line.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      checkpoint();
      guideDrag = { index, axis: guide.axis };
    };
    line.ondblclick = (e) => {
      e.stopPropagation();
      checkpoint();
      guides.splice(index, 1);
      render();
    };
    line.onkeydown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        checkpoint();
        guides.splice(index, 1);
        render();
      } else if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        checkpoint();
        guide.pos = Math.max(
          0,
          Math.min(
            guide.axis === "v" ? W : H,
            guide.pos +
              (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1) *
                (e.shiftKey ? 10 : 1),
          ),
        );
        render();
      }
    };
    root.append(line);
  });
}
function toggleRulers() {
  rulersVisible = !rulersVisible;
  drawRulers();
  markSessionState();
}
function toggleGuides() {
  guidesVisible = !guidesVisible;
  drawGuides();
  markSessionState();
}
function clearGuides() {
  if (!guides.length) return;
  checkpoint();
  guides = [];
  render();
}
function addGuide() {
  ask(
    "Add guide",
    [
      ["axis", "Direction: horizontal or vertical", "text", "horizontal"],
      ["pos", "Position in pixels", "number", Math.round(H / 2)],
    ],
    (v) => {
      const axis = v.axis.toLowerCase().trim();
      if (!["horizontal", "vertical", "h", "v"].includes(axis))
        throw new Error("Choose horizontal or vertical.");
      const a = axis[0],
        pos = +v.pos;
      if (!Number.isFinite(pos) || pos < 0 || pos > (a === "v" ? W : H))
        throw new Error("Guide must fall inside the canvas.");
      checkpoint();
      guides.push({ axis: a, pos });
      guidesVisible = true;
      render();
    },
  );
}
for (const [id, axis] of [
  ["rulerHorizontal", "h"],
  ["rulerVertical", "v"],
])
  $(id).onpointerdown = (e) => {
    e.preventDefault();
    checkpoint();
    guidesVisible = true;
    guides.push({ axis, pos: 0 });
    guideDrag = { index: guides.length - 1, axis };
    moveGuide(e);
  };
function moveGuide(e) {
  if (!guideDrag) return;
  const rect = $("paper").getBoundingClientRect(),
    value =
      (guideDrag.axis === "v" ? e.clientX - rect.left : e.clientY - rect.top) /
      zoom;
  guides[guideDrag.index].pos = Math.round(value);
  drawGuides();
}
document.addEventListener("pointermove", moveGuide);
document.addEventListener("pointerup", () => {
  if (!guideDrag) return;
  const g = guides[guideDrag.index];
  if (g.pos < 0 || g.pos > (g.axis === "v" ? W : H))
    guides.splice(guideDrag.index, 1);
  guideDrag = null;
  render();
});
document.addEventListener("pointercancel", () => {
  if (guideDrag) {
    guideDrag = null;
    render();
  }
});
