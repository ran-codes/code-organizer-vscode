import * as assert from 'assert';
import * as vscode from 'vscode';
import { CURRENT_SECTION_BACKGROUND } from '../decorations';

// The #40 regression guard. The bug itself is invisible to a unit test — it is
// pixels, and `TextEditorDecorationType` exposes none of its options back to us —
// so this suite pins the two things that *are* checkable and that, together, are
// what actually failed:
//
//   1. `decorations.ts` and `contributes.colors` name the same color id. Rename
//      one and not the other and the decoration asks VS Code for a color nobody
//      declares, which resolves to nothing and silently drops the highlight.
//   2. Our declared defaults are translucent. VS Code composites extension
//      decorations *above* the selection layer, so an opaque whole-line
//      background hides any selection made on that line — which is exactly what
//      `editor.lineHighlightBackground` did here under Monokai, Solarized, Abyss
//      and One Dark Pro.
//
// Neither assertion can catch a theme overriding our id with an opaque color;
// that is the user's call, and `.context/scratch/issue-40-reprex-protocol.md` is
// the manual check for the rendering itself.
suite('Decoration Color Tests (#40)', () => {

	interface ContributedColor {
		id: string;
		description: string;
		defaults: Record<string, string>;
	}

	/**
	 * Read through the extension host rather than `require`-ing package.json, so
	 * this asserts against the manifest VS Code actually loaded.
	 */
	function contributedColors(): ContributedColor[] {
		const extension = vscode.extensions.getExtension('ran-codes.code-organizer');
		assert.ok(extension, 'Extension ran-codes.code-organizer not found in the host');

		return extension.packageJSON?.contributes?.colors ?? [];
	}

	test('package.json declares the color id decorations.ts asks for', () => {
		const ids = contributedColors().map(color => color.id);

		assert.ok(
			ids.includes(CURRENT_SECTION_BACKGROUND),
			`contributes.colors is missing "${CURRENT_SECTION_BACKGROUND}". ` +
			`Declared: ${ids.length ? ids.join(', ') : '(none)'}`
		);
	});

	test('every default is translucent', () => {
		const color = contributedColors().find(c => c.id === CURRENT_SECTION_BACKGROUND);
		assert.ok(color, `No contributed color "${CURRENT_SECTION_BACKGROUND}"`);

		const themes = Object.entries(color.defaults);
		assert.ok(themes.length > 0, 'Contributed color declares no defaults');

		for (const [theme, value] of themes) {
			// #RRGGBBAA only. A 6-digit hex is opaque by definition, and a bare
			// color id would delegate the alpha to whatever that color happens to
			// be — the mistake this whole fix exists to undo.
			assert.match(
				value,
				/^#[0-9a-fA-F]{8}$/,
				`${theme} default "${value}" must be an 8-digit #RRGGBBAA literal`
			);

			const alpha = parseInt(value.slice(7), 16);
			assert.notStrictEqual(
				alpha,
				0xff,
				`${theme} default "${value}" is fully opaque and would paint over the selection`
			);
		}
	});
});
