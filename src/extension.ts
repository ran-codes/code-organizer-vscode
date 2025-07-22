import * as vscode from 'vscode';
import { CodeOrganizerDocumentSymbolProvider } from './documentSymbolProvider';

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

	// Register document symbol provider
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


	// Register a test command
	const testCommand = vscode.commands.registerCommand('codeOrganizer.test', () => {
		vscode.window.showInformationMessage('Code Organizer is working!');
	});
	context.subscriptions.push(testCommand);

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
	// Cleanup if needed
}