"use strict";
const desktopOpenQueue = [];
let desktopQueueRunning = false;
async function receiveNativeFile(file) {
  if (!file || typeof file.text !== "string") return;
  desktopOpenQueue.push(file);
  drainNativeQueue();
}
async function drainNativeQueue() {
  if (desktopQueueRunning || !desktopOpenQueue.length) return;
  if (
    busy ||
    drag ||
    guideDrag ||
    penDrag ||
    $("dialog").open ||
    $("commandDialog").open
  ) {
    setTimeout(drainNativeQueue, 250);
    return;
  }
  desktopQueueRunning = true;
  const file = desktopOpenQueue.shift();
  setBusy(true);
  try {
    const source = JSON.parse(file.text);
    if (file.kind === "workspace") {
      const decoded = await decodeWorkspace(source);
      captureDocument();
      if (
        openDocuments.some((d) => d.state.documentDirty) &&
        !confirm(
          "Replace the open workspace? Save projects or a workspace backup first to keep current work.",
        )
      )
        return;
      installWorkspace(decoded);
      nativeProjectTokens.clear();
    } else {
      if (!documentSlotAvailable()) return;
      const decoded = await decodeProject(source);
      openDocumentState(decoded, decoded.name || file.name, false);
      nativeProjectTokens.set(activeDocumentId, file.token);
      if (!decoded.view) fit();
    }
    $("projectSaveStatus").textContent = "Opened: " + file.name;
  } catch (error) {
    $("projectSaveStatus").textContent = "Open failed: " + error.message;
    alert("Could not open file: " + error.message);
  } finally {
    setBusy(false);
    desktopQueueRunning = false;
    drainNativeQueue();
  }
}
async function openNativeFile(kind) {
  if (!desktopBridge || busy || $("dialog").open || $("commandDialog").open)
    return;
  setBusy(true);
  try {
    const file = await desktopBridge.openFile(kind);
    if (file) receiveNativeFile(file);
  } catch (error) {
    alert("Could not open file: " + error.message);
  } finally {
    setBusy(false);
    drainNativeQueue();
  }
}
function initialiseDesktop() {
  if (!desktopBridge) return;
  $("save").title = "Save project (Ctrl+S); Save As (Ctrl+Shift+S)";
  $("projectSaveStatus").textContent = "Project: choose Save to keep your work";
  desktopBridge.onOpenFile(receiveNativeFile);
  desktopBridge.onCommand((command) => {
    if (
      ["undo", "redo"].includes(command) &&
      typingTarget(document.activeElement)
    ) {
      document.execCommand(command);
      return;
    }
    if (
      busy ||
      drag ||
      penDrag ||
      guideDrag ||
      $("dialog").open ||
      $("commandDialog").open
    )
      return;
    if (command === "save-as") return void saveProject(true);
    if (command === "open-project") return void openNativeFile("project");
    if (command === "open-workspace") return void openNativeFile("workspace");
    if (command === "save-workspace") return void saveWorkspace();
    const controls = {
      new: "new",
      save: "save",
      export: "export",
      undo: "undo",
      redo: "redo",
      fit: "fit",
      fullscreen: "fullscreen",
    };
    if (controls[command]) $(controls[command]).click();
  });
  syncDesktopState();
  desktopBridge.ready();
}
