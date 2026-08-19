# Fixture for the depth-3 opening case.
#
# This file has no depth-1 section. Both consumers filter roots by depth === 1,
# so "Orphan" is not a root and "Child" is only reachable through it. The
# Outline and the Activity Bar view are therefore both EMPTY.
#
# That is deliberate and documented (src/CLAUDE.md: "Roots are depth === 1, not
# 'no parent'"), not a regression from #47 -- but the symptom is identical to
# that bug, so this fixture keeps the decision visible.

### Orphan ----
VALUE = 1

#### Child ----
NESTED = 2
