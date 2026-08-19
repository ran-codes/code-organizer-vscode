import * as vscode from 'vscode';
import { SectionMatch } from './utils/findSections';
import { sectionRange } from './utils/vscodeHelpers';

let currentSectionDecoration: vscode.TextEditorDecorationType | undefined;

export function initializeDecorations(): vscode.TextEditorDecorationType {
  if (!currentSectionDecoration) {
    currentSectionDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      borderColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Left
    });
  }
  return currentSectionDecoration;
}

export function updateSectionHighlight(
  section: SectionMatch | undefined,
  editor: vscode.TextEditor,
  decoration: vscode.TextEditorDecorationType
): void {
  if (!section) {
    editor.setDecorations(decoration, []);
    return;
  }

  const range = sectionRange(section, editor.document);

  const options: vscode.DecorationOptions[] = [{
    range: range,
    hoverMessage: `📍 Current Section: **${section.name}**`
  }];

  editor.setDecorations(decoration, options);
}

export function disposeDecorations(): void {
  currentSectionDecoration?.dispose();
  currentSectionDecoration = undefined;
}
