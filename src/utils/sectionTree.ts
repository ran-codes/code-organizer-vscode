import { SectionMatch } from './findSections';

// 1. Hierarchy Helpers ----
/**
 * Group sections by their parent's `uniqueId`.
 *
 * Children only — sections with no parent are deliberately absent from the map.
 * Root lists stay `depth === 1` filters at the call sites, because
 * `parentId === undefined` does NOT imply root: a file that opens with
 * `### Foo ----` yields a depth-3 section with no parent, and both consumers
 * currently exclude it from the root level.
 *
 * Document order is preserved within each bucket (a single forward pass over
 * the already index-sorted input). Both consumers depend on that ordering.
 *
 * This module is intentionally vscode-free so it stays unit-testable.
 */
export function buildChildrenMap(sections: readonly SectionMatch[]): Map<string, SectionMatch[]> {
  const childrenByParentId = new Map<string, SectionMatch[]>();

  for (const section of sections) {
    if (section.parentId === undefined) {
      continue;
    }
    const siblings = childrenByParentId.get(section.parentId);
    if (siblings) {
      siblings.push(section);
    } else {
      childrenByParentId.set(section.parentId, [section]);
    }
  }

  return childrenByParentId;
}

/** Children of `uniqueId` in document order; empty array when there are none. */
export function childrenOf(
  childrenByParentId: ReadonlyMap<string, readonly SectionMatch[]>,
  uniqueId: string
): readonly SectionMatch[] {
  return childrenByParentId.get(uniqueId) ?? [];
}
