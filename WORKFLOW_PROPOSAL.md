# Portfolio workflow proposal and installation record

Original source: local `agent-workflow-kit`, branch `feat/agent-customization`, commit `c3dd88985d6240575c8f349a09a6ea68cfb`. Target: `/home/pierre/projets/perso/portfolio_dillard`.

Installed October 7, 2026 after Pierre approved continuation. The isolated dry run ended with `DRY RUN: no target files were written`. Workflow doctor reported zero failures/warnings. This is historical installation evidence, not a fresh source revision claim.

## Selected capabilities

- `tasks`: atomic task/change records through `ants` and `write-task`.
- `memory`: verified reusable decisions through `memory-report`.
- `continuity`: captures, resumption, and handoffs through `project-handoff` and `context-relay`.
- `bugs`: added on October 12 and committed as `70a39ed`; runtime diagnosis, regression checks, and thematic bug ledgers through `bug-triage` and `bug-fix-trace`.

The core also supplies `branch-router`, `project-workflow`, and `workflow-doctor`. `write-a-skill` was retained as a local skill through the documented ownership migration. Claude/Codex mirrors remain local; no global export was enabled.

## Activated rules

Read `.workflow-kit.env`, apply only installed modules, load the smallest useful context, and record actual checks. Branch creation, commits, pushes, merges, and external mutations require authorization. `.claude/skills/` is canonical for managed skills; `.codex/skills/` is the generated mirror.

Resume tasks at their existing locations, otherwise use `tasks/todo/<effort>/`. Record their branches and use `ants`/`write-task` for meaningful changes. Read project memory through its index; raw evidence remains in tasks/bugs. Read branch handoffs only when younger than 14 days, and link unfinished work to its existing effort.

For bugs, triage before diagnosis, confirm hypotheses at runtime, retain a focused regression test where feasible, and write thematic evidence. Source reading alone is not root-cause confirmation.

## Installation boundaries

Installation created the inventory, workflow rules/configuration, agent instructions, local skills/mirrors, kit scripts/hooks, and memory/decision indexes. It did not change application files or export global skills. The original source contract required explicit approval before activating workflow rules; approval followed presentation of this proposal and target. Dry run, installation, doctor, and site-link checks were run.

Exact active module rules are installed under `.workflow/modules/`; `.workflow-kit.json` records ownership/provenance. Preserve editable local policies and follow the kit's installation/update mechanism rather than editing managed outputs.
