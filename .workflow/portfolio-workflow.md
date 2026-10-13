# Local portfolio workflow

This policy supplements the [kit rules](PROJECT_RULES.md) and is loaded through `AGENTS.md` and `CLAUDE.md`. Managed skills are canonical in `.claude/skills/`; `.codex/skills/` contains generated mirrors. This is a local policy, not a source-kit modification or evidence that Git operations occurred.

## Authority and scope

- `.workflow-kit.env` defines `master`, the `flat` strategy, and the `dev/` prefix.
- `branch-router` reads actual Git state and resolves the branch for the intent.
- `project-workflow` selects installed capabilities: tasks, memory, continuity, and bugs.
- Task frontmatter owns target branch/status; the index is derived.
- Pierre's instructions take precedence. His waiver of understanding questions applies to this portfolio; technical checks remain required.
- Only this portfolio and its installed kit are in scope. Source `agent-workflow-kit` changes require a separate effort.

## Routing before changes

1. Read `.workflow-kit.env`, inspect `git status -sb` and `git branch --show-current`, and check HEAD. Read the effort index and selected task.
2. Apply `branch-router`, classifying audit/question, planning, implementation, Git integration, or publication.
3. Before implementation, state task, current/target branch, file scope, dependencies, validation signal, and `dev/<feature> → master` direction.
4. If the branch does not match, stop implementation edits. Resolve authorized creation/switching instead of treating skill reading as sufficient.

## One feature per branch

A `dev/<feature>` branch owns one coherent user outcome. Deployment, persistence, remote administration, media, and typography are distinct features. Task 01 is a tracker, not an implementation branch. Create branches from updated `master` after prerequisites are integrated and validated; dependencies do not authorize stacked branches or feature-to-feature merges.

If dependencies change, check the difference from `master` before claiming validation. Do not reuse evidence for changed content.

## Planning and bootstrap

Authorized task/workflow documentation corrections may stay on the current branch. This exception does not authorize application changes or release actions.

If HEAD is absent, report the missing initial commit, inventory existing state, prepare a concrete bootstrap, and obtain commit authorization. Do not invent source SHAs or target branches, or implement on `master` as a workaround.

`/tasks/` is Git-ignored. Local presence does not show commit membership or branch ownership. Keep effort locations stable and record branch targets in frontmatter. Decide explicitly which evidence can be versioned; never force-add private records.

## Phases and evidence

| Phase | Work | Exit signal |
|---|---|---|
| Scope | Objective, ownership, dependencies, invariants | Independent outcome and observable signals defined |
| Planning | Atomic steps and expected proof | Consistent tasks/index/branches; pending status |
| Implementation | One feature step | Signal observed before expansion |
| Validation | Relevant checks, real UI/services where needed | Dated evidence and limitations; no success inferred from mocks |
| Integration | Dependency/diff/source SHA checks | Authorized merge; revalidate changed results |
| Publication | Deploy integrated SHA and verify URL | Git/Vercel SHA agreement and real behavior/recovery proof |

`implemented` does not mean independently reviewed, integrated, or published. Quality and Deployment modules are not installed; do not impose their gates or claim their results. Task checks remain required. Existing precise authorization remains valid within its scope.

## Workflow maintenance

Keep local policy here and root `AGENTS.md`/`CLAUDE.md` identical. Do not directly edit composed `PROJECT_RULES.md`, noneditable managed files, or inventory hashes to pass checks. Canonical kit/skill changes must use the source/installation mechanism. Generate Codex mirrors through the applicable kit mechanism; locally retained skills require explicit mirror maintenance.

After maintenance, run `.claude/scripts/workflow-doctor.sh` and check task links/branches/dependencies. Doctor validates kit integrity, not runtime behavior or whether routing was followed. Load only relevant context and retain actual limitations in the selected task.

## Branch map

| Task | Branch | Integration |
|---|---|---|
| 02 — Initial deployment | `dev/portfolio-deployment` | Historical prerequisite integrated into master |
| 03 — Persistence | `dev/portfolio-storage` | Integrated at `41e4fc9` |
| 04 — Remote administration | `dev/portfolio-admin-online` | Locally integrated at `70a39ed` |
| 05 — Remote media | `dev/portfolio-media` | Proposed, not created; from master after 04 |
| 06 — Typography | `dev/portfolio-typography` | Proposed, not created; validate online saving with 04 |
| 07 — Final validation/release | Integrated `master` | Separate authorized production release |

Task 07 is validation/release, not another feature. Route discovered defects to their owning feature branch, validate, integrate, and resume release validation. Local integration does not prove a remote push or production deployment.
