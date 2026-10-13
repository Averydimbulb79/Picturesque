# Picturesque

A browser image studio for photo editing, graphics and everyday creative work. Picturesque is evolving through incremental releases toward advanced editing workflows, with an emphasis on approachable controls, reversible edits and local processing.

Current release: 0.2.0, Studio Interface, 13 October 2026.

[Launch Picturesque](https://averydimbulb79.github.io/Picturesque/) · [Repository](https://github.com/Averydimbulb79/Picturesque)

The launch link requires GitHub Pages to be enabled. Source updates on the configured publishing branch will be deployed by GitHub Pages.

## Release status

| Version | Name | Status | Purpose |
|---|---|---|---|
| 0.1.0 | Working Foundation | Shipped | Establish basic raster editing and layered project files |
| 0.2.0 | Studio Interface | Shipped; visual browser QA pending | Replace the initial utility-style interface with a cohesive workspace |
| 0.3.0 | Reliable Foundation | Planned next | Improve document state, recovery, navigation and rendering |
| 0.4.0 | Editable Objects | Planned | Keep text and shapes editable; introduce direct transforms |
| 0.5.0 | Layer Power | Planned | Add groups, masks, clipping and adjustment layers |
| 0.6.0 | Selection and Retouching | Planned | Add flexible selections and repair tools |
| 0.7.0 | Photo Editing | Planned | Add tonal and colour tools for serious photo work |
| 0.8.0 | File Compatibility | Planned | Introduce measured PSD interoperability |
| 0.9.0 | Production Workflows | Planned | Support artboards, presets, batches and reusable actions |
| 1.0+ | Assisted Creative Workflows | Exploratory | Simplify repetitive work and introduce optional assistance |

Planned versions are direction and scope, not delivery dates or claims of implemented capability. Large releases may be split into smaller updates. Photopea-level compatibility is a long-term goal; this application currently covers a much smaller feature set.

## Update history

### 0.2.0: Studio Interface

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

### 0.1.0: Working Foundation

| Area | Initial capability |
|---|---|
| Documents | New transparent canvas; open an image |
| Layers | Add image or blank layer; duplicate, rename, reorder, hide and delete |
| Painting | Brush and eraser with colour and size controls |
| Selection | Rectangular selection constraining brush, eraser and shape drawing |
| Canvas | Crop, zoom and fit |
| Elements | Raster text, filled rectangles and ellipses |
| Layer transforms | Move, rotate by 90 degrees, flip and resize |
| Colour | Per-layer brightness, contrast and saturation |
| Compositing | Opacity and six blend modes |
| History | Undo and redo using full project snapshots |
| Files | Layered Picturesque project saving and opening; flattened image export |

## Current capability reference

| Capability | Supported now | Current boundary |
|---|---|---|
| Image input | Browser-decoded PNG, JPEG, WebP, GIF, BMP and SVG | Format decoding depends on the browser; animation is not retained |
| Raster painting | Brush and eraser | Round strokes; no pressure response or brush presets |
| Shapes | Filled rectangle and ellipse | Rasterised immediately; no editable vectors |
| Text | Add text with size and colour | Sans-serif, rasterised immediately; no later text editing |
| Selections | Rectangular area | No lasso, feathering or selection combining |
| Crop | Crop the whole document | Raster contents outside the crop are discarded in the current state |
| Transforms | Move, 90-degree rotation, flip, percentage resize | No on-canvas handles, arbitrary rotation or perspective |
| Layers | Visibility, order, names, duplication, opacity | No groups, locks, masks or clipping |
| Blend modes | Normal, multiply, screen, overlay, darken, lighten | Limited subset of advanced editor modes |
| Adjustments | Brightness, contrast and saturation stored per layer | Affect the whole layer; no independent adjustment layers |
| History | Up to 25 ordinary edit snapshots | Full snapshots can consume significant memory |
| Export | PNG, JPEG and WebP | Visible layers flattened; JPEG transparency becomes white |
| Projects | Version 1 .picturesque JSON files | Raster layers and settings only; no PSD compatibility |
| Persistence | Manual project downloads | No autosave or crash recovery yet |
| Privacy | Local image processing; no external dependencies | Optional online features, if added, will require separate design |

## Incremental roadmap

### 0.3.0: Reliable Foundation

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

### 0.4.0: Editable Objects

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Text | Editable content, font family, weight, alignment, line spacing and colour | Text remains editable after save and reopen |
| Shapes | Vector rectangles, ellipses and paths with fill and stroke | Resizing preserves geometry and styling |
| Transforms | Selection bounds, resize handles, proportional scaling and arbitrary rotation | Pointer transforms and undo agree with numeric properties |
| Layout | Alignment, distribution, snapping, rulers and guides | Guides assist placement without changing export pixels |
| Migration | Versioned project schema and explicit rasterisation actions | Version 1 projects open; converting objects to pixels is deliberate |

### 0.5.0: Layer Power

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Organisation | Groups, locking and multi-layer selection | Group operations preserve child order and editability |
| Masks | Editable raster layer masks | Mask edits can hide and reveal original pixels |
| Clipping | Clip a layer to the alpha of a layer beneath it | Compositing remains correct after reordering and reopening |
| Adjustment layers | Independent colour and tone layers | Adjustments can be disabled and changed without altering source pixels |
| Effects | Shadows, strokes and overlays | Effects remain editable and export consistently |

### 0.6.0: Selection and Retouching

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Selection tools | Lasso, polygonal selection and tolerance-based magic wand | Selection overlays correspond to actual selected pixels |
| Selection operations | Add, subtract, intersect, invert and feather | Painting and deletion respect combined selection boundaries |
| Clone stamp | Sample source pixels and paint to a destination | Source tracking behaves predictably across strokes |
| Healing | Repair small blemishes with surrounding texture | Representative repair cases are visually reviewed |
| Brush controls | Hardness, opacity, spacing and presets | Controls affect strokes consistently at different zoom levels |

### 0.7.0: Photo Editing

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Tone | Levels, curves and histogram | Reference tonal changes match expected pixel values |
| Colour | White balance, HSL and selective colour controls | Changes are reversible and avoid unintended colour clipping |
| Finishing | Sharpening, blur, gradients and filter preview | Preview and exported output agree |
| Comparison | Before/after and temporary effect bypass | Original content remains available for inspection |

### 0.8.0: File Compatibility

| Phase | Scope | Acceptance criteria |
|---|---|---|
| PSD import, basic | Dimensions, raster layers, names, order, visibility and opacity | Tested fixture files produce a documented compatibility result |
| PSD import, extended | Groups, masks and supported text/effects where feasible | Unsupported structures are reported rather than silently lost |
| PSD export | Export the implemented subset | Round-trip tests verify supported layer structure and appearance |
| Interoperability | Fixture-based testing against external editors | Compatibility matrix identifies supported, approximated and unsupported features |

PSD support requires a separately evaluated parser/writer and cannot be promised as universal compatibility. Full smart-object, font and effect fidelity may require substantial additional work.

### 0.9.0: Production Workflows

| Workstream | Planned implementation | Acceptance criteria |
|---|---|---|
| Artboards | Multiple layouts in one project | Individual artboards export at the correct dimensions |
| Templates | Social graphics, posters and product layouts | Templates retain editable text and image placeholders |
| Export presets | Saved format, dimensions and quality settings | Presets produce consistent output across documents |
| Batch processing | Repeat supported operations over multiple files | Failures are identified per file; original files remain available |
| Asset library | Locally stored reusable graphics and styles | Assets can be inserted without corrupting document state |
| Actions | Record and replay supported editing operations | Replay is deterministic for documented supported actions |

### 1.0+: Beyond Conventional Editing

| Direction | Potential capability | Required groundwork |
|---|---|---|
| Plain-language control | Convert requests into reviewable editing operations | Stable command system, previews and reversible actions |
| Product photography | Background removal, consistent margins, backgrounds and output sizes | Masks, batch processing and export presets |
| Guided editing | Task-specific workflows with helpful defaults | Reliable core tools and user testing |
| Optional AI | Assisted selections or generative operations | Provider, cost, consent, privacy and failure handling design |
| Accessibility | More workflows usable by keyboard and assistive technology | Continued testing of focus, controls and canvas alternatives |

These are exploratory directions. No external AI service is currently integrated. Improvement will be measured by completed workflows and reliability, not by feature count alone.

## Running and publishing

No package installation or build step is needed for the current release.

| Method | Steps |
|---|---|
| Local | Download the repository and open index.html in a modern browser |
| GitHub Pages | Settings > Pages > Deploy from a branch > main > / (root) > Save |
| Other static hosting | Serve index.html from a static web host |

After a Pages update, allow deployment to finish. If an old interface remains visible, reload with Ctrl+Shift+R or Cmd+Shift+R.

## Everyday workflow

1. Open an image or create a transparent canvas.
2. Add a separate layer for new painting, text or shapes when useful.
3. Choose a tool from the rail or search through Commands.
4. Use Layers to choose the edit target, Properties for opacity/transforms, and Adjustments for colour.
5. Save project to keep layers. Export image to produce a flattened deliverable.

Opening an image replaces the current document. Add image layer inserts into the current document. Download a project before closing or refreshing the page; autosave is planned for 0.3.0.

## Keyboard reference

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+K | Open command palette |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| V | Move |
| B | Brush |
| E | Eraser |
| M | Rectangular selection |
| C | Crop |
| T | Text |
| Escape | Clear selection; native dialogs close when focused |
| Left/Right arrows on inspector tabs | Change inspector tab |
| Home/End on inspector tabs | First/last inspector tab |
| Enter/Space on a layer row | Select that layer |
| Enter in command search | Run the first enabled matching command |

Tool shortcuts are suspended while typing in form controls or using a modal dialog.

## Limits and verification

| Topic | Current limit |
|---|---|
| Canvas | Maximum 8192 pixels per side and 24 million pixels total |
| Project input | Up to 50 layers and 150 MB file size |
| Memory | Full raster snapshots and data URLs can consume substantial memory |
| Browser support | Requires Canvas 2D filters, Pointer Events and native dialog support |
| Fonts | Uses system fonts; no external font loading |
| Mobile | Compact layout and toggleable inspector; desktop remains the primary workflow |
| Validation | JavaScript syntax, control references and mocked runtime interaction checks |
| Verification gap | Real browser rendering, pixel correctness and cross-browser behaviour still require QA |

## Release discipline

Each update should include:

1. A version and dated update entry describing the delivered behaviour.
2. Changes to the capability table when support or limits change.
3. Checks for the affected operations and compatibility with saved projects.
4. Real-browser visual and interaction checks when browser tooling is available.
5. Explicit notes for incomplete validation and deferred work.

Future documentation entries should describe the final shipped implementation, including any narrowed scope, rather than copying roadmap promises into the release history.
