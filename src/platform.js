"use strict";
// Only this boundary knows whether the renderer is running in a browser or Electron.
const desktopBridge = window.picturesqueDesktop || null;
const nativeProjectTokens = new Map();
function syncDesktopState() {
  if (!desktopBridge) return;
  const dirty =
    documentDirty ||
    openDocuments.some(
      (d) => d.id !== activeDocumentId && d.state.documentDirty,
    );
  desktopBridge.setState({
    dirty,
    busy: !!(busy || drag || penDrag || guideDrag),
  });
}
