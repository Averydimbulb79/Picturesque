"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
async function runPackagedSmoke({ window, app, root }) {
  try {
    const result = await window.webContents.executeJavaScript(`(async()=>{
      if(typeof require!=='undefined'||!window.picturesqueDesktop)throw new Error('Renderer isolation or preload failed');
      if(VERSION!=='0.4.9')throw new Error('Unexpected editor version');
      checkpoint('Windows smoke vector');addVectorLayer([shapePath('rect',{x:5,y:5,w:60,h:40})],'Windows vector');refresh();
      await saveProject(false);if(documentDirty||!$('projectSaveStatus').textContent.startsWith('Saved:'))throw new Error('Native first save failed');
      const token=nativeProjectTokens.get(activeDocumentId);
      checkpoint('Windows smoke edit');current().vector.paths[0].nodes[0].x=15;refresh();await saveProject(false);
      if(nativeProjectTokens.get(activeDocumentId)!==token)throw new Error('Native overwrite lost binding');
      await saveProject(true);if(nativeProjectTokens.get(activeDocumentId)===token)throw new Error('Save As did not choose a new binding');
      await recoveryStore('put',{savedAt:Date.now(),workspace:workspaceSnapshot()});
      const recovered=await recoveryStore('get');const decoded=await decodeWorkspace(recovered.workspace);
      if(decoded.states[0].layers.length!==2)throw new Error('Desktop recovery lost vector layer');
      return {version:VERSION,layers:layers.length,status:$('projectSaveStatus').textContent};
    })()`);
    const files = (await fs.readdir(root)).filter((name) =>
      name.endsWith(".picturesque"),
    );
    if (files.length !== 2)
      throw new Error("Expected two native project destinations");
    for (const filename of files) {
      const value = JSON.parse(
        await fs.readFile(path.join(root, filename), "utf8"),
      );
      if (value.layers[1].vector.paths[0].nodes[0].x !== 15)
        throw new Error("Native file content mismatch");
    }
    console.log("PACKAGED_WINDOWS_SMOKE_PASS " + JSON.stringify(result));
    app.exit(0);
  } catch (error) {
    console.error("PACKAGED_WINDOWS_SMOKE_FAIL " + error.stack);
    app.exit(1);
  }
}
module.exports = { runPackagedSmoke };
