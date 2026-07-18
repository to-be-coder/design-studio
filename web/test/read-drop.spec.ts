import { test, expect } from "@playwright/test";
import {
  filesFromDataTransfer,
  pickedFromInput,
  walkEntry,
  type FileSystemEntryLike,
  type PickedFile,
} from "../src/lib/read-drop";

/**
 * Unit coverage for the drop reader, in Node with MOCK FileSystemEntry objects.
 * A real drag gesture cannot be driven in jsdom/Playwright (webkitGetAsEntry has
 * no test harness), so the flatten logic is proven directly here: a nested
 * folder collapses to the right relPaths, and a plain drop falls back to the
 * file list. The components' own e2e (attachments.spec.ts) keeps the picker path
 * covered end to end.
 */

// ── Mock entries ──────────────────────────────────────────────────────────────

function fileEntry(name: string): FileSystemEntryLike {
  return {
    isFile: true,
    isDirectory: false,
    name,
    file: (ok) => ok({ name } as unknown as File),
  };
}

// A directory whose reader hands back `children` in the first batch, then an
// empty batch, mirroring the real chunked readEntries contract.
function dirEntry(name: string, children: FileSystemEntryLike[]): FileSystemEntryLike {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let drained = false;
      return {
        readEntries: (ok) => {
          if (drained) {
            ok([]);
            return;
          }
          drained = true;
          ok(children);
        },
      };
    },
  };
}

function item(entry: FileSystemEntryLike | null) {
  return { webkitGetAsEntry: () => entry };
}

function dataTransfer(over: { items?: unknown[]; files?: unknown[] }): DataTransfer {
  return { items: over.items ?? [], files: over.files ?? [] } as unknown as DataTransfer;
}

const nestedTree = () =>
  dirEntry("app", [
    fileEntry("index.html"),
    dirEntry("src", [fileEntry("app.jsx")]),
    fileEntry("styles.css"),
  ]);

// ── walkEntry ─────────────────────────────────────────────────────────────────

test.describe("walkEntry", () => {
  test("flattens a nested folder to dir-prefixed relPaths", async () => {
    const out: PickedFile[] = [];
    await walkEntry(nestedTree(), "", out);
    expect(out.map((p) => p.relPath).sort()).toEqual([
      "app/index.html",
      "app/src/app.jsx",
      "app/styles.css",
    ]);
  });

  test("carries a prefix into the relPath", async () => {
    const out: PickedFile[] = [];
    await walkEntry(fileEntry("note.txt"), "docs/sub", out);
    expect(out).toEqual([{ file: { name: "note.txt" }, relPath: "docs/sub/note.txt" }]);
  });

  test("a null or undefined entry is a no-op", async () => {
    const out: PickedFile[] = [];
    await walkEntry(null, "", out);
    await walkEntry(undefined, "", out);
    expect(out).toEqual([]);
  });
});

// ── filesFromDataTransfer ─────────────────────────────────────────────────────

test.describe("filesFromDataTransfer", () => {
  test("walks dropped entries into flat relPaths", async () => {
    const picked = await filesFromDataTransfer(dataTransfer({ items: [item(nestedTree())] }));
    expect(picked.map((p) => p.relPath).sort()).toEqual([
      "app/index.html",
      "app/src/app.jsx",
      "app/styles.css",
    ]);
  });

  test("falls back to the flat file list when items yield no entry", async () => {
    const files = [{ name: "a.txt" }, { name: "b.txt", webkitRelativePath: "" }];
    const picked = await filesFromDataTransfer(dataTransfer({ items: [item(null)], files }));
    expect(picked.map((p) => p.relPath)).toEqual(["a.txt", "b.txt"]);
  });

  test("falls back when there are no items at all", async () => {
    const picked = await filesFromDataTransfer(dataTransfer({ files: [{ name: "loose.txt" }] }));
    expect(picked.map((p) => p.relPath)).toEqual(["loose.txt"]);
  });
});

// ── pickedFromInput ───────────────────────────────────────────────────────────

test.describe("pickedFromInput", () => {
  test("keeps a folder file's webkitRelativePath and a loose file's name", () => {
    const list = [
      { name: "index.html", webkitRelativePath: "app/index.html" },
      { name: "loose.txt", webkitRelativePath: "" },
    ] as unknown as FileList;
    expect(pickedFromInput(list).map((p) => p.relPath)).toEqual(["app/index.html", "loose.txt"]);
  });

  test("null maps to an empty list", () => {
    expect(pickedFromInput(null)).toEqual([]);
  });
});
