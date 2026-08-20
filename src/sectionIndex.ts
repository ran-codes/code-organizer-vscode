import * as vscode from 'vscode';
import { SectionMatch, findSections } from './utils/findSections';
import { buildChildrenMap } from './utils/sectionTree';

// 1. Cache Entry ----
interface CacheEntry {
  /** The `document.version` this entry was parsed from. */
  version: number;
  /**
   * The `document.languageId` this entry was parsed under. Part of the validity
   * check, not decoration: `findSections` branches on it — markdown/quarto match
   * `# Header` with no `----`, every other language requires one — and switching
   * a file's language mode mutates `languageId` on the *same document object*
   * **without bumping `version`**. Keying on version alone would serve sections
   * parsed under the old grammar forever.
   */
  languageId: string;
  sections: readonly SectionMatch[];
  childrenByParentId: ReadonlyMap<string, readonly SectionMatch[]>;
}

// 2. Section Index ----
/**
 * One parse per (document URI, `document.version`, `document.languageId`),
 * shared by both consumers.
 *
 * The symbol provider and the tree provider each used to call `findSections` on
 * the same text, so every document was parsed twice. They now both read through
 * here. `findSections` is still the single source of truth for what a section is
 * — this is only a memo over it, so a parser change still propagates everywhere
 * at once.
 *
 * **A Map, not a single entry:** split editors alternate between documents, and
 * a one-slot cache would re-parse on every alternation. **Evicted on close:**
 * entries for closed documents would otherwise accumulate for the lifetime of
 * the window. That listener is a memory bound only — correctness across a
 * language switch is carried by `languageId` being part of the key, not by the
 * close event that happens to fire first.
 *
 * `getSections` returns the **cached array itself, not a copy**, typed
 * `readonly` so the compiler holds callers to it. Reference identity is what
 * lets a test prove that no re-parse happened (see `sectionIndex.test.ts`), and
 * it matches `CodeOrganizerTreeDataProvider.getSections()`, which has always
 * handed back its own array.
 */
export class SectionIndex implements vscode.Disposable {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly closeListener: vscode.Disposable;

  constructor() {
    this.closeListener = vscode.workspace.onDidCloseTextDocument(document => {
      this.evict(document.uri);
    });
  }

  getSections(document: vscode.TextDocument): readonly SectionMatch[] {
    return this.entryFor(document).sections;
  }

  getChildrenMap(document: vscode.TextDocument): ReadonlyMap<string, readonly SectionMatch[]> {
    return this.entryFor(document).childrenByParentId;
  }

  /** Drop any cached parse for `uri`. The close listener's only job. */
  evict(uri: vscode.Uri): void {
    this.cache.delete(uri.toString());
  }

  private entryFor(document: vscode.TextDocument): CacheEntry {
    const key = document.uri.toString();
    const cached = this.cache.get(key);
    if (
      cached &&
      cached.version === document.version &&
      cached.languageId === document.languageId
    ) {
      return cached;
    }

    const sections = findSections(document.getText(), document.languageId);
    const entry: CacheEntry = {
      version: document.version,
      languageId: document.languageId,
      sections,
      childrenByParentId: buildChildrenMap(sections)
    };
    this.cache.set(key, entry);
    return entry;
  }

  dispose(): void {
    this.closeListener.dispose();
    this.cache.clear();
  }
}
