"use strict";
// recovery.js — shared editor source; load order is declared in index.html.
let autosaveDirty = false,
  autosaveReady = false,
  autosaveTimer,
  autosaveRevision = 0,
  autosaveWriting = false;
function recoveryDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("Local storage unavailable"));
      return;
    }
    const request = indexedDB.open("picturesque-recovery", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function recoveryStore(mode, value) {
  if (desktopBridge) return desktopBridge.recovery({ mode, value });
  const db = await recoveryDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
          "documents",
          mode === "get" ? "readonly" : "readwrite",
        ),
        store = tx.objectStore("documents");
      const request =
        mode === "get"
          ? store.get("latest")
          : mode === "delete"
            ? store.delete("latest")
            : store.put(value, "latest");
      let result;
      request.onsuccess = () => (result = request.result);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Local storage operation aborted"));
    });
  } finally {
    db.close();
  }
}
function scheduleAutosave() {
  if (!autosaveReady || !autosaveDirty) return;
  autosaveRevision++;
  clearTimeout(autosaveTimer);
  $("autosaveStatus").textContent = "Recovery pending";
  autosaveTimer = setTimeout(writeAutosave, 1500);
}
async function writeAutosave() {
  if (!autosaveReady || !autosaveDirty) return;
  if (drag || guideDrag || penDrag || busy || autosaveWriting) {
    autosaveTimer = setTimeout(writeAutosave, 800);
    return;
  }
  const revision = autosaveRevision;
  autosaveWriting = true;
  try {
    $("autosaveStatus").textContent = "Saving recovery…";
    await recoveryStore("put", {
      savedAt: Date.now(),
      workspace: workspaceSnapshot(),
    });
    if (revision === autosaveRevision) {
      autosaveDirty = false;
      $("autosaveStatus").textContent = "Recovery saved locally";
    }
  } catch (e) {
    $("autosaveStatus").textContent = "Recovery unavailable · save project";
    $("autosaveStatus").title = e.message;
  } finally {
    autosaveWriting = false;
    if (autosaveDirty && revision !== autosaveRevision) scheduleAutosave();
  }
}
async function decodeWorkspace(source) {
  if (
    !source ||
    source.format !== "picturesque-workspace" ||
    ![1, 2].includes(source.version) ||
    !Array.isArray(source.documents) ||
    !source.documents.length ||
    source.documents.length > 8 ||
    !Number.isInteger(source.active) ||
    source.active < 0 ||
    source.active >= source.documents.length
  )
    throw new Error("Invalid workspace");
  const pending = [];
  for (const d of source.documents) {
    const decoded = await decodeProject(d.project),
      state = completeDocumentState(
        decoded,
        String(d.name || decoded.name || "Recovered project").slice(0, 200),
        !!d.dirty,
      );
    if (!decoded.view && d.view) {
      state.zoom = Number.isFinite(d.view.zoom)
        ? Math.max(0.05, Math.min(4, d.view.zoom))
        : 1;
      state.scrollLeft = Number.isFinite(d.view.left)
        ? Math.max(0, d.view.left)
        : 0;
      state.scrollTop = Number.isFinite(d.view.top)
        ? Math.max(0, d.view.top)
        : 0;
    }
    pending.push(state);
  }
  return { states: pending, active: source.active };
}
function installWorkspace(decoded) {
  openDocuments = decoded.states.map((state) => ({
    id: ++documentCounter,
    state,
  }));
  activeDocumentId = null;
  activateDocument(openDocuments[decoded.active], false);
  autosaveDirty = true;
  scheduleAutosave();
}
async function saveWorkspace() {
  if (busy || drag || penDrag || guideDrag || $("dialog").open) return;
  setBusy(true);
  try {
    $("projectSaveStatus").textContent = "Workspace: checking backup…";
    const source = workspaceSnapshot(),
      blob = new Blob([JSON.stringify(source)], { type: "application/json" });
    if (blob.size > PROJECT_MAX_BYTES)
      throw new Error(
        "Workspace exceeds 150 MB. Save individual projects instead.",
      );
    await decodeWorkspace(JSON.parse(await blob.text()));
    const result = await download(
      blob,
      "Picturesque-workspace.picturesque-workspace",
    );
    if (result?.cancelled) {
      $("projectSaveStatus").textContent = "Workspace save cancelled";
      return;
    }
    $("projectSaveStatus").textContent =
      (desktopBridge ? "Workspace saved · " : "Workspace download started · ") +
      source.documents.length +
      " documents";
    $("projectSaveStatus").title =
      "Verify browser downloads. Undo history and font files are not included.";
  } catch (e) {
    $("projectSaveStatus").textContent =
      "Workspace backup failed: " + e.message;
    alert(e.message);
  } finally {
    setBusy(false);
  }
}
$("workspaceFile").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || busy || drag || guideDrag || penDrag || $("dialog").open) return;
  setBusy(true);
  try {
    if (file.size > PROJECT_MAX_BYTES)
      throw new Error("Workspace exceeds 150 MB");
    const decoded = await decodeWorkspace(JSON.parse(await file.text()));
    captureDocument();
    if (
      openDocuments.some((d) => d.state.documentDirty) &&
      !confirm(
        "Replace the open workspace? Download projects or a workspace backup first to keep current work.",
      )
    )
      return;
    installWorkspace(decoded);
    $("projectSaveStatus").textContent = "Workspace opened: " + file.name;
  } catch (err) {
    alert("Workspace unchanged: " + err.message);
  } finally {
    setBusy(false);
  }
};
async function initialiseRecovery() {
  setBusy(true);
  try {
    const saved = await recoveryStore("get");
    if (saved?.workspace || saved?.project) {
      if (
        confirm(
          "Recover your last Picturesque workspace from " +
            new Date(saved.savedAt).toLocaleString() +
            "? Cancel discards the local recovery copy.",
        )
      ) {
        const source = saved.workspace || {
          format: "picturesque-workspace",
          version: 1,
          active: 0,
          documents: [
            {
              name: saved.name || "Recovered project",
              project: saved.project,
              dirty: true,
              view: {},
            },
          ],
        };
        installWorkspace(await decodeWorkspace(source));
        $("autosaveStatus").textContent = "Workspace recovered";
      } else await recoveryStore("delete");
    }
  } catch (e) {
    $("autosaveStatus").textContent = "Recovery unavailable · save projects";
    $("autosaveStatus").title = e.message;
  } finally {
    setBusy(false);
    autosaveReady = true;
    if (autosaveDirty) scheduleAutosave();
  }
}
