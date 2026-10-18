### Picturesque

[Open the editor](https://averydimbulb79.github.io/Picturesque/) · [Release history](CHANGELOG.md)

A browser-based image editor for photos, graphics and everyday creative work. Photoshop-inspired workspace, local image processing and editable project files.

Current version: 0.4.7 · Updated 16 October 2026

#### Start here

1. Open an image or create a canvas.
2. Choose a tool and select the layer you want to edit.
3. Use Properties for layer settings and Adjustments for colour.
4. Save a project to keep your work editable; export an image to share it.

New/Open creates a document tab. Add image layer and clipboard paste insert into the current document. The Fullscreen button gives the canvas more room.

#### Available features

| Area | Included |
|---|---|
| Workspace | Up to eight documents, fullscreen, zoom/pan, rulers, guides and guide snapping |
| Layers | Add, duplicate, reorder, rename, hide, opacity and six blend modes |
| Painting | Brush, eraser, paint bucket and linear/radial gradients |
| Selections | Rectangle, ellipse, freehand lasso, Magic Wand, colour/transparent-pixel selection, invert and combination modes |
| Text | Google Fonts, mixed fonts/sizes/colours, bold, italic, underline, letter spacing and leading |
| Vectors | Editable rectangles, ellipses and Bézier paths; fill/stroke; compound subpaths and holes |
| Transforms | Move, resize by percentage, rotate 90° and flip |
| Canvas | Crop, physical units, paper presets such as A4, and DPI |
| Colour | Per-layer brightness, contrast and saturation |
| History | Independent undo/redo per document and named history entries |

For vector editing, select a vector layer → Properties → Edit paths. Use Fill / stroke for its appearance and New path to add a subpath. Rasterise explicitly before painting pixels on a vector.

#### Save and export

| Format | Purpose | What it keeps |
|---|---|---|
| .picturesque | Editable project | Layers, text, vector geometry, paths, guides, selections, name, canvas size, DPI and view settings |
| .picturesque-workspace | Backup of all open documents | Each project's editable state, active tab and document markers |
| PNG | Lossless flattened image | Transparency and optional DPI metadata |
| JPEG | Compressed flattened image | Quality and background colour settings |
| WebP | Compressed flattened image | Quality and optional transparency |
| SVG path | Selected pen subpath | That path only; not the full document |

File → Save project or Ctrl/Cmd+S downloads a fresh project copy. File → Save workspace backup downloads all open documents together. Reopen through the matching File menu action.

Export image offers a format dropdown, format-specific controls, output dimensions, aspect-ratio lock and smooth resizing. Export leaves the editable document unchanged.

Undo history and font files are not embedded in project or workspace files. Google Fonts may need to load again when editing text. Local recovery is browser-specific; keep downloaded backups. Current saves use format v2 and can open older v1 files, but older app releases cannot open v2 files.

#### Latest update

Version 0.4.7 combines the remaining 0.4 work:

| Update | Result |
|---|---|
| Fuller project saves | Retains selections, document names, zoom, pan and ruler/guide visibility |
| Workspace backups | Downloads and restores all open documents |
| Vector layers | Editable geometry, fill/stroke and vector-preserving transforms |
| Compound paths | Multiple subpaths, holes, anchor editing and independent duplication |

Detailed changes and validation notes are in the [changelog](CHANGELOG.md).

#### Roadmap

| Series | Planned focus |
|---|---|
| 0.5.x | Adjustment layers, raster layer masks and clipping masks |
| 0.6.x | Vector masks and combined masks |
| 0.7.x | Smart Objects, editable contents and Smart Filters |
| 0.8.x | Refine Edge, edge detection and hair refinement |
| 0.9.x | Custom brush engine, pressure/dynamics, custom tips and workflow polish |
| Future | Evaluated PSD compatibility and further progress toward Photopea-level workflows |

These are planned capabilities, not delivery dates. New editing features must include native save/reopen support in the same release.

#### Limits and compatibility

| Topic | Current boundary |
|---|---|
| Canvas | Up to 8192 pixels per side and 24 million pixels total |
| Project/workspace file | 150,000,000 bytes each; available browser memory can impose practical limits |
| Undo | Up to 25 entries per stack; shared estimated 64 MiB budget may reduce depth |
| Advanced editing | No adjustment layers, layer masks, Smart Objects or PSD support yet |
| Vectors | Raster-backed display; no destructive Boolean operations or full-document SVG export |
| Browsers | Modern browser required; desktop is the primary workflow |
| Privacy | Image processing stays local; the font picker contacts Google |

Integration checks and selected live Chromium save/reopen checks passed. Large-file performance and broad cross-browser behaviour are not certified.

<details>
<summary>Keyboard shortcuts</summary>

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+S | Download project |
| Ctrl/Cmd+K | Find a command |
| Ctrl/Cmd+Z / Shift+Z | Undo / redo |
| Ctrl/Cmd+V | Paste image |
| Ctrl/Cmd+wheel | Zoom around the pointer |
| Space+drag / middle-button drag | Pan |
| V / B / E / T | Move / brush / eraser / text |
| G / Shift+G / W | Bucket / gradient / Magic Wand |
| M / Shift+M / L | Rectangle / ellipse / lasso selection |
| P / A | Pen / direct path selection |
| C | Crop |
| Alt while moving | Bypass guide snapping |

Tool shortcuts pause while typing or using a dialog.

</details>

<details>
<summary>Run locally or publish</summary>

No installation or build step is required. Open index.html in a modern browser, or serve it from a static host.

For GitHub Pages: Settings → Pages → Deploy from a branch → main → / (root). Allow deployment to finish, then hard-refresh if an older interface appears.

</details>
