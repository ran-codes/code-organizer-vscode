import * as vscode from 'vscode';
import { SectionMatch } from './utils/findSections';
import { childrenOf } from './utils/sectionTree';
import { SectionIndex } from './sectionIndex';

/**
 * Whether to draw the depth icon before a section name (#57).
 *
 * Read per refresh rather than cached at activation: the tree is rebuilt from
 * scratch on every refresh, so re-reading here is what lets the setting take
 * effect without a window reload.
 */
export function showIconsEnabled(): boolean {
  return vscode.workspace.getConfiguration('codeOrganizer').get<boolean>('showIcons', true);
}

export class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly section: SectionMatch,
    childrenByParentId: ReadonlyMap<string, readonly SectionMatch[]>,
    public readonly document: vscode.TextDocument,
    showIcons: boolean = true
  ) {
    const hasChildren = childrenByParentId.has(section.uniqueId);
    super(
      section.name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = section.name;

    // Set icon based on depth. Leaving `iconPath` undefined renders the row with
    // no icon at all — there is no "blank" ThemeIcon, so the only way to hide it
    // is to not set it. Only this view is affected; the built-in Outline draws
    // its own icons from the SymbolKind we report and cannot be opted out of.
    if (showIcons) {
      this.iconPath = new vscode.ThemeIcon(
        section.depth === 1 ? 'symbol-module' :
        section.depth === 2 ? 'symbol-class' :
        section.depth === 3 ? 'symbol-method' : 'symbol-property'
      );
    }

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
  private showIcons: boolean = showIconsEnabled();

  constructor(private readonly sectionIndex: SectionIndex) { }

  refresh(document: vscode.TextDocument): void {
    this.currentDocument = document;
    this.sections = this.sectionIndex.getSections(document);
    this.childrenByParentId = this.sectionIndex.getChildrenMap(document);
    this.showIcons = showIconsEnabled();
    this.treeItemCache.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Rebuild the visible tree without changing which document it shows.
   *
   * For settings that apply live. Deliberately not `refresh(activeTextEditor
   * .document)`: the Settings editor is not a `TextEditor`, so `activeTextEditor`
   * is undefined while it has focus — the state a user is in whenever they toggle
   * a setting from the UI — and the refresh would never fire. Nothing recovers
   * later either, since `cursorSync` only refreshes when the document *changes*.
   * Going through the document the tree was already built from is correct whether
   * or not a text editor is active, and can never rebuild against a different one.
   */
  refreshCurrent(): void {
    if (this.currentDocument) {
      this.refresh(this.currentDocument);
    }
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
    const item = new SectionTreeItem(
      section, this.childrenByParentId, this.currentDocument!, this.showIcons
    );
    this.treeItemCache.set(section.uniqueId, item);
    return item;
  }

  findTreeItemBySection(section: SectionMatch): SectionTreeItem | undefined {
    return this.treeItemCache.get(section.uniqueId);
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
