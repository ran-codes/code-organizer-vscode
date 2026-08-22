import * as vscode from 'vscode';
import { SectionMatch } from './utils/findSections';
import { childrenOf } from './utils/sectionTree';
import { SectionIndex } from './sectionIndex';

export class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly section: SectionMatch,
    childrenByParentId: ReadonlyMap<string, readonly SectionMatch[]>,
    public readonly document: vscode.TextDocument
  ) {
    const hasChildren = childrenByParentId.has(section.uniqueId);
    super(
      section.name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = section.name;

    // Set icon based on depth
    this.iconPath = new vscode.ThemeIcon(
      section.depth === 1 ? 'symbol-module' :
      section.depth === 2 ? 'symbol-class' :
      section.depth === 3 ? 'symbol-method' : 'symbol-property'
    );

    // Command to jump to section
    this.command = {
      command: 'codeOrganizer.goToSection',
      title: 'Go to Section',
      arguments: [section, document]
    };

    this.contextValue = 'sectionItem';
  }
}

export class CodeOrganizerTreeDataProvider implements vscode.TreeDataProvider<SectionTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SectionTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private sections: readonly SectionMatch[] = [];
  private childrenByParentId: ReadonlyMap<string, readonly SectionMatch[]> = new Map();
  private currentDocument?: vscode.TextDocument;
  private treeItemCache: Map<string, SectionTreeItem> = new Map();

  constructor(private readonly sectionIndex: SectionIndex) { }

  refresh(document: vscode.TextDocument): void {
    this.currentDocument = document;
    this.sections = this.sectionIndex.getSections(document);
    this.childrenByParentId = this.sectionIndex.getChildrenMap(document);
    this.treeItemCache.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SectionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SectionTreeItem): SectionTreeItem[] {
    if (!this.currentDocument) {
      return [];
    }

    if (!element) {
      // Root level - return depth 1 sections
      return this.sections
        .filter(s => s.depth === 1)
        .map(s => this.getOrCreateTreeItem(s));
    } else {
      // Return children of this section
      return childrenOf(this.childrenByParentId, element.section.uniqueId)
        .map(s => this.getOrCreateTreeItem(s));
    }
  }

  getParent(element: SectionTreeItem): SectionTreeItem | undefined {
    const parentSection = this.sections.find(s => s.uniqueId === element.section.parentId);
    if (parentSection) {
      return this.getOrCreateTreeItem(parentSection);
    }
    return undefined;
  }

  private getOrCreateTreeItem(section: SectionMatch): SectionTreeItem {
    const cached = this.treeItemCache.get(section.uniqueId);
    if (cached) {
      return cached;
    }
    const item = new SectionTreeItem(section, this.childrenByParentId, this.currentDocument!);
    this.treeItemCache.set(section.uniqueId, item);
    return item;
  }

  /**
   * The TreeItem for `section`, built and cached now if VS Code has not asked
   * for it yet. Returns `undefined` for anything outside `getSections()` — the
   * snapshot this provider was last refreshed with.
   *
   * **Creating on miss is what makes `reveal()` work at all.** `refresh()` clears
   * the cache and only a later `getChildren()` refills it, so a lookup-only
   * version returned `undefined` on every pass that refreshed (#50). Identity is
   * not at risk: `getOrCreateTreeItem` is the single source of instances, so the
   * item returned here is the same object a later `getChildren()` hands back —
   * which is what `reveal()` compares against by reference.
   *
   * **The snapshot check is what keeps creating-on-miss safe.** `getChildren()`
   * and `getParent()` write to `treeItemCache` too, but only ever with sections
   * they read out of `sections` / `childrenByParentId`. This is the only entry
   * point that would key a write on a section the *caller* supplied — and the
   * cache is keyed on `uniqueId` (`` `${name}_${index}` ``), which is unique only
   * *within* one snapshot. A stale or foreign `SectionMatch` whose id collided
   * with a live one would otherwise cache an item holding that stale section and
   * document in its `command.arguments`, and `getChildren()` would hand the
   * poisoned instance to VS Code — a click then jumps using stale offsets.
   */
  getTreeItemForSection(section: SectionMatch): SectionTreeItem | undefined {
    if (!this.currentDocument) {
      return undefined;
    }
    // Identity, not equality: only a section from the live snapshot may mint a
    // cache entry keyed on its uniqueId.
    if (!this.sections.includes(section)) {
      return undefined;
    }
    return this.getOrCreateTreeItem(section);
  }

  /**
   * The snapshot the visible tree was last built from — the same one
   * `treeItemCache` is keyed against, which is why `cursorSync` resolves the
   * cursor through here rather than querying `SectionIndex` directly.
   */
  getSections(): readonly SectionMatch[] {
    return this.sections;
  }
}
