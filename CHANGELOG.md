### Picturesque release history

[Open the editor](https://averydimbulb79.github.io/Picturesque/) · [Current documentation](README.md)

The README describes the current release. Archived notes below describe behaviour at the time they were written; older limits, pending features and roadmap numbering may have been superseded.

| Version | Main change |
|---|---|
| 0.4.9 | Shared feature files and Windows preview: native file access, recovery, installer build and regression tests |
| 0.4.7 | Native project v2, portable workspace backups, editable vector layers and compound paths |
| 0.4.3 | Format dropdown and extended image export settings |
| 0.4.2 | Save validation, aligned file limits and save shortcut |
| 0.4.1 | Document tabs, history, navigation, recovery and rendering foundations |
| 0.4.0 | Pen tool and editable Bézier paths |
| 0.3.10 | Selection shapes and guide snapping |
| 0.3.9 | Gradient fills |
| 0.3.8 | Paint bucket |
| 0.3.6–0.3.7 | Mixed-format text and individual-word formatting fixes |
| 0.3.4–0.3.5 | Clipboard images, Magic Wand and colour selections |
| 0.3.2–0.3.3 | Rulers, guides and selection inversion |
| 0.3.0–0.3.1 | Typography controls, paper sizes, DPI and text dialog layout |
| 0.2.x | Refined workspace, fullscreen and Google Fonts |
| 0.1.0 | Initial editor |

Documentation update, 18 October 2026: condensed the README, reduced heading sizes, consolidated the active roadmap and moved detailed historical material here. Application version remains 0.4.7.

#### 0.4.9 · Shared browser/Windows foundation · 21 October 2026

Includes the previously proposed 0.4.8 refactor and 0.4.9 desktop preview in one release. Existing editor behaviour and project format v2 remain shared.

- Extracted inline CSS and JavaScript into readable feature files with explicit deterministic load order.
- Added an Electron host with a sandboxed renderer, context isolation, restricted file bridge and no renderer Node access.
- Added native Open, Save, Save As, export dialogs and Windows file associations. Cancelled or failed saves retain the dirty marker.
- Added temporary-file writes before replacing a project, desktop app-data recovery and unsaved-close confirmation.
- Added a Windows x64 NSIS installer workflow and pinned dependency lockfile. Preview builds are unsigned; Windows runtime verification and installer completion are reported separately from source checks.
- Added regression tests for source loading, document/workspace roundtrips, vector history, native Save cancellation/overwrite/Save As, authorized file handles, exports, recovery and failed atomic writes.

Boundaries: source files retain shared lexical editor state rather than independent ES modules. No renderer performance improvement is claimed. Native recovery does not retain original file bindings or undo history. No automatic updater, signing certificate or ARM64 installer is included. New Google Fonts need network access. The desktop host permits only local app resources and Google Fonts network requests, while supported font catalogue links open externally.

<details>
<summary>Detailed historical release notes and earlier plans</summary>

#### Picturesque

[Open Picturesque in your browser](https://averydimbulb79.github.io/Picturesque/)

A browser image studio for photo editing, graphics and everyday creative work. Picturesque is evolving through incremental releases toward advanced editing workflows, with an emphasis on approachable controls, reversible edits and local processing.

Current release: 0.4.7, 0.4 Completion, 16 October 2026.

#### v0.4.7: Remaining 0.4 Updates Combined

This release ships the planned 0.4.4–0.4.7 work together. Version numbers 0.4.4–0.4.6 describe the bundled scope, not separate historical deployments.

| Planned increment | Delivered capability | Where to use it |
|---|---|---|
| 0.4.4: Complete native saves | Project format v2 retains selection masks/inversion, document name, zoom, scroll offsets and ruler/guide visibility, alongside existing layer/text/path/DPI data | File → Save project; Ctrl/Cmd+S |
| 0.4.5: Portable workspace | Download and restore up to eight documents in one .picturesque-workspace file, including active tab and individual document state | File → Save/Open workspace backup |
| 0.4.6: Vector layers | Editable rectangle and ellipse layers, saved-path conversion, independent fill/stroke, live geometry and vector-preserving transforms | Shape tools; Pen → Vector layer; Properties → Vector layer |
| 0.4.7: Compound paths | Multiple subpaths per vector layer, path selection/duplication/deletion, editable anchors and handles, even-odd holes and nonzero fill rules | Properties → Edit paths; Pen path source/list; Fill / stroke |

#### Project and workspace preservation

| Information | Native project v2 | Workspace backup v2 |
|---|---|---|
| Layer pixels/order/visibility/positions/blending/adjustments | Yes | Every document |
| Mixed-format editable text and font references | Yes | Every document |
| Editable vector geometry, compound subpaths and styles | Yes | Every document |
| Saved document paths and guides | Yes | Every document |
| Active selection, including bitmap masks and inversion | Yes | Every document |
| Canvas size, DPI and document name | Yes | Every document |
| Zoom, pan, ruler/guide visibility | Yes | Every document |
| Active layer | Yes | Every document |
| Active document tab and document dirty markers | One document only | Yes |
| Undo/redo history | Session only | Session only |
| Font binaries | Not embedded | Not embedded |

Selection masks use packed bits to keep files smaller. Opening legacy format v1 remains supported; fields absent in v1 use defaults, and the next save writes v2. Unknown project/workspace versions are rejected. Old application releases cannot open v2 projects. Save an original v1 copy if you need to use an earlier app version.

Both individual project files and whole workspace backups have a 150,000,000-byte limit. Save separate projects if a combined workspace exceeds that limit. Workspace import decodes every document before replacing the current workspace, and requests confirmation if current documents have unsaved changes. Failed parsing/validation/decoding leaves the current workspace intact. Workspace downloads do not clear individual project dirty markers. Browser recovery uses the same format support and accepts older single-document and workspace recovery records.

Zoom and scroll restoration are bounded by available viewport space, so another screen size can clamp scroll offsets. Undo history, temporary gestures and pen editing focus are intentionally not portable. Font names and mixed formatting remain editable; their raster appearance is cached, and editing text may require downloading Google Fonts again.

#### Vector workflow

1. Draw with Rectangle or Ellipse to create a new vector layer. Shapes remain independent of any pixel selection.
2. For an existing saved pen path, choose Document paths, select the path, then choose Vector layer. The original saved path remains independent.
3. Select the vector layer and choose Properties → Fill / stroke for colours, fill/stroke toggles, stroke width and compound fill rule.
4. Choose Edit paths. The pen source switches to Selected vector layer. Direct selection edits anchors and handles; the path dropdown selects subpaths.
5. New path draws another subpath in the same vector layer. Enclosed overlaps form holes with even-odd fill. Duplicate path adds an offset independent subpath; Delete path removes the selected one.
6. Move, scale, rotate or flip the layer while retaining geometry. Duplicate layer deep-copies its vector data. Rasterise vector explicitly before using brush, eraser, bucket, pixel deletion or pixel gradients on that layer.

Vectors retain geometry plus a document-resolution raster cache for the current canvas renderer. This is not a GPU/vector-only display engine. Compound fill rules are supported; destructive Boolean union/intersection operations, vector masks, gradient vector styles and a full-document SVG export are not part of this release. SVG in the pen toolbar still exports only the selected subpath. Cropping retains vector geometry outside the visible document, while the document boundary clips the composite. Shapes are new layers, unlike the earlier raster shape tools that painted on the active layer.

#### Validation and next releases

Targeted full-application mocked-runtime checks passed for v2 save/reopen of selections/name/view, compound fill rendering calls, vector deep-copy isolation, subpath duplicate/delete, vector transforms with undo/redo, rasterisation with undo, two-document workspace roundtrip, atomic invalid-workspace rejection, legacy compatibility and malformed data rejection. Existing export checks also passed. Live Chromium checks passed for drawing an editable rectangle, duplicating compound subpaths, applying stroke settings, downloading and reopening a v2 project with its editable geometry/name/zoom, and downloading a two-document workspace. Inspection of the actual downloaded files confirmed packed selection data, both compound paths, styles, document name, zoom and both workspace documents. Full workspace restore was covered by the mocked-runtime integration test; large-file performance and broad browser coverage are not certified.

| Next series | Planned work |
|---|---|
| 0.5.x | Adjustment layers, raster masks and clipping masks |
| 0.6.x | Vector masks and combined masks |
| 0.7.x | Smart Objects, editable contents, Smart Filters and filter masks |
| 0.8.x | Refine Edge, edge detection and staged hair refinement |
| 0.9.x | Brush engine, dynamics, custom tips and integration polish |

Every new editing feature must include native save/reopen support in the same release. PSD compatibility remains a future format workstream.

Earlier sections below describe behaviour at the time of each release; this current section supersedes their project-preservation limits and upcoming 0.4 targets.

#### v0.4.3: Export Settings

Export image now opens a wider, two-column dialog with an explicit format dropdown. Format-specific settings appear automatically.

| Setting | PNG | JPEG | WebP |
|---|---|---|---|
| Encoding | Lossless | Lossy | Lossy |
| Quality | Not applicable | 1–100%, default 94% | 1–100%, default 94% |
| Preserve transparency | Optional, on by default | Unsupported | Optional, on by default |
| Background colour | When transparency is off | Always | When transparency is off |
| Embedded resolution | 1–2400 DPI, defaults to document DPI | Not written | Not written |
| Output width/height | Supported | Supported | Supported |
| Aspect-ratio lock | On by default | On by default | On by default |
| Smooth resizing | Optional, on by default | Optional, on by default | Optional, on by default |

Output dimensions use the existing canvas limits: whole pixels, up to 8192 per side and 24 million pixels total. DPI writes PNG physical-resolution metadata; changing it alone does not resample pixels. Resize fields control pixel dimensions. Turn off smoothing for hard pixel-art edges. JPEG and WebP use browser encoders, so quality and file size can differ between browsers. Unsupported encoders are detected by the returned MIME type rather than silently downloading PNG bytes with another extension.

The document remains unchanged. Export does not clear the project dirty marker. The dialog reports download initiation and encoded size, stays open for another export, and shows failures inline. Save a .picturesque project separately to retain editable layers. SVG remains a separate selected-path export, not a whole-document image option.

Validation: JavaScript syntax, existing save-reliability checks and targeted mocked-renderer tests passed for PNG transparency/DPI, JPEG quality/background, opaque WebP, unsupported codec fallback and invalid dimensions/quality/format/background. Live cross-browser encoder and visual-dialog coverage remains to be completed.

#### v0.4.2: Save Reliability

Saving and reopening work takes priority over new editing features.

| Change | Behaviour |
|---|---|
| Save preflight | Validate the native project, serialize it, then parse and decode every embedded layer before initiating the download. Failure leaves the document and its dirty marker intact. |
| Shared file limit | Both saving and opening enforce 150,000,000 bytes. Oversized saves are blocked with an actionable message; no knowingly unopenable file is downloaded. |
| Layer compatibility | Removed the loader-only 50-layer cap. Files remain subject to the byte limit, canvas limits and available browser memory. |
| Save shortcut | Ctrl/Cmd+S downloads a fresh native project copy, including when a normal control has focus. Active dialogs and gestures must be completed first. |
| Visible status | Separate project download/open feedback from browser-local recovery status. Download initiation is explicitly not proof that the user retained the file. |
| Compatibility | Existing version 1 .picturesque and JSON projects continue to open. No format migration is required for this release. |

Validation: JavaScript syntax and targeted mocked-runtime checks passed for a 51-layer save/decode roundtrip, failed embedded-image decoding, file-size rejection, invalid metadata, dialog guards and preservation of the dirty marker on failure. These checks do not certify large-file performance or every browser download flow.

#### What each format keeps

| Format | Retained | Excluded |
|---|---|---|
| .picturesque | Lossless embedded layer pixels, layer metadata and adjustments, editable mixed-format text, pen paths, guides, dimensions and DPI | Undo history, active selections, viewport, document name and embedded font files |
| PNG | Flattened appearance, transparency and DPI metadata | Editable document structure |
| JPEG | Flattened appearance with white transparency background | Editable structure, transparency and written DPI metadata |
| WebP | Flattened appearance and transparency | Editable structure and written DPI metadata |
| SVG path | Selected pen path geometry | Full document composition |

Use File → Save project, check the downloaded file, and reopen it through File → Open project. Save every document separately. Ctrl/Cmd+S downloads another copy; it does not overwrite a previously downloaded file. Local recovery is a convenience, not a portable backup. Font names and formatting are retained with cached raster appearance; editing text may require fetching its Google Fonts again.

#### Revised upcoming roadmap

| Order | Target | Scope |
|---|---|---|
| 1 | 0.4.4 | Complete native projects: selections, document name, viewport and explicit format migrations |
| 2 | 0.4.5 | Portable multi-document workspace backup and restore |
| 3 | 0.4.3 delivered | Export quality, dimensions, background and PNG resolution controls |
| 4 | 0.4.6–0.4.7 | Editable vector layers and compound paths |
| 5 | 0.5.x | Adjustment layers, raster masks and clipping masks |
| 6 | 0.6.x | Vector masks and combined mask controls |
| 7 | 0.7.x | Smart Objects, editable contents, Smart Filters and filter masks |
| 8 | 0.8.x | Refine Edge, edge detection and staged hair refinement |
| 9 | 0.9.x | Custom brush engine, dynamics, custom tips and integration polish |

New editing features must include native save/reopen support in their release. Undo history remains session-only unless a later release explicitly adds portable history. PSD compatibility remains a separate future workstream.


The launch link requires GitHub Pages to be enabled. Source updates on the configured publishing branch will be deployed by GitHub Pages.

#### Release status

| Version | Name | Status | Purpose |
|---|---|---|---|
| 0.1.0 | Working Foundation | Shipped | Establish basic raster editing and layered project files |
| 0.2.2 | Google Fonts | Shipped; live browser QA pending | Searchable font families, preview and font-aware raster text |
| 0.2.1 | Professional Workspace | Shipped; visual browser QA pending | Compact editing layout, working application menus and fullscreen |
| 0.2.0 | Studio Interface | Shipped; visual browser QA pending | Replace the initial utility-style interface with a cohesive workspace |
| 0.4.7 | 0.4 Completion | Shipped; live smoke checks passed | Native v2, portable workspace, vector layers and compound subpaths |
| 0.4.3 | Export Settings | Shipped | Format dropdown, conditional settings, export dimensions and encoder checks |
| 0.4.2 | Save Reliability | Shipped | Save preflight, consistent save/open limits, Ctrl/Cmd+S and explicit download feedback |
| 0.4.1 | Foundation Completion | Shipped; live-browser smoke checks passed | Multi-document state/recovery, transactional history and invalidation-based rendering |
| 0.4.0 | Pen and Editable Paths | Shipped; real-browser QA pending | Editable cubic Bézier paths, anchor/handle tools and vector path export |
| 0.3.10 | Selection Shapes and Guide Snapping | Shipped; real-browser QA pending | Elliptical/freehand selections and layer alignment to guides |
| 0.3.9 | Gradient Fills | Shipped; real-browser QA pending | Linear/radial gradients, editable colour stops and selection clipping |
| 0.3.8 | Paint Bucket | Shipped; real-browser QA pending | Selection-aware colour fill with tolerance and opacity |
| 0.3.7 | Text Range Targeting Fix | Shipped; real-browser QA pending | Retained word selection and explicit whole-layer formatting |
| 0.3.6 | Editable Mixed-format Text | Shipped; real-browser QA pending | Different fonts/sizes within a text layer, with re-editable formatting |
| 0.3.5 | Colour Selections and Leaner History | Shipped; real-browser QA pending | Colour/alpha selection presets, combination modes, previews and bounded history |
| 0.3.4 | Clipboard, Magic Wand and Navigation | Shipped; real-browser QA pending | Clipboard images, colour selections, anchored zoom and panning |
| 0.3.3 | Workspace-edge Rulers | Shipped; visual browser QA pending | Fixed rulers around the working area with scroll-aware canvas coordinates |
| 0.3.2 | Rulers, Guides and Selection Inversion | Shipped; visual browser QA pending | Pixel rulers, editable guides and invert selection |
| 0.3.1 | Text Dialog Layout | Shipped; visual browser QA pending | Wide, two-column typography dialog with persistent action buttons |
| 0.3.0 | Type, Print and Recovery | Shipped; visual browser QA pending | Text spacing, paper presets, DPI and local session recovery |
| 0.3.x foundation | Navigation, history, state and rendering | Baseline delivered through 0.4.1 | See completion checklist below |
| 0.4.x | Remaining Editable Objects | Partially delivered | Mixed text and Bézier paths available; vector layers and direct transforms pending |
| 0.5.0 | Layer Power | Planned | Add groups, masks, clipping and adjustment layers |
| 0.6.0 | Selection and Retouching | Planned | Add flexible selections and repair tools |
| 0.7.0 | Photo Editing | Planned | Add tonal and colour tools for serious photo work |
| 0.8.0 | File Compatibility | Planned | Introduce measured PSD interoperability |
| 0.9.0 | Production Workflows | Planned | Support artboards, presets, batches and reusable actions |
| 1.0+ | Assisted Creative Workflows | Exploratory | Simplify repetitive work and introduce optional assistance |

Planned versions are direction and scope, not delivery dates or claims of implemented capability. Large releases may be split into smaller updates. Photopea-level compatibility is a long-term goal; this application currently covers a much smaller feature set.

#### Update history

#### 0.4.1: Foundation Completion, 16 October 2026

This completes the remaining 0.3.x foundation baseline without removing the 0.4.0 pen tools. The release number remains in the current 0.4 series.

| Area | Delivered | Behaviour |
|---|---|---|
| Documents | Up to eight open document tabs | New canvas, Open image and Open project create tabs instead of replacing another document |
| Independent state | Each tab owns its layers, guides, paths, selections, history and view | Switching documents restores the active layer, tool, zoom and scroll position |
| Document controls | New, rename and close | File menu supports rename/close; tab close checks documents not downloaded as projects |
| Saved-state marker | Dot on documents awaiting a project download | Save project starts a download and clears that document's marker |
| Close/reload guard | Browser leave warning and per-document close confirmation | Local recovery is separate from portable project backups |
| Atomic loading | Validate and decode before changing document state | Invalid or undecodable project data leaves existing documents intact |
| History commands | Reversible before/after document-state commands | Undo/redo moves a command between its document's stacks only after successful decoding |
| History isolation | Independent undo/redo per tab | Starting an edit clears redo in that document only |
| History budget | Shared estimated 64 MiB across all document histories | Each stack retains up to 25 entries; oldest commands are pruned globally as needed |
| History inspector | Named edit list and undo/redo counts | Brush, move, shape, import and other main operations carry readable labels |
| Slider grouping | One pointer gesture or short keyboard sequence per edit | Accessibility-driven slider input also creates history checkpoints |
| Rendering | Separate layout/UI refresh, render invalidation and pixel compositing | Compositing is scheduled with requestAnimationFrame and skipped when raster state is unchanged |
| Canvas allocation | Resize canvas backing stores only when dimensions change | Zoom and routine UI updates do not reset the full canvas |
| Layer panel | Small cached thumbnails and conditional list rebuilding | Unchanged layers no longer regenerate full-resolution PNG thumbnails |
| Rulers/guides | Cached overlay updates | Unchanged ruler coordinates and guide geometry avoid redundant rebuilding |
| Navigation | Existing anchored zoom and Space/middle-button pan completed with guards | Pixel/line/page wheel deltas are normalised; zoom ignores invalid values and active edit gestures |
| Workspace recovery | All open documents and their views | Startup can restore the workspace; old single-document recovery data is accepted |
| Export safety | Version 1 project downloads remain individual documents | A multi-tab workspace is not silently substituted for a project file |

#### Foundation completion checklist

| Planned foundation capability | Status | Practical boundary |
|---|---|---|
| Document model and state isolation | Delivered | Active-document bindings remain in one buildless application file |
| Independent document tabs | Delivered | Maximum eight documents; desktop remains the primary workflow |
| Autosave and recovery | Delivered | Browser/site-local, latest workspace only; no cloud sync or portable auto-backup |
| Efficient grouped history | Delivered baseline | Commands retain shared encoded raster state; no per-tile delta compression or disk-backed unlimited history |
| Predictable history limits | Delivered | Estimated history budget excludes live canvases, selections and other browser memory |
| Reliable asynchronous undo/redo | Delivered | Failed decoding leaves state and history stack positions unchanged |
| Zoom and pan | Delivered | Finite scrollable workspace; viewport boundaries can limit exact zoom anchoring |
| Renderer separation and invalidation | Delivered baseline | UI, layout, raster composite and overlay functions are separate; no WebGL/worker/tiled engine |
| Project validation | Delivered | Dimensions, layer settings, text and paths are checked before state replacement |
| Browser verification | Passed live smoke checks | Chromium: tabs, undo/redo, history panel, retained view and workspace recovery |

History is command-shaped but intentionally retains shared before/after snapshots rather than operation-specific pixel patches. This provides transactional reversal and consistent support for every existing tool while keeping unchanged image strings shared. Large edited rasters can still reduce undo depth. Undo history and active selections are session-only and are not part of recovery/project files. Live tab switching preserves them.

New/Open changes: image opening creates a new tab; Add image layer and clipboard paste continue to target the current document. Each project download contains only its current document. Exporting a flattened image does not clear the project-download marker. Undo after saving conservatively marks the document changed, even if its pixels happen to match a prior download. Starting a project download cannot verify that a user ultimately retained the downloaded file.

Workspace recovery stores names, dirty markers, layers, editable text, paths, guides, active document and view settings. It does not preserve undo stacks or selection masks. Browser storage failures remain visible; private browsing, quota limits and another browser tab writing the same recovery key can affect availability. Closing a document removes it from subsequent workspace recovery. Save projects before closing anything that needs a durable portable copy.

Validation before publication: mocked application integration checks for two-document state isolation, per-document undo/redo, failed-history atomicity, multi-document recovery, dirty close guards, cached raster invalidation, existing pen workflows and syntax. Live Chromium smoke checks on the deployed v0.4.1 passed: layer creation with undo/redo, named history entries, two documents with independent layer/history state, per-document zoom, and restoration of both tabs with dimensions, DPI and zoom after reload. Performance on very large files and broad cross-browser coverage are not yet certified.

#### Next planned increments

| Order | Scope |
|---|---|
| 1 | Live vector shape layers and on-canvas transforms |
| 2 | Compound paths and vector masks |
| 3 | Further large-document optimisation driven by measured bottlenecks |


#### 0.4.0: Pen and Editable Paths, 16 October 2026

| Function | Controls | Current behaviour |
|---|---|---|
| Pen | P, then Pen: draw | Click for corner anchors; drag for a curved anchor with symmetric handles |
| Close path | Click the first anchor or Close path | Connects the final anchor back to the first |
| Finish open path | Finish, Enter or Escape | Keeps the path open; click its final endpoint to resume |
| New path | New path | Starts a separately named editable path |
| Direct selection | A, Direct selection menu, or hold Ctrl/Cmd with Pen | Drag anchors or the selected anchor's direction handles |
| Anchor movement | Drag an anchor | Its existing handles move with it |
| Smooth handles | Drag a handle | The opposite handle stays collinear while retaining its length |
| Independent handles | Alt-drag a handle | Breaks the smooth constraint |
| Constrained direction | Shift-drag a curve/handle | Snaps handle direction to 45-degree increments |
| Convert point | Corner / smooth or Convert point mode | Converts between a corner with no handles and a smooth point |
| Add anchor | Add anchor mode; click near a segment | Uses cubic subdivision to preserve the original curve |
| Delete anchor | Delete anchor mode, button or Delete/Backspace | Removes the chosen anchor and reconnects remaining neighbours |
| Fill path | Fill plus toolbar colour | Creates a new raster layer; open paths are implicitly closed for filling |
| Stroke path | Stroke plus colour and numeric width | Creates a new raster layer with a solid round-cap/round-join stroke |
| Make selection | Make selection plus selection mode | Converts the filled path area to a hard pixel selection |
| Path management | Saved-path chooser, Rename, Delete path | Paths are document-level objects independent of layers |
| SVG | SVG button | Exports the selected path as an unfilled, coloured vector stroke at the document size |
| Persistence | Project save, recovery and undo/redo | Anchor/handle coordinates, closure and names are retained |

Suggested workflow:

1. Press P, then click corners or click-drag to create curves.
2. Click the first anchor to close the path, or press Enter to finish an open one.
3. Press A to edit. Click an anchor to expose its handles, then drag the anchor or handles. Hold Alt to move a handle independently.
4. Use Add anchor, Delete anchor and Corner / smooth to refine the path.
5. Fill, Stroke, Make selection or export SVG. The original path remains available for further editing.

The path itself remains vector-editable. Fill and Stroke create raster output layers; later path edits do not automatically update those layers. Generate a new fill/stroke after editing or undo/remove the previous output. Path overlays and handles do not appear in normal image exports. Paths are shown when the Pen tool is active. Layer movement does not move document paths; crop shifts their coordinates to the new canvas origin.

This release covers the core Bézier pen workflow, not Photoshop's complete pen/vector feature set. Still pending: compound-path boolean operations, vector shape layers, vector masks, whole-path transforms/multi-anchor selection, freeform/curvature/magnetic pen variants, pressure-sensitive brush strokes on paths, text on paths and SVG import. There is no automatic tracing of an existing pixel selection into a vector path. A document supports up to 100 paths and 10,000 anchors per path. Deleting an anchor can change neighbouring curve geometry; adding one preserves the curve. Selection conversion thresholds antialiased fill alpha at 50% and does not feather edges. Closing a two-anchor path can form a curved lens; it is not restricted to polygons.

Validation: exact cubic subdivision fixtures; nearest-segment insertion; anchor/handle translation; SVG data; saved-path validation; application-initialisation and mocked pointer workflows for creation, closure, editing, conversion, deletion, snapshot isolation and stroke output. Live browser pointer/visual and exported-pixel QA remain pending.

Rollback point: [backup/v0.3.10-before-v0.4-pen-tool](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.10-before-v0.4-pen-tool).

#### Next planned increments

| Order | Planned work | Status |
|---|---|---|
| Completed | Document tabs with independent state and history | Delivered in 0.4.1 |
| 2 | Live vector shape layers and direct transforms | Pending |
| 3 | Compound-path operations and vector masks | Pending |


#### 0.3.10: Selection Shapes and Guide Snapping, 16 October 2026

Rollback point: [backup/v0.3.9-before-lasso-guide-snapping](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.9-before-lasso-guide-snapping).

| Feature | Controls and behaviour |
|---|---|
| Elliptical selection | Choose Ellipse in the selection toolbar or Select menu; Shift+M shortcut |
| Freehand selection | Choose Freehand lasso or press L; drag a path and release to close it |
| Selection modes | Replace, Add, Subtract and Intersect apply to the new shapes |
| Pixel operations | Brush, eraser, bucket, gradients and selected-pixel deletion respect the shape mask |
| Inversion | Invert selection selects the complement of the new shape |
| Shape preview | Dashed outline during the drag; cyan pixel boundary after completion |
| Guide snapping | Enabled by default in the Move toolbar; also toggle through View > Snap to guides |
| Snap anchors | Left/right/top/bottom and centre of visible raster content, including rendered text |
| Snap distance | Six screen pixels, converted to document coordinates at the current zoom |
| Bypass | Hold Alt while moving, or switch off Snap to guides |
| Feedback | A guide turns gold when it is the active snap target |
| History | Layer movement remains one undoable drag; text metadata is preserved |

Guides must be visible for snapping; rulers may be hidden. Guides outside the current canvas are ignored. Transparent layers use their full raster bounds as the fallback; other layers use the nontransparent pixel bounds. The first move of a large layer can pause while those bounds are scanned; bounds are cached until its pixels change. Snapping currently applies to layer movement only, not resizing, rotation, brush strokes or guide creation.

Ellipse and lasso masks use hard pixel boundaries without feathering or antialiasing. Lasso uses an even-odd polygon fill and closes the final point to the first. Up to 4096 sampled points are retained per gesture. There is no magnetic/polygonal lasso or edge refinement yet. Selections remain temporary state; layer positions and guides continue to persist normally. Cancelling a selection gesture leaves the previous selection intact.

Validation: ellipse/polygon mask fixtures and clipping; snapping near edges/centres; threshold, zoom and Alt bypass; syntax/control references. Real-browser pointer and visual QA remain pending.


#### 0.3.9: Gradient Fills, 16 October 2026

Rollback point: [backup/v0.3.8-before-gradient-fill](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.8-before-gradient-fill).

| Control | Behaviour |
|---|---|
| Gradient / Shift+G | Drag to fill the active raster layer |
| Linear | Drag sets start/end and direction; colours extend beyond the endpoints |
| Radial | Drag begins at the centre and sets the outer radius |
| Edit gradient | Two to eight colour stops, each with position, colour and opacity |
| Colour-to-transparent | Set a stop's opacity to zero |
| Overall opacity | 1–100%, combined with per-stop opacity |
| Reverse | Reverses stop positions |
| Drag preview | Temporary gradient and direction line while dragging |
| Selection | Respects normal/inverted rectangle and colour-mask selections |
| Layer bounds | Expands the layer to the document while retaining off-canvas pixels, within size limits |
| Undo/recovery | A completed gradient is one edit; cancelled pointer gestures do not commit |

Choose Gradient, select Linear or Radial, edit the colour stops, then drag on the canvas. Fills use source-over compositing: transparent portions reveal existing pixels rather than erasing them. Add a blank layer first for a separately adjustable gradient layer. Editable text must be rasterised before pixel fills. Gradient geometry and stop settings are session controls, not an editable vector/gradient layer; project files retain the rendered pixels. Angle/radius numeric controls, gradient presets, dithering and other gradient types remain future work. Full-resolution preview can slow large canvases.

Validation: linear/radial geometry, stop sorting and reversal, alpha values, invalid stop rejection, tool wiring and syntax. Real-browser preview, raster output and pointer QA remain pending.


#### 0.3.8: Paint Bucket, 16 October 2026

Rollback point: [backup/v0.3.7-before-paint-bucket](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.7-before-paint-bucket).

| Control | Behaviour |
|---|---|
| Paint bucket / G | Click to fill matching pixels on the active raster layer |
| Colour | Uses the toolbar colour picker |
| Opacity | 1–100%, composited over existing pixels |
| Tolerance | 0–255, compared with the clicked source colour/alpha |
| Contiguous | On: fills a four-connected region; off: fills matching pixels throughout the document |
| Sample merged | Uses visible composite colours to determine the area; fill is still applied only to the active layer |
| Active-layer sampling | Switch off Sample merged to use the original active-layer raster colours |
| Selection | Rectangle, colour-mask and inverted selections constrain the fill; contiguous traversal stops at selection boundaries |
| Editable text | Rasterisation is required before pixel filling |
| Layer bounds | Expand to include the document while retaining existing off-canvas layer pixels, within size limits |
| History/recovery | Fill is one undoable edit and participates in local autosave |

Tolerance/Contiguous/Sample merged controls are shared with the magic wand. Changing those controls affects subsequent clicks. Fully transparent source pixels match by alpha regardless of hidden RGB. The fill operation uses hard selection boundaries; anti-aliasing, gradients, pattern fills and worker-based large-image processing are not included. A fill may pause on very large images. If expanded layer bounds exceed current size limits, the operation is rejected before changing the document.

Validation: contiguous/global matching; selection-boundary barriers; inverted-mask constraints; RGB/opacity fill generation; syntax and tool/control linkage. Real-browser pixel output and interaction QA remain pending.


#### 0.3.7: Text Range Targeting Fix, 16 October 2026

Rollback point: [backup/v0.3.6-before-text-range-fix](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.6-before-text-range-fix).

| Fix | Behaviour |
|---|---|
| Remember selected words | The formatting range is stored before focus moves to font/size/style controls |
| Preview selection | Words may be highlighted in either the text box or the mixed-font preview |
| Explicit target | Selected words is the default; Entire layer must be chosen deliberately |
| No accidental fallback | A missing/collapsed selection never silently formats the whole layer |
| Target feedback | Shows the selected snippet and character count |
| Text edits | Typing invalidates the old range; highlight the intended words again |

Highlight words, change the controls, then Apply to selected words. The range remains available when the preview redraws. Choose Entire layer when an all-text change is intended. Saving with pending formatting uses the same explicit target. This supersedes the no-selection-means-all behaviour in 0.3.6.

Validation: lost-focus/collapsed native-range regression tests, explicit whole-layer targeting, preview offset calculation path and mixed-run formatting preservation. Real-browser text interaction remains pending.


#### 0.3.6: Editable Mixed-format Text, 16 October 2026

Rollback point: [backup/v0.3.5-before-rich-text](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.5-before-rich-text).

| Area | Delivered | Behaviour |
|---|---|---|
| Word formatting | Multiple fonts and sizes in one text layer | Highlight words in the text box, change controls and choose Apply to selected words |
| Text styles | Bold, italic and underline per range | Bold/italic request the selected Google Fonts variant; underline is drawn with the text |
| Colour and spacing | Per-range colour and letter spacing | Can vary independently between words/ranges |
| Whole-layer formatting | Apply to all text when no range is selected | Selection status identifies the target range before applying |
| Leading | One baseline spacing for the layer | Mixed-size runs share baselines; manual line breaks are supported |
| Preview | Mixed formatting displayed together | Large fonts are proportionally scaled for the preview |
| Editability | Text content and formatting stored with the layer | Reopen through Properties > Edit text, Layer > Edit text or double-clicking the layer row |
| Persistence | Structured text metadata plus a rendered pixel fallback | Projects, recovery and undo retain mixed formatting; exports remain flattened |
| Text changes | Existing formatting retained through insertions and deletions | Inserted text inherits the neighbouring run style |
| Pixel operations | Editable text protected from brush/eraser/shapes/selection deletion | Rasterise text first when pixel-level editing is required |
| Transforms | Rotation/flip/resize require confirmation to rasterise | Move and canvas resizing preserve text editability |
| Crop | Text origin adjusts to the cropped canvas | Structured text remains available for later editing |

Workflow:

1. Choose Text and click the canvas to create a text layer.
2. Type the complete text in the left text box.
3. Highlight the words to style, choose a Google font, size, bold/italic/underline, colour and spacing, then click Apply to selected words.
4. Repeat for other words. Choose Entire layer explicitly to format all text.
5. Choose Add text layer or Save text layer. Formatting changes not yet applied are applied to the current range when saving.
6. Reopen the layer to revise its words or styles. Save a project to retain editing data.

The text-entry box is plain text with range selection; the adjacent preview displays the mixed typography. This increment does not add on-canvas text editing, auto-wrapping, alignment, per-line leading, text-on-path or arbitrary text transforms. Bold requests weight 700 and italic requests the italic variant. Some Google Fonts do not provide those styles; the dialog reports unavailable variants rather than silently substituting. Underline is a visual text decoration. Adjacent runs with identical formatting are merged. Text layers are limited to 100,000 UTF-16 characters and 10,000 runs. Very large fonts or long lines can extend beyond the canvas. Editing requires the relevant Google Fonts to be available; opening a saved document can still display its stored raster fallback offline. Text created before this release remains raster-only and cannot be reconstructed as editable text.

Validation: mixed-style range splitting/merging; insertion/deletion formatting retention; font/size/style and multiline-baseline/underline rendering calls; invalid metadata rejection; syntax and control references. Real-browser font rendering, text-range interaction and visual QA remain pending.

Next planned foundation increment remains document tabs with independent state/history. The full editable-object and direct-transform roadmap remains partially outstanding.


#### 0.3.5: Colour Selections and Leaner History, 16 October 2026

Rollback point: [backup/v0.3.4-before-colour-selection-history](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.4-before-colour-selection-history).

| Area | Delivered | Behaviour |
|---|---|---|
| Select menu | Dedicated top-level menu | Select all, deselect, invert, white, black, custom colour/range and transparency |
| Selection toolbar | Preset chooser and mode chooser | Available for rectangular selection and magic wand |
| White/black | Image-wide colour matching | Adjustable tolerance includes near-white/near-black; fully transparent pixels are excluded |
| Custom colour | Colour picker, six-digit HEX field and preview eyedropper | Clicking the preview samples the original image pixels |
| Colour range | Tolerance from 0 to 255 | Maximum RGB channel difference from the selected colour, not a perceptual colour-distance model |
| Transparency | Maximum alpha threshold from 0 to 254 | Zero selects fully transparent pixels; higher values include partly transparent pixels |
| Source | Active layer or merged image | Active layer is sampled before its opacity/effects; matches existing wand sampling |
| Preview | Cyan overlay and selected-pixel count | Shows the resulting combined selection before Apply; Cancel leaves the selection unchanged |
| Combination | Replace, Add, Subtract and Intersect | Shared by presets, wand clicks and completed rectangular selections |
| History storage | Cached raster encodings reused across unchanged states | Layer thumbnails, saved projects and recovery also reuse unchanged encoded pixels |
| History limits | 25 entries per stack plus 64 MiB estimated combined history data | Old undo states are removed first; a state larger than the budget can leave no undo step |
| Keyboard sliders | Repeated adjustments grouped within 450 ms | New pointer gestures create separate checkpoints |

Selection modes combine the effective current area, including inverted selections. With no existing selection, Add behaves like Replace, while Subtract/Intersect produce an empty selection. Select all explicitly replaces the selection with the whole document. Selection changes remain temporary editor state rather than project content or history entries. Selection previews sample at document resolution, so very large images can pause while matching.

History remains snapshot-based; this is not the full command-based history rewrite. Encoded raster strings are cached until the layer's pixels change, so structural edits no longer re-encode every unchanged layer. The 64 MiB budget estimates retained history strings/metadata, not total browser RAM, decoded canvases or temporary selection buffers. Undo depth can be lower for large documents. Saved project format remains version 1.

Validation: colour/near-colour and alpha fixtures; Replace/Add/Subtract/Intersect; inverted rectangle conversion; bounds and HEX validation; encoded-image cache reuse/invalidation; history count and estimated memory pruning. Real-browser visual, pointer and performance QA remains pending.

#### Next planned increment

| Priority | Planned work | Status |
|---|---|---|
| Completed | Document tabs with independent document state and history | Delivered in 0.4.1 |
| Completed baseline | Renderer/state separation and cached rendering | Delivered in 0.4.1; advanced large-document work remains |
| Later | Vector objects and direct transform handles | Not implemented; editable mixed text delivered in 0.3.6 |


#### 0.3.4: Clipboard, Magic Wand and Navigation, 15 October 2026

Rollback point: branch [backup/v0.3.3-before-paste-wand](https://github.com/Averydimbulb79/Picturesque/tree/backup/v0.3.3-before-paste-wand), created before this update.

| Area | Delivered | Behaviour |
|---|---|---|
| Clipboard | Ctrl/Cmd+V image paste | Clipboard image pixels become a centred new layer; existing document dimensions remain fixed |
| Paste action | Toolbar and Edit menu | Uses browser clipboard-read when available; otherwise suggests keyboard paste |
| Editing safety | Normal text-field paste retained | Editor image paste does not intercept typing fields or modal dialogs |
| Magic wand | W shortcut and tool rail button | Click a pixel to select colours within the chosen tolerance |
| Tolerance | Whole values from 0 to 255 | Maximum per-channel RGB and alpha difference relative to the clicked seed pixel |
| Contiguous | On by default | Four-connected flood selection; switch off to match colours across the whole canvas |
| Sample source | Sample merged or active layer | Active-layer sampling uses original raster pixels at their document offset, before effects and opacity |
| Selection feedback | Cyan pixel boundary | Selected areas constrain brush, eraser and filled shapes |
| Inversion | Invert colour or rectangular selection | Selects the complement inside the canvas |
| Delete background | Clear selected pixels and Delete/Backspace | Clears only the selected pixels on the active layer; undo supported |
| Zoom | Ctrl/Cmd+wheel | Zooms around the pointer, with scroll adjustment subject to viewport scroll bounds |
| Zoom readout | Fit/custom percentage synchronisation | Displays the actual scale, including fitted values |
| Pan | Hold Space and drag, or middle-button drag | Moves the scrollable workspace without painting |

Website workflow: use the browser's Copy image command, switch to Picturesque, then press Ctrl/Cmd+V. Copy image address only copies a URL and is not treated as image pixels. Websites and browsers differ in which clipboard formats they provide. The Paste image button may require clipboard permission and HTTPS; keyboard paste is the fallback. No remote image URLs are fetched by the paste handler. Pasted images larger than the document extend outside the current canvas; use Canvas size if a larger document is needed.

Magic-wand workflow: select W, set tolerance and source, then click the colour to select. Adjusting tolerance requires clicking again. For background removal, select the background, choose the intended layer and use Clear selected pixels. Invert selection protects the clicked colour and edits the remainder. Each click replaces the previous selection. Add/subtract selection modes, feathering, edge refinement and anti-aliased selection masks are not yet implemented. Transparent pixels are matched by alpha regardless of hidden RGB data. Colour selections are temporary editor state and are not stored in project files. Crop clears a wand selection and requires a rectangular crop area.

Pixel masks and flood-fill buffers use memory proportional to canvas area. Large images can pause during selection computation; there is no worker-based selection processing in this increment. Anchored zoom is limited to 5–400%; a small centred canvas and scroll bounds can limit exact pointer anchoring. Panning moves scrollable content; it does not introduce an infinite workspace.

Validation: synthetic pixel fixtures for tolerance, connectivity, alpha and global matching; selection-mask composition paths; clipboard image filtering and error paths; navigation coordinate calculations; JavaScript syntax. Real browser clipboard permissions, raster output and pointer/visual QA remain pending. Efficient history and document tabs remain future 0.3.x work.


#### 0.3.3: Workspace-edge Rulers, 15 October 2026

| Area | Change | Behaviour |
|---|---|---|
| Position | Rulers moved outside the scrolling canvas container | Top and left rulers stay at the working area's edges |
| Origin | Markings follow the canvas position | Zero aligns with the canvas origin; surrounding workspace can show negative coordinates |
| Navigation | Scroll, zoom and resize update ruler markings | Includes inspector layout changes and fullscreen resizing |
| Guide creation | Existing ruler-drag controls retained | Guides are positioned in canvas coordinates regardless of scrolling |
| Visibility | View > Rulers | Hiding rulers returns the reserved 22-pixel strips to the working area |

Ruler rendering is limited to the visible workspace dimensions. The paper canvas and guide lines continue to scroll inside that area. This supersedes the canvas-attached ruler placement introduced in 0.3.2. Validation covers coordinate/tick calculations and DOM structure; real-browser visual and pointer interaction QA remains pending.


#### 0.3.2: Rulers, Guides and Selection Inversion, 15 October 2026

| Area | Update | Behaviour |
|---|---|---|
| Rulers | Horizontal and vertical pixel rulers | Tick spacing adjusts to zoom; rulers scroll with the canvas |
| Guide creation | Drag from a ruler, or View > Add guide | Drag down from the top ruler for horizontal guides; right from the left ruler for vertical guides |
| Guide positioning | Drag or keyboard arrows | Shift+arrow moves ten pixels; numeric insertion accepts an exact position |
| Guide removal | Double-click, Delete/Backspace when focused, or drag outside the canvas | View > Clear guides removes all guides |
| Visibility | View > Rulers and Show/hide guides | Display controls do not change exported pixels |
| Persistence | Guide coordinates stored in projects and local recovery | Guide edits are included in undo/redo; older projects default to no guides |
| Crop | Reposition and prune guides | Guides shift to the new origin and those outside the cropped canvas are removed |
| Selection | Invert selection in the selection toolbar and Edit menu | Changes the editable area from inside the rectangle to outside it, within the canvas |
| Mask behaviour | Painting, erasing and filled shapes respect inversion | Even-odd clipping retains whole-line rendering; crop switches back to a normal rectangular area |

Guides are alignment references only; snapping is not implemented yet. They never appear in PNG/JPEG/WebP exports. Switching to the crop tool resets selection inversion so the rectangular crop is unambiguous. Selection inversion is temporary editor state and is not saved in project files, matching the existing selection behaviour. Ruler units are pixels in this increment, even when a canvas was created using physical units. The toolbar can scroll horizontally on smaller screens.

Validation: JavaScript syntax, ruler scale calculations, guide coordinate handling and normal/inverted clipping paths checked. Real-browser visual and pointer interaction QA remains pending.


#### 0.3.1: Text Dialog Layout, 15 October 2026

| Area | Update | Behaviour |
|---|---|---|
| Desktop layout | Wider dialog, up to 960 px | Typography controls on the left, live preview and loading status on the right |
| Typography controls | Grouped text, font, size, spacing and leading | Existing inputs and rendering behaviour are preserved |
| Preview | Dedicated panel | Longer preview text scrolls inside its panel |
| Actions | Footer outside the scrolling content | Cancel and Add text remain accessible |
| Small screens | Single-column layout at 760 px and below | Content scrolls within viewport bounds |
| Short screens | Tighter spacing and viewport-height limits | Dialog remains bounded instead of extending off screen |

Validation: JavaScript syntax, parsed dialog structure and existing control IDs checked. Live browser visual inspection remains pending. This update changes layout only; raster text and font-loading limits are unchanged.


#### 0.3.0: Type, Print and Recovery, 15 October 2026

| Area | Delivered | Details |
|---|---|---|
| Letter spacing | Positive or negative spacing in pixels | Applied uniformly across each text line, with normal font kerning enabled |
| Leading | Explicit line-to-line baseline distance in pixels | Used for multiline text; independent of font size |
| Preview | Spacing and leading preview | Large text previews scale proportionally to a maximum displayed font size of 64 px |
| Paper presets | A0–A6, B4, B5, US Letter, Legal and Tabloid | Portrait/landscape and custom dimensions |
| Units | Pixels, millimetres, centimetres and inches | Physical dimensions are converted to pixel dimensions using the selected DPI |
| Canvas size | Image > Canvas size or context bar button | Changes canvas bounds and DPI without resampling layers; top-left anchoring |
| Resolution | DPI from 1 to 2400 | Stored in project files; older projects default to 96 DPI |
| PNG export | Physical resolution metadata | Writes/replaces the PNG pHYs chunk; JPEG/WebP DPI metadata is not implemented |
| Autosave | Latest session stored locally using IndexedDB | Debounced after edits; drawing and busy operations defer writing |
| Recovery | Startup restore/discard prompt | Recovers layers and DPI; no automatic overwrite before the choice |
| Storage errors | Visible recovery status | If local storage fails, the editor asks users to save a project manually |

Letter spacing is sometimes called tracking. This release does not offer adjustment of individual character pairs, optical kerning controls or editable text objects. The browser must support Canvas 2D letterSpacing for nonzero spacing; unsupported browsers show an error rather than silently ignoring it. Text is still rasterised after insertion.

Example: A4 portrait at 300 DPI produces 2480 × 3508 pixels. Changing DPI with physical units selected changes the pixel dimensions. With pixel units selected, the pixel dimensions stay fixed and the interpreted print size changes. Large presets at high DPI may exceed the existing 8192-per-side/24-million-total-pixel limits; reduce DPI to use them. DPI does not create additional detail in an existing image. Imported images currently default to 96 DPI rather than reading embedded resolution metadata.

Autosave is a single latest-session recovery copy for this browser and site origin. It is not a downloaded backup, multi-document archive or cross-device sync. Undo history is not restored. Browser storage clearing, private browsing restrictions, quota limits and simultaneous tabs can affect recovery. Save project remains the way to keep a portable copy. Closing immediately after an edit can precede the debounce; wait for Recovery saved locally. Choosing Cancel in the startup recovery prompt discards that recovery copy. Moving layers outside a resized canvas preserves their layer pixels, while crop remains destructive in the current state.

The remaining foundation work (efficient history, document tabs, cursor-anchored zoom, pan and renderer separation) is deferred to smaller 0.3.x increments, not claimed as delivered here.

Validation: syntax checks; A4/physical-unit conversions; PNG resolution insertion, replacement and CRC checks; mocked autosave write, recovery, discard and storage-error paths. Live browser rendering and pixel output still need visual QA.


#### 0.2.2: Google Fonts

| Area | Update | Behaviour |
|---|---|---|
| Text dialog | Google Fonts family chooser | Search suggested families or type an exact Google Fonts family name |
| Catalogue | Attempt to load the current Google Fonts catalogue | If browser/network restrictions block it, a bundled popular list remains available |
| Scripts | Popular Latin and CJK families included in suggestions | Choose an appropriate font for the language being used |
| Preview | Selected font, text, colour and size preview | Fonts load on demand, with a visible loading/error status |
| Rendering | Wait for the selected font before drawing text | Failed font loading leaves the dialog open rather than silently drawing a substitute |
| Text layout | Multiline input | Lines are drawn with 1.25× line spacing |
| Family memory | Remember the last selected font during the session | Reused when adding the next text layer |
| Privacy | Google stylesheet and font requests only when using the picker | Images and text are not uploaded; font requests contact Google |

How to use: select Text, click the canvas, enter text, search/type a font family, check the preview and choose Add text. The Browse Google Fonts link opens the foundry catalogue in a new tab. Normal/regular style is supported in this increment. Text is still rasterised after insertion; existing text layers cannot yet be edited as text. Saved projects retain the rendered pixels, so reopening them does not require fetching the font again. The live catalogue has a popular-family fallback; direct exact-name loading does not require the catalogue.

Implementation reference: [Google Fonts CSS2 API](https://developers.google.com/fonts/docs/css2).


#### 0.2.1: Professional Workspace

| Area | Update | Behaviour |
|---|---|---|
| Layout | Photoshop-inspired compact workspace | Neutral grey surfaces, denser controls, narrow tool rail and docked inspector |
| Menus | File, Edit, Image, Layer, View and Help | Real menus trigger existing file, editing, layer and navigation actions |
| Menu keyboard support | Arrow keys and Escape | Arrow Down opens a menu; Up/Down navigate entries; Escape closes it |
| Canvas space | Smaller header, context bar and document strip | More vertical space is available for the image |
| Docked layers | Layer stack stays visible below Properties or Adjustments | Changing inspector controls does not hide the layer stack |
| Fullscreen | Dedicated header button, View menu entry and command palette entry | Uses the browser Fullscreen API; label updates on entry and exit |
| Fullscreen recovery | Escape and browser-controlled exit | Browser fullscreen exit restores the button state |
| Unsupported fullscreen | Inline fallback notice | Suggests the browser fullscreen control when the API is unavailable or rejected |

Fullscreen is user initiated and can depend on browser permissions, embedded-page policy and platform support. This update changes the workspace layout, not the underlying raster editing capabilities. Existing version 1 projects remain supported. The menu bar exposes implemented operations; unsupported Photoshop features are not added as inactive placeholder commands.


#### 0.2.0: Studio Interface

| Area | Update | Result |
|---|---|---|
| Visual system | Charcoal surfaces, mint accents, refined spacing and borders | A consistent creative workspace |
| Tools | Inline SVG icons, tooltips, accessible names and active states | A compact tool rail with clear feedback |
| Context bar | Tool name, relevant colour/size controls and tool-specific cursor | Fewer irrelevant controls during editing |
| Inspector | Layers, Properties and Adjustments tabs | Related controls are easier to locate |
| Workspace | Document label, subtle dot background and refined canvas shadow | Better visual hierarchy around the image |
| Commands | Searchable command palette with Ctrl/Cmd+K | Access file actions, tools and layer operations by name |
| Panels | Toggleable inspector; narrow screens start with it hidden | More room for the canvas |
| Dialogs | Rounded forms, stronger spacing and softened backdrop | A consistent treatment for editing actions |
| Accessibility | Visible keyboard focus, keyboard tab navigation and layer selection | More controls can be reached without a pointer |
| Motion | Brief control transitions with reduced-motion preference support | Responsive feedback without mandatory animation |
| Documentation | Detailed release history, roadmap and capability tables | Shipped and planned features are explicitly separated |

This release keeps the existing raster engine and version 1 project format. It does not implement autosave, multiple document tabs, a recent-project library or editable text. The document strip displays the current document only.

#### 0.1.0: Working Foundation

| Area | Initial capability |
|---|---|
| Documents | New transparent canvas; open an image |
| Layers | Add image or blank layer; duplicate, rename, reorder, hide and delete |
| Painting | Brush, eraser and paint bucket with colour controls |
| Selection | Rectangular selection constraining brush, eraser and shape drawing |
| Canvas | Crop, zoom, fit, physical units, paper presets and DPI |
| Elements | Raster text, filled rectangles and ellipses |
| Layer transforms | Move, rotate by 90 degrees, flip and resize |
| Colour | Per-layer brightness, contrast and saturation |
| Compositing | Opacity and six blend modes |
| History | Undo and redo using full project snapshots |
| Files | Layered Picturesque project saving and opening; flattened image export |

#### Current capability reference

| Capability | Supported now | Current boundary |
|---|---|---|
| Image input | Browser-decoded PNG, JPEG, WebP, GIF, BMP and SVG | Format decoding depends on the browser; animation is not retained |
| Raster painting | Brush and eraser | Round strokes; no pressure response or brush presets |
| Shapes and paths | Raster rectangle/ellipse plus editable cubic Bézier document paths | Fill/stroke output is raster; live vector layers are pending |
| Text | Editable mixed-font text with per-range size, colour and spacing | Regular styles; layer-wide leading; older text remains raster-only |
| Selections | Rectangle, ellipse, freehand lasso, wand, colour/alpha presets and combination modes | No feathering or edge refinement |
| Crop | Crop the whole document | Raster contents outside the crop are discarded in the current state |
| Transforms | Move, 90-degree rotation, flip, percentage resize | No on-canvas handles, arbitrary rotation or perspective |
| Layers | Visibility, order, names, duplication, opacity | No groups, locks, masks or clipping |
| Blend modes | Normal, multiply, screen, overlay, darken, lighten | Limited subset of advanced editor modes |
| Adjustments | Brightness, contrast and saturation stored per layer | Affect the whole layer; no independent adjustment layers |
| History | Independent reversible state commands per document, 25 entries per stack | Shared 64 MiB estimated history budget can reduce depth; decoded pixels use additional memory |
| Export | PNG, JPEG and WebP | Visible layers flattened; JPEG transparency becomes white |
| Projects | Version 1 .picturesque JSON files | Raster layers and settings only; no PSD compatibility |
| Persistence | Manual project downloads and local autosave | Local latest-session autosave/recovery; portable backups still require project downloads |
| Privacy | Local image processing; Google Fonts fetched on demand | Optional online features, if added, will require separate design |

#### Incremental roadmap

#### 0.3.x: Remaining Reliable Foundation Work

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Document model | Separate editor UI, document state, rendering and file handling | UI changes do not directly control stored document data |
| History | Command-based history with memory limits and grouped slider edits | One continuous adjustment undoes as one edit; limits are predictable |
| Recovery | IndexedDB autosave, saved-state indicator and recovery prompt | Reload can recover a valid document; storage errors are visible |
| Documents | Multiple open documents and close-state handling | Switching documents preserves independent history and settings |
| Navigation | Space-drag pan, anchored wheel zoom and synchronised zoom readout | The point under the cursor remains stable when zooming |
| Rendering | Avoid unnecessary canvas resets and thumbnail regeneration | Repeated strokes and panel changes remain responsive on reference images |
| File safety | Validate decoded dimensions, settings and project structure | Malformed files cannot partially replace a working document |
| Welcome | New/open actions and recent locally saved projects | Recent entries open valid projects or explain missing data |

Dependency: complete the document model and history work before expanding the object system.

#### 0.4.x: Remaining Editable Objects

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Text | Editable content, font family, weight, alignment, line spacing and colour | Text remains editable after save and reopen |
| Shapes | Vector rectangles, ellipses and paths with fill and stroke | Resizing preserves geometry and styling |
| Transforms | Selection bounds, resize handles, proportional scaling and arbitrary rotation | Pointer transforms and undo agree with numeric properties |
| Layout | Alignment, distribution, snapping, rulers and guides | Guides assist placement without changing export pixels |
| Migration | Versioned project schema and explicit rasterisation actions | Version 1 projects open; converting objects to pixels is deliberate |

#### 0.5.0: Layer Power

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Organisation | Groups, locking and multi-layer selection | Group operations preserve child order and editability |
| Masks | Editable raster layer masks | Mask edits can hide and reveal original pixels |
| Clipping | Clip a layer to the alpha of a layer beneath it | Compositing remains correct after reordering and reopening |
| Adjustment layers | Independent colour and tone layers | Adjustments can be disabled and changed without altering source pixels |
| Effects | Shadows, strokes and overlays | Effects remain editable and export consistently |

#### 0.6.0: Selection and Retouching

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Selection tools | Lasso, polygonal selection and tolerance-based magic wand | Selection overlays correspond to actual selected pixels |
| Selection operations | Add, subtract, intersect, invert and feather | Painting and deletion respect combined selection boundaries |
| Clone stamp | Sample source pixels and paint to a destination | Source tracking behaves predictably across strokes |
| Healing | Repair small blemishes with surrounding texture | Representative repair cases are visually reviewed |
| Brush controls | Hardness, opacity, spacing and presets | Controls affect strokes consistently at different zoom levels |

#### 0.7.0: Photo Editing

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Tone | Levels, curves and histogram | Reference tonal changes match expected pixel values |
| Colour | White balance, HSL and selective colour controls | Changes are reversible and avoid unintended colour clipping |
| Finishing | Sharpening, blur, gradients and filter preview | Preview and exported output agree |
| Comparison | Before/after and temporary effect bypass | Original content remains available for inspection |

#### 0.8.0: File Compatibility

| Phase | Scope | Acceptance criteria |
|---|---|---|
| PSD import, basic | Dimensions, raster layers, names, order, visibility and opacity | Tested fixture files produce a documented compatibility result |
| PSD import, extended | Groups, masks and supported text/effects where feasible | Unsupported structures are reported rather than silently lost |
| PSD export | Export the implemented subset | Round-trip tests verify supported layer structure and appearance |
| Interoperability | Fixture-based testing against external editors | Compatibility matrix identifies supported, approximated and unsupported features |

PSD support requires a separately evaluated parser/writer and cannot be promised as universal compatibility. Full smart-object, font and effect fidelity may require substantial additional work.

#### 0.9.0: Production Workflows

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Artboards | Multiple layouts in one project | Individual artboards export at the correct dimensions |
| Templates | Social graphics, posters and product layouts | Templates retain editable text and image placeholders |
| Export presets | Saved format, dimensions and quality settings | Presets produce consistent output across documents |
| Batch processing | Repeat supported operations over multiple files | Failures are identified per file; original files remain available |
| Asset library | Locally stored reusable graphics and styles | Assets can be inserted without corrupting document state |
| Actions | Record and replay supported editing operations | Replay is deterministic for documented supported actions |

#### 1.0+: Beyond Conventional Editing

| Direction | Potential capability | Required groundwork |
|---|---|---|
| Plain-language control | Convert requests into reviewable editing operations | Stable command system, previews and reversible actions |
| Product photography | Background removal, consistent margins, backgrounds and output sizes | Masks, batch processing and export presets |
| Guided editing | Task-specific workflows with helpful defaults | Reliable core tools and user testing |
| Optional AI | Assisted selections or generative operations | Provider, cost, consent, privacy and failure handling design |
| Accessibility | More workflows usable by keyboard and assistive technology | Continued testing of focus, controls and canvas alternatives |

These are exploratory directions. No external AI service is currently integrated. Improvement will be measured by completed workflows and reliability, not by feature count alone.

#### Running and publishing

No package installation or build step is needed for the current release.

| Method | Steps |
|---|---|
| Local | Download the repository and open index.html in a modern browser |
| GitHub Pages | Settings > Pages > Deploy from a branch > main > / (root) > Save |
| Other static hosting | Serve index.html from a static web host |

After a Pages update, allow deployment to finish. If an old interface remains visible, reload with Ctrl+Shift+R or Cmd+Shift+R.

#### Everyday workflow

1. Open an image or create a transparent canvas.
2. Add a separate layer for new painting, text or shapes when useful.
3. Choose a tool from the rail or search through Commands.
4. Use Layers to choose the edit target, Properties for opacity/transforms, and Adjustments for colour.
5. Save project to keep layers. Export image to produce a flattened deliverable.

Opening an image creates a new document tab. Add image layer inserts into the current document. Download a project for a portable backup. Wait for Recovery saved locally before relying on session recovery.

#### Keyboard reference

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+K | Open command palette |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| Ctrl/Cmd+V | Paste clipboard image as a layer |
| Ctrl/Cmd+wheel | Pointer-anchored zoom |
| Space+drag / middle-button drag | Pan scrollable workspace |
| G | Paint bucket |
| Shift+G | Gradient fill |
| W | Magic wand |
| Delete/Backspace | Clear selected pixels when a selection is active |
| V | Move |
| B | Brush |
| E | Eraser |
| M | Rectangular selection |
| Shift+M | Elliptical selection |
| L | Freehand lasso |
| Alt while moving | Temporarily bypass guide snapping |
| C | Crop |
| P | Pen tool |
| A | Direct selection for paths |
| Enter/Escape with Pen | Finish the current path |
| Delete/Backspace with Pen | Delete the selected anchor |
| Ctrl/Cmd with Pen | Temporarily edit anchors/handles |
| Alt while dragging a handle | Move that handle independently |
| Shift while dragging a handle | Constrain direction to 45-degree increments |
| T | Text |
| Escape | Clear selection; native dialogs close when focused |
| Left/Right arrows on inspector tabs | Change inspector tab |
| Home/End on inspector tabs | First/last inspector tab |
| Enter/Space on a layer row | Select that layer |
| Enter in command search | Run the first enabled matching command |

Tool shortcuts are suspended while typing in form controls or using a modal dialog.

#### Limits and verification

| Topic | Current limit |
|---|---|
| Canvas | Maximum 8192 pixels per side and 24 million pixels total |
| Project input | Up to 50 layers and 150 MB file size |
| Memory | Full raster snapshots and data URLs can consume substantial memory |
| Browser support | Requires Canvas 2D filters, Pointer Events and native dialog support |
| Fonts | Interface uses system fonts; the text picker loads selected Google Fonts online |
| Mobile | Compact layout and toggleable inspector; desktop remains the primary workflow |
| Validation | JavaScript syntax, control references and mocked runtime interaction checks |
| Verification gap | Real browser rendering, pixel correctness and cross-browser behaviour still require QA |

#### Release discipline

Each update should include:

1. A version and dated update entry describing the delivered behaviour.
2. Changes to the capability table when support or limits change.
3. Checks for the affected operations and compatibility with saved projects.
4. Real-browser visual and interaction checks when browser tooling is available.
5. Explicit notes for incomplete validation and deferred work.

Future documentation entries should describe the final shipped implementation, including any narrowed scope, rather than copying roadmap promises into the release history.


</details>

