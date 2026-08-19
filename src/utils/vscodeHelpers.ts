import * as vscode from 'vscode';
import { SectionMatch } from './findSections';

// 1. Range Helpers ----
/**
 * The full range a section's comment line occupies in `document`.
 *
 * This helper lives in its own module because it imports `vscode`;
 * `findSections.ts` and `sectionTree.ts` stay vscode-free for testability.
 */
export function sectionRange(
  section: SectionMatch,
  document: vscode.TextDocument
): vscode.Range {
  return new vscode.Range(
    document.positionAt(section.index),
    document.positionAt(section.index + section.fullText.length)
  );
}
