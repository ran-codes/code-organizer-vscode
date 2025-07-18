import * as vscode from 'vscode';
import { FriendlyOutlineDocumentSymbolProvider } from './documentSymbolProvider';

export function activate(context: vscode.ExtensionContext) {
	// Get configuration
	const config = vscode.workspace.getConfiguration('friendlyCodeOutlines');
	const isEnabled = config.get<boolean>('enable', true);
	const supportedLanguages = config.get<string[]>('supportedLanguages', ['*']);

	if (!isEnabled) {
		return;
	}

	// Register document symbol provider
	const provider = new FriendlyOutlineDocumentSymbolProvider();

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

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('friendlyCodeOutlines')) {
				vscode.window.showInformationMessage(
					'Friendly Code Outlines configuration changed. Please reload VS Code for changes to take effect.',
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