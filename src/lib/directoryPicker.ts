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

export async function readHtmlFilesFromDirectory(
  handle: FileSystemDirectoryHandle
): Promise<Array<{ name: string; content: string }>> {
  const files: Array<{ name: string; content: string }> = [];
  
  // FileSystemDirectoryHandle values() is an async iterator
  for await (const entry of (handle as any).values()) {
    if (entry.kind === "file") {
      const name = entry.name;
      if (name.toLowerCase().endsWith(".html") || name.toLowerCase().endsWith(".htm")) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          files.push({ name, content });
        } catch (err) {
          console.error(`Failed to read file ${name}:`, err);
        }
      }
    }
  }
  
  return files;
}
