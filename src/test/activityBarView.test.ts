import * as assert from 'assert';
import * as vscode from 'vscode';
import { SHOW_CONTAINER_COMMAND } from '../extension';

// The #42 regression guard. What actually broke was a manifest line, not code:
// the view carried `"when": "resourceLangId"`, and VS Code removes a container
// from the Activity Bar entirely when the only view inside it is hidden — so
// with no editor open the button vanished rather than showing an empty pane,
// which reads as a broken install. The clause never filtered by language
// either; any open editor satisfied it, plain text included. Its whole
// real-world effect was the disappearance.
//
// None of that is reachable from a unit test — it is workbench chrome. So this
// suite pins the three manifest facts the fix rests on, each of which is a
// silent failure if it regresses:
//
//   1. The view declares no `when`. Reintroduce one and the button starts
//      vanishing again, in a state no test would otherwise visit.
//   2. A `viewsWelcome` entry covers the view. Without the gate the pane is now
//      always present, so with no file open it renders blank unless something
//      fills it.
//   3. `SHOW_CONTAINER_COMMAND` matches the declared container id. That command
//      id is a string we build by hand from the id in package.json; rename the
//      container and the command silently resolves to nothing, which is the
//      original bug wearing a different hat.
//
// `.context/scratch/issue-42-reprex-protocol.md` holds the manual pass — the
// button being on the rail in a fresh window is only checkable by eye.
suite('Activity Bar View Tests (#42)', () => {

	const CONTAINER_ID = 'codeOrganizer';
	const VIEW_ID = 'codeOrganizerOutlineActivity';

	interface ContributedView {
		id: string;
		name: string;
		when?: string;
	}

	interface ContributedWelcome {
		view: string;
		contents: string;
		when?: string;
	}

	/**
	 * Read through the extension host rather than `require`-ing package.json, so
	 * this asserts against the manifest VS Code actually loaded.
	 */
	function contributes(): Record<string, unknown> {
		const extension = vscode.extensions.getExtension('ran-codes.code-organizer');
		assert.ok(extension, 'Extension ran-codes.code-organizer not found in the host');

		return extension.packageJSON?.contributes ?? {};
	}

	function activityBarViews(): ContributedView[] {
		const views = contributes().views as Record<string, ContributedView[]> | undefined;
		return views?.[CONTAINER_ID] ?? [];
	}

	test('the Activity Bar view declares no "when" clause', () => {
		const views = activityBarViews();
		assert.ok(views.length > 0, `contributes.views declares nothing under "${CONTAINER_ID}"`);

		const view = views.find(v => v.id === VIEW_ID);
		assert.ok(view, `No view "${VIEW_ID}" under container "${CONTAINER_ID}"`);

		assert.strictEqual(
			view.when,
			undefined,
			`View "${VIEW_ID}" declares "when": "${view.when}". A gated view lets VS Code ` +
			'drop the whole container off the Activity Bar when the clause is false (#42).'
		);
	});

	test('every view in the container is ungated', () => {
		// The container disappears when *all* of its views are hidden, so a second
		// gated view added later would reintroduce the bug even with the first one
		// left clean.
		for (const view of activityBarViews()) {
			assert.strictEqual(
				view.when,
				undefined,
				`View "${view.id}" declares "when": "${view.when}"`
			);
		}
	});

	test('a viewsWelcome entry fills the pane when there is nothing to outline', () => {
		const welcomes = (contributes().viewsWelcome ?? []) as ContributedWelcome[];
		const welcome = welcomes.find(w => w.view === VIEW_ID);

		assert.ok(
			welcome,
			`No viewsWelcome entry for "${VIEW_ID}". The view is ungated, so with no file ` +
			'open the pane renders blank without one.'
		);
		assert.ok(
			welcome.contents.trim().length > 0,
			'viewsWelcome entry declares empty contents'
		);
		assert.strictEqual(
			welcome.when,
			undefined,
			`viewsWelcome for "${VIEW_ID}" is itself gated on "${welcome.when}", which ` +
			'reopens the blank-pane case the entry exists to close.'
		);
	});

	test('SHOW_CONTAINER_COMMAND matches the declared container id', () => {
		const containers = contributes().viewsContainers as
			Record<string, { id: string }[]> | undefined;
		const ids = (containers?.activitybar ?? []).map(c => c.id);

		assert.ok(
			ids.includes(CONTAINER_ID),
			`viewsContainers.activitybar is missing "${CONTAINER_ID}". ` +
			`Declared: ${ids.length ? ids.join(', ') : '(none)'}`
		);
		assert.strictEqual(
			SHOW_CONTAINER_COMMAND,
			`workbench.view.extension.${CONTAINER_ID}`,
			'The command extension.ts executes does not address the declared container, ' +
			'so showView and activate would silently open nothing.'
		);
	});
});
