/**
 * Read a drag-and-drop (or a file-input pick) into a flat list of files, each
 * carrying the path it should keep once copied into the vault. A dropped folder
 * is walked recursively through the entries API (webkitGetAsEntry), which a
 * native folder picker cannot do without greying out loose files; plain drops
 * and older browsers fall back to the flat file list.
 *
 * Dependency-free and defensive: a missing entries API, or any async read that
 * errors, resolves to skipping that entry rather than throwing, so a partial
 * drop never breaks the attach flow. No filtering happens here (the server does
 * the .git/node_modules/.DS_Store skipping and the caps); this only flattens.
 */

export interface PickedFile {
  file: File;
  /** The file's path relative to the dropped/picked root, e.g. `app/src/app.jsx`. */
  relPath: string;
}

/**
 * The slice of the (non-standard) FileSystemEntry API we touch. Kept structural
 * so it stays dependency-free and so tests can pass plain mock objects.
 */
export interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (onSuccess: (file: File) => void, onError?: (err: unknown) => void) => void;
  createReader?: () => FileSystemDirectoryReaderLike;
}

interface FileSystemDirectoryReaderLike {
  readEntries: (
    onSuccess: (entries: FileSystemEntryLike[]) => void,
    onError?: (err: unknown) => void,
  ) => void;
}

/** Resolve a file entry's File, or null if it has no reader or errors. */
function entryFile(entry: FileSystemEntryLike): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof entry.file !== "function") {
      resolve(null);
      return;
    }
    try {
      entry.file(
        (f) => resolve(f),
        () => resolve(null),
      );
    } catch {
      resolve(null);
    }
  });
}

/** Drain a directory reader: readEntries returns BATCHES, so loop to an empty one. */
function readAllEntries(reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> {
  const all: FileSystemEntryLike[] = [];
  return new Promise((resolve) => {
    const readBatch = () => {
      try {
        reader.readEntries(
          (batch) => {
            if (!batch || batch.length === 0) {
              resolve(all);
              return;
            }
            all.push(...batch);
            readBatch();
          },
          () => resolve(all),
        );
      } catch {
        resolve(all);
      }
    };
    readBatch();
  });
}

/**
 * Walk one drop entry into `out`, building each file's relPath as
 * `dir1/dir2/name`. A file resolves to one PickedFile; a directory recurses over
 * every batch its reader returns. Any missing method or async error skips that
 * entry (and its subtree) rather than throwing.
 */
export async function walkEntry(
  entry: FileSystemEntryLike | null | undefined,
  prefix: string,
  out: PickedFile[],
): Promise<void> {
  if (!entry) return;
  const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await entryFile(entry);
    if (file) out.push({ file, relPath });
    return;
  }
  if (entry.isDirectory && typeof entry.createReader === "function") {
    let reader: FileSystemDirectoryReaderLike;
    try {
      reader = entry.createReader();
    } catch {
      return;
    }
    const children = await readAllEntries(reader);
    for (const child of children) {
      await walkEntry(child, relPath, out);
    }
  }
}

/**
 * Flatten a drop into PickedFiles. Prefer the entries API (it preserves a
 * dropped folder's structure); fall back to the flat FileList when no entry is
 * available (a plain file drop, or a browser without the API).
 */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<PickedFile[]> {
  const out: PickedFile[] = [];
  const entries: FileSystemEntryLike[] = [];
  const items = dt.items;
  if (items) {
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      const entry =
        it && typeof it.webkitGetAsEntry === "function"
          ? (it.webkitGetAsEntry() as unknown as FileSystemEntryLike | null)
          : null;
      if (entry) entries.push(entry);
    }
  }

  if (entries.length > 0) {
    for (const entry of entries) await walkEntry(entry, "", out);
    return out;
  }

  return Array.from(dt.files ?? []).map((f) => ({
    file: f,
    relPath: f.webkitRelativePath || f.name,
  }));
}

/** Map input-picked files (folder picker or loose files) to PickedFiles. */
export function pickedFromInput(list: FileList | null): PickedFile[] {
  return Array.from(list ?? []).map((f) => ({
    file: f,
    relPath: f.webkitRelativePath || f.name,
  }));
}
