import * as vscode from 'vscode';
import { SectionMatch } from './utils/findSections';
import { sectionRange } from './utils/vscodeHelpers';

let currentSectionDecoration: vscode.TextEditorDecorationType | undefined;

/**
 * The contributed color this decoration paints its background with.
 *
 * Exported so `package.json`'s `contributes.colors` block and the call below
 * cannot drift apart — renaming one and not the other leaves the decoration
 * asking for a color nobody declares, which resolves to nothing and silently
 * drops the highlight. `decorations.test.ts` pins the two together.
 */
export const CURRENT_SECTION_BACKGROUND = 'codeOrganizer.currentSectionBackground';

export function initializeDecorations(): vscode.TextEditorDecorationType {
  if (!currentSectionDecoration) {
    currentSectionDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      // Our own color id, not a theme's. VS Code composites extension
      // decorations *above* the selection layer, so a whole-line background
      // with no alpha paints over any selection made on this line and the text
      // looks unselectable (#40). `editor.lineHighlightBackground` used to sit
      // here: it is registered with a `null` default, so Dark Modern and Dark+
      // paint nothing and look fine, while Monokai (#3e3d32), Solarized, Abyss
      // and One Dark Pro (#2c313c) all set it fully opaque and broke. Keep this
      // pointed at a color whose alpha we control — see `contributes.colors`.
      backgroundColor: new vscode.ThemeColor(CURRENT_SECTION_BACKGROUND),
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
