
import * as vscode from 'vscode';
import { PythonDocumentSymbolProvider } from './documentSymbolProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Show message when extension loads
	vscode.window.showInformationMessage('v1 LOADED');


	console.log('Congratulations, your extension "python-outline-code-sections" is now active!');

	// Register the document symbol provider for Python files
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
			{ language: 'python' },
			new PythonDocumentSymbolProvider()
		)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('python-outline-code-sections.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('v1 command called');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
