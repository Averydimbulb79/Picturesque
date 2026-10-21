##### Picturesque

A browser-based image editor for layered graphics, photo editing, and creative projects.

[Open the web app](https://averydimbulb79.github.io/Picturesque/) · [Source](https://github.com/Averydimbulb79/Picturesque) · [Changelog](CHANGELOG.md)

#### Current status

Web-first development on `main`. The previous application is preserved in [legacy/](legacy/) and in the complete [pre-transition backup](../../tree/backup/pre-web-first-main). Windows packaging is deferred until the web experience is accepted; existing desktop build tooling may remain in the repository.

#### Engine migration preparation

Current application: v0.4.9. Migration foundation added 22 October 2026. The current interface and every existing function are the minimum baseline for the replacement engine.

| Added | Purpose |
|---|---|
| [Interface baseline](docs/migration/BASELINE.md) | Preserves layout, styling, icons, menus and the full functional acceptance checklist |
| [Engine assessment](docs/migration/ENGINE.md) | Pinned PhotoCraft source review, integration boundary and feasibility gates |
| Regression checks | Locks approved interface files and control identities; runs with npm test |

The existing editor remains active. PhotoCraft is being evaluated; its engine has not been integrated or benchmarked. Windows packaging follows browser acceptance.

#### Main capabilities

- Multi-document workspace, zoom, guides, layers, and history.
- Raster painting, selection tools, image adjustments, and vector paths.
- Editable typography, transforms, and export options.
- Native editable project and workspace formats.

#### Working with projects

Save as `.picturesque` to preserve editable layers, or export a flattened PNG/JPEG for sharing. Keep a separate backup of important work. Some advanced Photoshop-like features remain under development; see the [changelog](CHANGELOG.md) for implementation details and known limitations.

#### Development policy

Incremental web releases are developed on `main`; test in the browser before packaging a Windows build. Preserve rollback points before significant changes and update the changelog with each release.
