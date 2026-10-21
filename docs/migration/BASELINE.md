### Picturesque migration baseline

Captured 22 October 2026 from application v0.4.9 at commit e799ec1b0fe8d0c6433b610b0d8d972f6ea6063e.
Complete rollback: [backup branch](https://github.com/Averydimbulb79/Picturesque/tree/backup/pre-engine-baseline-20261022).

The approved interface and all existing functions are the minimum acceptance criteria. Preserve branding, colours, typography, icon geometry, control sizes, positions, spacing, panels, dialogs, shortcuts and interaction behaviour. A candidate's own interface is not a replacement for Picturesque.

#### Automated protection

Run `npm test`. The interface fixture records the exact SHA-256 of index.html, editor.css and interface.js, plus the ordered scripts, 13 tools, seven menus and 122 element IDs. This protects markup, styling, icons and menu construction from accidental changes. It is not a screenshot comparison and does not prove browser layout or every interaction. Dynamically created dialogs also require visual checks.

Existing tests exercise document/workspace decoding, editable vectors, selection and view state, history, export validation, desktop file handling and save cancellation. These use a simulated DOM and do not establish real pixel rendering fidelity.

Do not regenerate the baseline as part of a build or test. Intentional changes require reviewing the differences against the saved commit, checking the browser at matching viewport/zoom/font conditions, and recording the reason here. An engine migration alone is not a reason to redesign the interface.

#### Functional acceptance checklist

Every row must pass on the migrated implementation before switching the production editor. All migrated-engine statuses are pending. Current implementation is the reference; its known limits remain documented rather than being treated as new capabilities.

| Area | Behaviour to retain | Acceptance exercise |
|---|---|---|
| Workspace | Existing header, seven menus, tool rail, options, inspector tabs and status controls | Compare browser screenshots at identical viewport and display scaling; open every menu and dialog |
| Documents | New/open, independent tabs, names, active layer, dirty state, close confirmation, eight-document limit | Edit two documents, switch repeatedly, save one and close the other |
| Navigation | Fullscreen, inspector toggle, fit, zoom around pointer, pan, scroll | Check canvas and ruler alignment after zoom/pan/fullscreen |
| Layers | Add/import/paste, duplicate, reorder, rename, visibility, opacity, six blend modes | Save/reopen overlapping layers and compare composites |
| Painting | Brush, eraser, colour picker, foreground colour, brush size and opacity | Compare strokes, transparency and undo |
| Fills | Bucket tolerance/contiguous options; editable gradient stops, alpha, reverse, linear/radial | Fill a bounded region and a selection; compare exported pixels |
| Selections | Rectangle, ellipse, lasso, Magic Wand, all/none/invert, white/black/custom colour/transparent pixels, combination modes | Verify edge pixels, inversion and effects of subsequent fills/deletes |
| Text | Google Fonts, individual-word fonts/sizes/colours, bold/italic/underline, letter spacing, leading | Format separate words, reopen dialog/project, edit again; compare layout |
| Text dialog | Existing wide column layout and selection-based formatting behaviour | Open new and existing text, select a word and apply each setting |
| Canvas | Crop, canvas size, DPI, physical units, common paper sizes | Create A4 at chosen DPI, crop, save/reopen and export PNG with metadata |
| Guides | Working-area perimeter rulers, add/move/remove guides, visibility, snapping and Alt bypass | Move a layer near a guide at multiple zoom levels |
| Vectors | Editable rectangle/ellipse/path layers, fill/stroke, compound subpaths and holes | Reopen and edit geometry without rasterising |
| Pen | Anchors, handles, corner/smooth, open/close, duplicate/delete/rename, fill/stroke, selection and SVG path output | Exercise every pen toolbar action and undo each geometry change |
| Transforms | Move, percentage resize, 90-degree rotation and flips | Compare raster and vector layer results and saved bounds |
| Adjustments | Existing per-layer brightness, contrast and saturation | Compare display and PNG/JPEG/WebP output after save/reopen |
| History | Independent undo/redo, named entries, current budget and busy guards | Alternate documents and undo/redo strokes, vectors and transforms |
| Projects | Read v1/v2; write v2 preserving raster data, text runs, paths, selections, guides, DPI, names and view | Round-trip mixed-content projects; reject invalid files without changing current work |
| Workspace backup | All documents, active tab and markers | Restore a multi-document backup and compare all editable state |
| Export | Format dropdown; PNG/JPEG/WebP-specific settings, size/aspect/smoothing, transparency/background | Decode each exported file and verify dimensions, alpha and quality controls |
| Recovery | Browser-local recovery and current unsaved-work handling | Reload interrupted work, recover it and save a fresh project |
| Commands | Command search, keyboard shortcuts, typing/dialog suppression and paste | Exercise keyboard-only workflows including text entry |
| Desktop boundary | Existing native Save/Open/export, file identity, atomic writes, recovery, isolation | Retain bridge contract; repeat packaged-app tests when Windows packaging resumes |

#### Reference projects and visual evidence

Before engine cutover, commit synthetic project fixtures containing overlapping raster layers, mixed text runs, compound vectors, inverted selection, guides and non-default DPI. Capture matching viewport screenshots of workspace, text, canvas sizing, gradients, export and vector dialogs. Record export pixel comparisons and acceptable numeric tolerance per operation. These browser/pixel fixtures have not yet been captured; source hashes are the first protection, not completion of visual parity.

Use synthetic artwork rather than personal images. Preserve editable semantics: rendering a flattened copy is not project compatibility.

#### Delivery gates

| Increment | Deliverable | Status |
|---|---|---|
| Foundation | Rollback branch, immutable source baseline, interface regression checks, feature inventory | Complete |
| Engine feasibility | Pinned source audit, isolated WASM build and minimal document/render/undo bridge | Source audit complete; build and bridge pending |
| Rendering trial | One synthetic raster document displayed through existing canvas with output comparison | Pending |
| Document parity | Layers, text, vectors, selections, history and project round-trips | Pending |
| Browser acceptance | Full checklist, visual comparison, large-document profiling, recovery and load failures | Pending |
| Windows | Package accepted shared web editor and repeat native file/recovery smoke tests | Deferred until web acceptance |

Rewrite increment 0.5.0-alpha.1 adds src/engine.js before rendering.js and updates the version label. The interface tests normalise these two approved differences before comparing the original HTML hash. Styles and interface.js remain byte-identical. Rendering now delegates to a stateless Canvas2D backend; editable state/history are not migrated.
