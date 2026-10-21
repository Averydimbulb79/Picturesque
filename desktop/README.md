### Picturesque desktop development

[Main documentation](../README.md) · [Windows builds](https://github.com/Averydimbulb79/Picturesque/actions/workflows/windows.yml)

#### Run and package

Use Node.js 24 and a supported Windows system for installer builds.

```sh
npm ci
npm test
npm start
npm run dist:win
```

The installer is written under dist/. GitHub Actions runs the same checks on Windows and uploads the unsigned x64 NSIS installer as an artifact. A successful build is a preview package, not proof of a full manual Windows QA pass. Artifacts expire after 30 days; rerun the workflow to regenerate one. Automatic updates and code signing require separate release setup.

#### Source map

| Path                                                      | Responsibility                                             |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| index.html                                                | Editor markup and ordered script loading                   |
| styles/editor.css                                         | Workspace and dialog styling                               |
| src/platform.js                                           | Browser/desktop capability boundary                        |
| src/state.js                                              | Document tabs and state                                    |
| src/rendering.js, history.js, project-format.js           | Raster composition, history and project serialization      |
| src/editor-tools.js, navigation.js                        | Tool gestures and navigation                               |
| src/vectors.js, selections.js, gradients.js, clipboard.js | Editing feature areas                                      |
| src/guides.js, canvas.js, text.js                         | Rulers, print sizes and typography                         |
| src/files.js, recovery.js                                 | Shared save/export and recovery workflows                  |
| src/interface.js, desktop-integration.js, bootstrap.js    | UI registration, native events and startup                 |
| desktop/main.cjs                                          | Electron window, menus, native dialogs and validated IPC   |
| desktop/preload.cjs                                       | Restricted bridge without exposing Node or raw IPC         |
| desktop/files.cjs                                         | File handles, atomic writes, byte limits and disk recovery |
| tests/                                                    | Node regression checks; mocked canvas for editor tests     |

These feature files retain the original shared lexical state. Defer scripts load in the exact index.html order, and bootstrap runs last. Do not reorder files without checking initialization dependencies. This preserves direct file opening and static hosting while providing a route toward more isolated modules later.

#### File behaviour

- Each open native project receives an opaque token. The renderer cannot specify an arbitrary overwrite path.
- Save uses that token; Save As asks for a new location. Opening legacy .json through the native dialog is supported, with a new .picturesque destination requested on save.
- Cancelling a dialog does not mark the document saved. Files are replaced only after a temporary file has been written and synced.
- Export and workspace backup always ask for a destination. A workspace backup does not clear individual project markers.
- Recovery lives in recovery.json within Electron's userData folder, normally %APPDATA%/Picturesque. It is separate from browser recovery and is preserved on uninstall.
- Recovery restores editable documents, selections and views, not file destinations or undo stacks.
- Close prompts offer Keep editing or Discard; save the needed projects/workspace before choosing Discard.

#### Checks and boundaries

Run npm test on every browser/desktop release. Test real Windows file dialogs, cancellation, Ctrl+S/Save As, locked-file errors, file associations, close confirmation, recovery after restart, image/text/vector editing and export before calling a Windows release stable.

The renderer uses context isolation, sandboxing, nodeIntegration disabled and a restrictive content policy. IPC checks the sender frame. Only explicit file actions grant access; arbitrary file paths and shell commands are not exposed to the renderer.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security/) and [NSIS packaging](https://www.electron.build/docs/nsis/).
