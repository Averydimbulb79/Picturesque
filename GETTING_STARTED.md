# Picturesque

A dependency-free browser image studio. Open index.html in a modern browser, or publish it using GitHub Pages.

## Publish with GitHub Pages

In repository Settings > Pages, choose Deploy from a branch. Select main and / (root), then Save. GitHub will display the live URL after deployment, normally https://averydimbulb79.github.io/Picturesque/ .

## Features

- New transparent canvas and image opening
- Add images as layers; duplicate, rename, reorder, hide and delete layers
- Layer opacity and blend modes
- Move, brush, eraser, rectangular selection, crop, text, rectangle, ellipse and colour picker
- Per-layer brightness, contrast and saturation
- Layer rotation, flipping and resizing
- Undo and redo, with up to 25 snapshots
- Save and reopen layered .picturesque project files
- PNG, JPEG and WebP export

Image processing happens locally. No external libraries, fonts, analytics or image uploads are used.

## Shortcuts

Ctrl/Cmd+Z: undo. Ctrl/Cmd+Shift+Z: redo. B: brush. V: move. E: eraser. T: text. C: crop. M: selection. Escape: deselect.

## Limits

This is a practical first version, not complete Photopea compatibility. Text and shapes become raster pixels after creation. There is no PSD support, layer masking, vector editing or advanced selection tooling. Maximum canvas size is 8192 pixels per side and 24 million pixels total. Large images and undo snapshots can consume substantial browser memory. Save projects regularly; unsaved work is lost when the page closes. Opening a new image replaces the document; Add image layer preserves the document. GIF import reads a still frame. Adjustments act on an entire layer; rectangular selections constrain brush, eraser and shapes.

## Validation

JavaScript syntax, referenced controls and runtime smoke checks passed for canvas creation, layer management, ordering, crop dimensions, rotation dimensions, project serialization and brush lifecycle. Real browser rendering and pixel accuracy still need visual verification.
