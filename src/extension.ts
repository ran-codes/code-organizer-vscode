import * as vscode from 'vscode';
import { CodeOrganizerDocumentSymbolProvider } from './documentSymbolProvider';
import { CodeOrganizerTreeDataProvider } from './treeDataProvider';
import { SectionIndex } from './sectionIndex';
import { registerCursorSync } from './cursorSync';
import { initializeDecorations, disposeDecorations } from './decorations';
import { initializeLog, log, disposeLog } from './log';
import { SectionMatch } from './utils/findSections';

/**
 * Settings read once at activation — changing one needs a window reload to take
 * effect. `showIcons` is deliberately not here: it is read per tree refresh, so
 * rebuilding the tree is enough and a reload prompt for a cosmetic toggle would
 * be out of proportion.
 */
const RELOAD_REQUIRED_SETTINGS = ['enable', 'supportedLanguages', 'minDashes', 'maxNestingLevel'];

/**
 * Opens our Activity Bar container. Deliberately the **container**, not the
 * auto-generated `codeOrganizerOutlineActivity.focus` for the view inside it:
 * focusing a view that VS Code is not currently showing is a silent no-op, so
 * the command did nothing in exactly the state a user runs it — when the pane
 * is missing (#42). The container command opens the pane regardless.
 */
export const SHOW_CONTAINER_COMMAND = 'workbench.view.extension.codeOrganizer';

export function activate(context: vscode.ExtensionContext) {

	// 1. Configuration ----
	const config = vscode.workspace.getConfiguration('codeOrganizer');
	if (!config.get<boolean>('enable', true)) {
		return;
	}
	const supportedLanguages = config.get<string[]>('supportedLanguages', ['*']);

	context.subscriptions.push(initializeLog());

	// 2. Shared Parse ----
	// One findSections call per (document URI, version), read by both providers.
	const sectionIndex = new SectionIndex();
	context.subscriptions.push(sectionIndex);

	// 3. Providers ----
	// Feeds the built-in Outline, breadcrumbs, and Go to Symbol.
	const symbolProvider = new CodeOrganizerDocumentSymbolProvider(sectionIndex);
	const selectors: vscode.DocumentSelector[] = supportedLanguages.includes('*')
		? ['*']
		: supportedLanguages.map(language => ({ language }));
	for (const selector of selectors) {
		context.subscriptions.push(
			vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider)
		);
	}

	// Backs the custom Activity Bar TreeView.
	const treeDataProvider = new CodeOrganizerTreeDataProvider(sectionIndex);
	const treeViewActivity = vscode.window.createTreeView('codeOrganizerOutlineActivity', {
		treeDataProvider: treeDataProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeViewActivity);
	log('Activity bar TreeView created');

	const decoration = initializeDecorations();
	context.subscriptions.push(decoration);

	// 4. Commands ----
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'codeOrganizer.goToSection',
			(section: SectionMatch, document: vscode.TextDocument) => {
				const editor = vscode.window.activeTextEditor;
				if (editor && editor.document === document) {
					// An empty range at the section start: centers the line without
					// selecting it. Do not pass the full section range.
					const position = document.positionAt(section.index);
					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(
						new vscode.Range(position, position),
						vscode.TextEditorRevealType.InCenter
					);
				}
			}
		),

		vscode.commands.registerCommand('codeOrganizer.showView', async () => {
			await vscode.commands.executeCommand(SHOW_CONTAINER_COMMAND);
		}),

		// Reveals the pane and reports what we actually see, so a user whose
		// button is missing gets a way back and a real answer. The old version
		// said "already active and working!" unconditionally — it checked
		// nothing, and was the most misleading thing in the #42 transcript.
		vscode.commands.registerCommand('codeOrganizer.activate', async () => {
			await vscode.commands.executeCommand(SHOW_CONTAINER_COMMAND);
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage(
					'Code Organizer is active. Open a code file to see its sections.'
				);
				return;
			}
			const count = sectionIndex.getSections(editor.document).length;
			vscode.window.showInformationMessage(
				count === 1
					? 'Code Organizer is active — 1 section in the current file.'
					: `Code Organizer is active — ${count} sections in the current file.`
			);
		})
	);

	// 5. Cursor Sync ----
	const syncNow = registerCursorSync(context, treeViewActivity, treeDataProvider, decoration);
	if (vscode.window.activeTextEditor) {
		syncNow();
	}

	// 6. Configuration Changes ----
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('codeOrganizer.showIcons')) {
				// Every tree item is rebuilt by refresh(), which re-reads the setting.
				// Goes through the tree's own document, never `activeTextEditor` — that
				// is undefined while the Settings editor has focus, which is exactly
				// where a user toggles this from.
				treeDataProvider.refreshCurrent();
			}

			if (RELOAD_REQUIRED_SETTINGS.some(key => e.affectsConfiguration(`codeOrganizer.${key}`))) {
				vscode.window.showInformationMessage(
					'Code Organizer configuration changed. Please reload VS Code for changes to take effect.',
					'Reload'
				).then(selection => {
					if (selection === 'Reload') {
						vscode.commands.executeCommand('workbench.action.reloadWindow');
					}
				});
			}
		})
	);
}

export function deactivate() {
	disposeDecorations();
	disposeLog();
}
