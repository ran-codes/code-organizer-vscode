import * as vscode from 'vscode';
import { SectionMatch, findSections } from './utils/findSections';

export class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly section: SectionMatch,
    private allSections: SectionMatch[],
    public readonly document: vscode.TextDocument
  ) {
    const hasChildren = allSections.some(s => s.parentName === section.uniqueId);
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

  private sections: SectionMatch[] = [];
  private currentDocument?: vscode.TextDocument;
  private treeItemCache: Map<string, SectionTreeItem> = new Map();

  refresh(document: vscode.TextDocument): void {
    this.currentDocument = document;
    this.sections = findSections(document.getText(), document.languageId);
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
      return this.sections
        .filter(s => s.parentName === element.section.uniqueId)
        .map(s => this.getOrCreateTreeItem(s));
    }
  }

  getParent(element: SectionTreeItem): SectionTreeItem | undefined {
    const parentSection = this.sections.find(s => s.uniqueId === element.section.parentName);
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
    const item = new SectionTreeItem(section, this.sections, this.currentDocument!);
    this.treeItemCache.set(section.uniqueId, item);
    return item;
  }

  findTreeItemBySection(section: SectionMatch): SectionTreeItem | undefined {
    return this.treeItemCache.get(section.uniqueId);
  }

  getSections(): SectionMatch[] {
    return this.sections;
  }

  getCurrentDocument(): vscode.TextDocument | undefined {
    return this.currentDocument;
  }
}
