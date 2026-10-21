"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const MAX_BYTES = 150000000;
const EXTENSIONS = new Map([
  [".picturesque", "project"],
  [".picturesque-workspace", "workspace"],
]);
function checkBytes(value) {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > MAX_BYTES)
    throw new Error("File exceeds the 150 MB limit or contains invalid data.");
  return value;
}
function checkProject(text) {
  checkBytes(text);
  const value = JSON.parse(text);
  if (value.format !== "picturesque" || ![1, 2].includes(value.version))
    throw new Error("Unsupported Picturesque project.");
  return text;
}
async function atomicWrite(filename, bytes) {
  const temporary = path.join(
    path.dirname(filename),
    "." + path.basename(filename) + "." + randomUUID() + ".tmp",
  );
  try {
    const file = await fs.open(temporary, "wx", 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    await fs.rename(temporary, filename);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}
function createFileService({ chooseSave, userData }) {
  const handles = new Map();
  let writeQueue = Promise.resolve();
  function enqueue(fn) {
    const next = writeQueue.then(fn);
    writeQueue = next.catch(() => {});
    return next;
  }
  async function open(filename) {
    const absolute = path.resolve(filename),
      kind = EXTENSIONS.get(path.extname(absolute).toLowerCase());
    if (!kind)
      throw new Error(
        "Only Picturesque project and workspace files can be opened here.",
      );
    const file = await fs.open(absolute, "r");
    let text;
    try {
      if ((await file.stat()).size > MAX_BYTES)
        throw new Error("File exceeds the 150 MB limit.");
      text = checkBytes(await file.readFile("utf8"));
    } finally {
      await file.close();
    }
    const token = randomUUID();
    handles.set(token, absolute);
    return { text, kind, token, name: path.basename(absolute) };
  }
  async function saveProject({ token = null, name, text } = {}) {
    checkProject(text);
    if (token !== null && !handles.has(token))
      throw new Error("Unknown file handle. Use Save As.");
    let filename = token
      ? handles.get(token)
      : await chooseSave({
          name: path.basename(String(name || "Untitled.picturesque")),
          extension: "picturesque",
        });
    if (!filename) return { cancelled: true };
    if (path.extname(filename).toLowerCase() !== ".picturesque")
      filename += ".picturesque";
    await enqueue(() => atomicWrite(filename, text));
    const nextToken = token || randomUUID();
    handles.set(nextToken, filename);
    return {
      cancelled: false,
      token: nextToken,
      name: path.basename(filename),
    };
  }
  async function exportFile({ name, bytes } = {}) {
    if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes))
      throw new Error("Invalid export bytes.");
    if (bytes.byteLength > MAX_BYTES)
      throw new Error("Export exceeds the desktop 150 MB limit.");
    const safeName = path.basename(String(name || "Picturesque.png"));
    const extension = path.extname(safeName).slice(1).toLowerCase();
    if (
      !["png", "jpg", "jpeg", "webp", "svg", "picturesque-workspace"].includes(
        extension,
      )
    )
      throw new Error("Unsupported export format.");
    let filename = await chooseSave({ name: safeName, extension });
    if (!filename) return { cancelled: true };
    if (path.extname(filename).toLowerCase() !== "." + extension)
      filename += "." + extension;
    const buffer =
      bytes instanceof ArrayBuffer
        ? Buffer.from(bytes)
        : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    await enqueue(() => atomicWrite(filename, buffer));
    return { cancelled: false, name: path.basename(filename) };
  }
  async function recovery({ mode, value } = {}) {
    const filename = path.join(userData, "recovery.json");
    if (mode === "get") {
      await writeQueue;
      try {
        const file = await fs.open(filename, "r");
        try {
          if ((await file.stat()).size > MAX_BYTES)
            throw new Error("Recovery exceeds 150 MB");
          return JSON.parse(await file.readFile("utf8"));
        } finally {
          await file.close();
        }
      } catch (e) {
        if (e.code === "ENOENT") return null;
        throw e;
      }
    }
    if (mode === "delete")
      return enqueue(() => fs.rm(filename, { force: true }));
    if (mode !== "put") throw new Error("Invalid recovery action.");
    const text = checkBytes(JSON.stringify(value));
    await fs.mkdir(userData, { recursive: true });
    return enqueue(() => atomicWrite(filename, text));
  }
  return { open, saveProject, exportFile, recovery };
}
module.exports = { MAX_BYTES, atomicWrite, createFileService, checkProject };
