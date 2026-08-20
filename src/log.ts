import * as vscode from 'vscode';

// 1. Output Channel ----
/**
 * The extension's single diagnostic sink: an Output Channel named
 * "Code Organizer", visible to users in the wild under View → Output.
 *
 * Deliberately not `console.log`, which only reaches the Extension Host
 * devtools console and is therefore useless for diagnosing a report from a
 * user who is not running a debug build.
 *
 * Same lifecycle shape as `decorations.ts`: a module-level singleton created by
 * `initializeLog()` during `activate()` and torn down in `deactivate()`.
 */
let outputChannel: vscode.OutputChannel | undefined;

export function initializeLog(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Code Organizer');
  }
  return outputChannel;
}

export function log(message: string): void {
  initializeLog().appendLine(message);
}

export function disposeLog(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
