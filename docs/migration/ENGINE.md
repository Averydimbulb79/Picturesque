### Engine evaluation

22 October 2026. Candidate: [PhotoCraft](https://github.com/storytold/photocraft), source pinned for this review to [68348dcafcf42599846afaab42a8a724b630eed5](https://github.com/storytold/photocraft/tree/68348dcafcf42599846afaab42a8a724b630eed5).
Decision: evaluate; not adopted or loaded into production.

#### What source inspection established

| Source | Finding | Implication for Picturesque |
|---|---|---|
| Cargo.toml | Workspace version 0.11.1, Rust 1.95 minimum, edition 2024; MIT OR Apache-2.0 | Pin the reviewed revision and audit dependency/asset licences before distributing |
| crates/engine/Cargo.toml | Engine depends on document, operations, compose, paint, algorithms, text, vector, I/O and formats; no egui dependency in its manifest | There is a candidate headless engine boundary |
| crates/engine/src/lib.rs | Session/document state, command-driven edits, active-layer management, undo and redo | Map UI actions to engine operations; do not run two independent history authorities |
| crates/compose/src/lib.rs | render/flatten/render_reduced and RGBA conversion APIs | Start with a small CPU-rendered document and pixel comparison before GPU integration |
| apps/photocraft-web/src/main.rs | Browser shell runs the same egui application through eframe and wasm-bindgen | Existing web build is not a drop-in JavaScript engine for our HTML interface |
| apps/photocraft-web/Cargo.toml | Web shell directly depends on egui and photocraft-ui-egui | Build a separate wrapper around lower-level crates; do not embed the candidate UI |

This is a source/API assessment. At the initial assessment, no PhotoCraft compilation, rendering benchmark or feature-parity validation had been completed. The local environment has no Cargo executable. The full dependency graph and browser compatibility remain to be checked in a build-capable environment. README feature claims do not count as passed acceptance tests.

#### Proposed integration boundary

Picturesque keeps its existing HTML/CSS, menus, tools and dialogs. A narrow asynchronous bridge translates editor actions and document state into calls to a separately compiled WASM engine. The initial production rendering boundary is implemented in src/engine.js with Canvas2D as its sole backend. The WASM bridge is a separate synthetic compositor probe, not a user-document adapter. No external runtime network request has been added.

| Boundary | Responsibility |
|---|---|
| Interface | Existing DOM, styling, icons, dialog layout, keyboard/pointer input |
| Bridge | Validated commands, document/layer IDs, errors, cancellation/busy state and transferable render buffers |
| Engine | Authoritative editable document, painting, masks, compositing and history after each area migrates |
| File adapter | Import existing Picturesque v1/v2 and preserve all editable information on save/reopen |
| Platform | Browser downloads/recovery now; existing Electron file bridge after browser acceptance |

Start with document creation, one raster layer, render, an edit and undo/redo. Use a separate development harness until compilation, startup errors and output comparisons pass. Keep heavy work off the UI thread where supported, measure WASM startup/download cost, and check the existing content security policy before adding generated loaders.

Do not silently flatten unsupported text/vector/selection data or overwrite original projects. Reject an unsupported migration with an actionable error and keep the original document available. Keep JS-to-WASM copies bounded; measure transfer cost as well as engine time.

#### Required feasibility results

1. Compile the pinned headless engine and wrapper for wasm32-unknown-unknown without the egui shell.
2. Build a static browser harness that works under the repository's GitHub Pages base path.
3. Create/import a synthetic raster layer, render it, apply one edit, undo and redo.
4. Compare CPU output with the current editor for alpha, blend modes, colour adjustments and bounds.
5. Establish mappings for rich text runs, vector geometry, selection masks, DPI, guides and project v2. Document gaps before replacing their implementations.
6. Profile first load and repeated painting, pan/zoom, undo and save on representative small and 24 MP documents. Record browser, hardware, layer count, memory and timings; do not claim a speed improvement without measurements.
7. Review licences, bundled assets, transitive dependencies and maintenance risks.

If the headless build or editable-state mapping is unsuitable, evaluate a modular PixiJS rendering route with selected processing/file components. Do not introduce multiple competing canvas engines merely to collect features.

See [baseline and acceptance checklist](BASELINE.md). Existing production rendering and save semantics remain the reference until these gates pass.

#### Rewrite increment 0.5.0-alpha.1

The production editor now delegates composition to a stateless renderer accepting document dimensions and ordered layer descriptors. Existing canvas sources, alpha/blend/adjustment semantics and synchronous callers are retained. This isolates rendering from DOM/editor globals without introducing a second document/history store.

The separate engine/photocraft-probe crate pins PhotoCraft's document/compositor crates to the reviewed revision and wasm-bindgen to 0.2.105. It validates dimensions before constructing a small synthetic red image. Native tests verify pixels and input limits; the GitHub workflow compiles WASM, generates its browser loader and uploads a standalone harness. The harness verifies every pixel before reporting PASS. Compilation or native tests do not substitute for running that harness in a browser.

Run the workflow from GitHub Actions. Download Picturesque-engine-probe, extract it and serve the folder over HTTP, for example with python -m http.server 8000. Open http://localhost:8000. It does not modify the live editor or user files. No engine project importer, painting adapter or history bridge is claimed yet. Source revisions are pinned; a resolved Cargo lockfile and complete dependency/licence audit are still required before production adoption.

Validation, 22 October 2026: GitHub run 39642571435 passed native compositor/input-limit tests and the wasm32 release build. Loader generation and downloadable harness packaging also passed; actual browser execution of the isolated WASM probe remains pending. The production alpha passed live browser startup, layer add/undo/redo and export-dialog checks. This is not a full visual/pixel parity assessment.
