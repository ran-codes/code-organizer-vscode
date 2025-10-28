import * as vscode from 'vscode';
import { CodeOrganizerDocumentSymbolProvider } from './documentSymbolProvider';
import { CodeOrganizerTreeDataProvider } from './treeDataProvider';
import { initializeDecorations, updateSectionHighlight, disposeDecorations } from './decorations';
import { SectionMatch } from './utils/findSections';

export function activate(context: vscode.ExtensionContext) {

	// Show activation message
	vscode.window.showInformationMessage('Code Organizer extension activated!');

	// Get configuration
	const config = vscode.workspace.getConfiguration('codeOrganizer');
	const isEnabled = config.get<boolean>('enable', true);
	const supportedLanguages = config.get<string[]>('supportedLanguages', ['*']);


	if (!isEnabled) {
		return;
	}

	// Register document symbol provider (keep for built-in Outline)
	const provider = new CodeOrganizerDocumentSymbolProvider();

	if (supportedLanguages.includes('*')) {
		// Register for all languages
		context.subscriptions.push(
			vscode.languages.registerDocumentSymbolProvider(
				'*',
				provider
			)
		);
	} else {
		// Register for specific languages
		supportedLanguages.forEach(language => {
			context.subscriptions.push(
				vscode.languages.registerDocumentSymbolProvider(
					{ language: language },
					provider
				)
			);
		});
	}

	// Create custom TreeView for enhanced outline with highlighting
	// Use shared TreeDataProvider for both activity bar and explorer views
	const treeDataProvider = new CodeOrganizerTreeDataProvider();

	// Register TreeView in Activity Bar (dedicated tab)
	const treeViewActivity = vscode.window.createTreeView('codeOrganizerOutlineActivity', {
		treeDataProvider: treeDataProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeViewActivity);
	console.log('[Code Organizer] Activity bar TreeView created');

	// Initialize editor decorations
	const decoration = initializeDecorations();
	context.subscriptions.push(decoration);

	// Register "Go to Section" command
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'codeOrganizer.goToSection',
			(section: SectionMatch, document: vscode.TextDocument) => {
				const editor = vscode.window.activeTextEditor;
				if (editor && editor.document === document) {
					const position = document.positionAt(section.index);
					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(
						new vscode.Range(position, position),
						vscode.TextEditorRevealType.InCenter
					);
				}
			}
		)
	);

	// Register "Show Code Organizer" command
	context.subscriptions.push(
		vscode.commands.registerCommand('codeOrganizer.showView', async () => {
			// Use the auto-generated .focus command for our view
			await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
		})
	);

	// Helper function to find current section from cursor position
	function getCurrentSection(
		cursorPos: vscode.Position,
		document: vscode.TextDocument,
		sections: SectionMatch[]
	): SectionMatch | undefined {
		const offset = document.offsetAt(cursorPos);
		let deepestSection: SectionMatch | undefined;

		for (const section of sections) {
			const sectionStart = section.index;
			// Find next section at same or higher level to determine end
			const nextSection = sections.find(
				s => s.index > section.index && s.depth <= section.depth
			);
			const sectionEnd = nextSection ? nextSection.index : document.getText().length;

			if (offset >= sectionStart && offset < sectionEnd) {
				// Found a containing section, keep the deepest one
				if (!deepestSection || section.depth > deepestSection.depth) {
					deepestSection = section;
				}
			}
		}

		return deepestSection;
	}

	// Update highlight function with caching
	let updateTimeout: NodeJS.Timeout | undefined;
	let lastDocument: vscode.TextDocument | undefined;

	async function updateHighlight() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			console.log('[Code Organizer] No active editor');
			return;
		}

		const document = editor.document;

		// Refresh tree if document changed
		if (document !== lastDocument) {
			console.log('[Code Organizer] Refreshing tree for document:', document.fileName);
			treeDataProvider.refresh(document);
			lastDocument = document;
		}

		const cursorPos = editor.selection.active;
		const sections = treeDataProvider.getSections();
		console.log('[Code Organizer] Found', sections.length, 'sections');
		const currentSection = getCurrentSection(cursorPos, document, sections);
		console.log('[Code Organizer] Current section:', currentSection?.name);

		// Update editor decoration
		updateSectionHighlight(currentSection, editor, decoration);

		// Update tree view highlight
		if (currentSection) {
			// Get the cached tree item instance for reveal to work
			const item = treeDataProvider.findTreeItemBySection(currentSection);
			console.log('[Code Organizer] Tree item found:', !!item);
			if (item) {
				try {
					await treeViewActivity.reveal(item, {
						select: true,
						focus: false,
						expand: 1
					});
					console.log('[Code Organizer] Reveal succeeded');
				} catch (error) {
					console.error('[Code Organizer] Reveal failed:', error);
				}
			}
		}
	}

	// Listen for cursor changes (with debouncing)
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(() => {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateTimeout = setTimeout(updateHighlight, 150);
		})
	);

	// Listen for editor switches
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(() => {
			updateHighlight();
		})
	);

	// Clear cache on document changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			if (event.document === lastDocument) {
				lastDocument = undefined;
			}
		})
	);

	// Initial highlight
	if (vscode.window.activeTextEditor) {
		updateHighlight();
	}

	// Register activation command as fallback
	const activateCommand = vscode.commands.registerCommand('codeOrganizer.activate', () => {
		vscode.window.showInformationMessage('Code Organizer is already active and working!');
	});
	context.subscriptions.push(activateCommand);

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('codeOrganizer')) {
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
	// Cleanup decorations
	disposeDecorations();
}