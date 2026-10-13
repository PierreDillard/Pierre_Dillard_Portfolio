# Portable workflow rules

Read `.workflow-kit.env` and the installed modules below. Apply only their contributions.
Discovering an available module or user-global skill never activates its project behavior.
Use `branch-router` for branch policy and `project-workflow` for non-trivial requests.
Load the smallest relevant context. Record only checks actually run and their limits.
Never create branches, commit, push, merge or mutate external systems without user authorization.
Module-owned skills live under `.claude/skills/`; `.codex/skills/` contains generated mirrors.
Module manifests own behavior; `.workflow-kit.json` records the installed selection and ownership.

## Installed modules

bugs@1.0.0, memory@1.0.0, tasks@1.0.0, continuity@1.0.0

## session-start

<!-- module:memory/main -->
Read `${TASKS_DIR}/PROJECT_MEMORY.md` as an index, then only the relevant theme and branch memory.
`${TASKS_DIR}/DECISIONS.md` indexes durable decisions. Use `memory-report` only for verified reusable
knowledge, with links to original evidence. Memory never requires a task, bug or handoff module.


<!-- module:continuity/main -->
Read the current branch handoff only when less than 14 days old. Before ending unfinished work,
use `project-handoff`; before context saturation use `context-relay`. Link to the existing effort.


## task-validation

<!-- module:bugs/main -->
For bugs, invoke `bug-triage` before diagnosis, then `bug-fix-trace` for runtime evidence, a focused
regression test when feasible and a thematic trace in `${TASKS_DIR}/bugs/`. Do not invent causes.


<!-- module:tasks/main -->
## Task placement
- Resume work at its existing task location. For a new effort, use `${TASKS_DIR}/todo/<effort>/`.
- Record the implementation branch when known; a branch need not exist before planning.
- Existing branch indexes remain valid. Find a resumed task from the user's path, an available
  handoff, branch index or narrowly searched branch metadata; never duplicate the effort.
- Read only its index and selected task. Every meaningful change follows `ants` and `write-task`.

