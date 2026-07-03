const DB_NAME = "IT_Inventario_DB";
const STORE_NAME = "directory_handles";
const KEY = "active_handle";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY);
    request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle) || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove the stored directory handle from IndexedDB.
 * Call this when a handle is detected as invalid/stale (e.g. after a network path
 * becomes unavailable) so the next sync attempt forces the folder-picker dialog.
 */
export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("clearDirectoryHandle: could not clear IndexedDB entry:", err);
  }
}

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  readWrite = false
): Promise<boolean> {
  const options = { mode: readWrite ? ("readwrite" as const) : ("read" as const) };
  try {
    if ((await handle.queryPermission(options)) === "granted") {
      return true;
    }
    if ((await handle.requestPermission(options)) === "granted") {
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to verify/request permission for directory handle:", err);
    return false;
  }
}

/**
 * Checks whether a directory handle truly resolves to an accessible location.
 * `queryPermission` alone does not detect stale UNC-path handles — this function
 * attempts a lightweight iteration to validate the handle is still live.
 */
export async function isHandleAccessible(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    // Attempt one iteration step. If the path no longer exists this throws a
    // DOMException ("file or directory could not be found").
    const iter = (handle as any).values();
    await iter.next();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads all HTML files from a directory handle.
 *
 * Error handling strategy:
 *  - The `for await...of` iterator itself is wrapped in an outer try/catch so
 *    that DOMExceptions thrown by the UNC-path iterator (not just individual
 *    file reads) are surfaced to the caller rather than swallowed silently.
 *  - If the iterator throws the characteristic "file or directory could not be
 *    found" error the function re-throws with a clear, actionable message so
 *    Index.tsx can detect it and clear the stale handle from IndexedDB.
 */
export async function readHtmlFilesFromDirectory(
  handle: FileSystemDirectoryHandle
): Promise<Array<{ name: string; content: string }>> {
  const files: Array<{ name: string; content: string }> = [];

  try {
    // Outer try/catch: catches DOMExceptions from the async iterator itself
    // (e.g. when the UNC path is no longer reachable).
    for await (const entry of (handle as any).values()) {
      if (entry.kind === "file") {
        const name: string = entry.name;
        if (name.toLowerCase().endsWith(".html") || name.toLowerCase().endsWith(".htm")) {
          try {
            const file = await entry.getFile();
            const content = await file.text();
            files.push({ name, content });
          } catch (fileErr) {
            // Single-file error: log and continue with remaining files.
            console.error(`Failed to read file "${name}":`, fileErr);
          }
        }
      }
    }
  } catch (iterErr: unknown) {
    const msg = iterErr instanceof Error ? iterErr.message : String(iterErr);
    // Re-throw with a sentinel prefix so the caller can identify stale handles.
    throw new Error(`STALE_HANDLE: ${msg}`);
  }

  return files;
}
