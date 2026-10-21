"use strict";
// Rendering boundary shared by the browser and desktop. No DOM or editor globals.
(function (root) {
  function layerFilter(layer) {
    return `brightness(${layer.brightness}%) contrast(${layer.contrast}%) saturate(${layer.saturation}%)`;
  }

  function createCanvasRenderer() {
    return Object.freeze({
      id: "canvas2d",
      render(document, target) {
        const g = target.getContext("2d");
        if (!g) throw new Error("A 2D canvas is required to render this document");
        g.clearRect(0, 0, document.width, document.height);
        for (const layer of document.layers) {
          if (!layer.visible) continue;
          g.save();
          try {
            g.globalAlpha = layer.opacity;
            g.globalCompositeOperation = layer.blend;
            g.filter = layerFilter(layer);
            g.drawImage(layer.c, layer.x, layer.y);
          } finally {
            g.restore();
          }
        }
        return target;
      },
    });
  }

  // No backend auto-detection or silent fallback: adopting another renderer requires
  // explicit integration and parity checks. History and files still belong to the editor.
  const api = Object.freeze({ createCanvasRenderer, layerFilter });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PicturesqueEngine = api;
})(globalThis);
