### Picturesque

A browser-based image editor for layered graphics, photo editing, and creative projects.

[Open the web app](https://averydimbulb79.github.io/Picturesque/) · [Source](https://github.com/Averydimbulb79/Picturesque) · [Changelog](CHANGELOG.md)

#### Current status

Web-first development on `main`. The previous application is preserved in [legacy/](legacy/) and in the complete [pre-transition backup](../../tree/backup/pre-web-first-main). Windows packaging is deferred until the web experience is accepted; existing desktop build tooling may remain in the repository.

#### Engine migration preparation

Current application: v0.5.0-alpha.1, updated 22 October 2026. The current interface and every existing function are the minimum baseline for the replacement engine.

| Added | Purpose |
|---|---|
| [Interface baseline](docs/migration/BASELINE.md) | Preserves layout, styling, icons, menus and the full functional acceptance checklist |
| [Engine assessment](docs/migration/ENGINE.md) | Pinned PhotoCraft source review, integration boundary and feasibility gates |
| Regression checks | Locks approved interface files and control identities; runs with npm test |

The first rewrite increment routes canvas display, merged previews and exports through a DOM-independent renderer. Existing tools, interface and project v2 remain in place. PhotoCraft has an isolated Rust/WASM compositor probe and GitHub build workflow; it is not the production renderer.

Run `npm test` for 15 regression checks. The [engine probe workflow](https://github.com/Averydimbulb79/Picturesque/actions/workflows/engine-probe.yml) builds a downloadable browser harness. Extract its artifact, serve the folder over HTTP and open index.html. A passing build alone does not establish browser or feature parity.

Windows packaging is manual while browser development proceeds; it follows web acceptance.

#### Main capabilities

- Multi-document workspace, zoom, guides, layers, and history.
- Raster painting, selection tools, image adjustments, and vector paths.
- Editable typography, transforms, and export options.
- Native editable project and workspace formats.

#### Working with projects

Save as `.picturesque` to preserve editable layers, or export a flattened PNG/JPEG for sharing. Keep a separate backup of important work. Some advanced Photoshop-like features remain under development; see the [changelog](CHANGELOG.md) for implementation details and known limitations.

#### Development policy

Incremental web releases are developed on `main`; test in the browser before packaging a Windows build. Preserve rollback points before significant changes and update the changelog with each release.
