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
			// The auto-generated .focus command for our view.
			await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
		}),

		vscode.commands.registerCommand('codeOrganizer.activate', () => {
			vscode.window.showInformationMessage('Code Organizer is already active and working!');
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
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					treeDataProvider.refresh(editor.document);
				}
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
