# Project context: Pierre Dillard Portfolio

## Purpose

A French-language professional portfolio for recruiters and clients. Present CV, video, monitoring, GPAC, documentation, and research using verifiable facts. Do not describe an exploration as a delivered feature. Publication remains a separate decision.

## Architecture map

The static V1 stays at the root (`index.html`, `styles.css`, `script.js`, `assets/`). The React/Next.js V2 lives in `v2/`: `app/` contains public routes and the editor, `components/` shared rendering, `public/media/` bundled media, and `docs/` editorial guidance and evidence. Local editing uses `content/site.json`; the configured administration Preview uses private Blob draft/published content through `lib/contentStorage.ts` and `lib/renderedContent.ts`.

## Persisted data and external integrations

Local editing writes `content/site.json`, backs up its previous state to `content/backups/`, and imports media to `public/media/uploads/`. Remote content editing uses GitHub owner authentication and private Vercel Blob, enabled on Preview for `dev/portfolio-admin-online`, or explicitly on production `master` with `ADMIN_PRODUCTION_ENABLED=true`, a separate private store and production OAuth configuration. Production remains closed by default. Remote media uploads are not implemented. Conditional writes use storage metadata ETags; do not use weak download ETags as write revisions. Validate in `v2/` with `npx tsc --noEmit --incremental false`, `npm run build`, and relevant scripts; inspect desktop/mobile behavior. GPAC/wiki captures are real sources; the skills diagram is an editorial illustration.

## Documentation maintenance

Keep CLAUDE.md and AGENTS.md synchronized. Write developer documentation and explanatory comments in English; keep public editorial content and interface labels in French.

## Local workflow policy

Read [.workflow/portfolio-workflow.md](.workflow/portfolio-workflow.md) before planning or modifying this project. Apply `branch-router`: one feature per `dev/<feature>` branch, derived from and merged into `master`. Documentation/planning corrections may stay on the current branch; they do not authorize application edits, commits, branch creation, merges, or publication. With no initial commit, prepare the bootstrap first. Keep managed kit files and skill mirrors intact.

<!-- workflow-kit:start -->
Workflow authority: [.workflow/PROJECT_RULES.md](.workflow/PROJECT_RULES.md).
Read `.workflow-kit.env` and installed module rules; load only relevant context.
<!-- workflow-kit:end -->
