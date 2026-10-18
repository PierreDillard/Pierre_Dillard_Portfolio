# Durable storage and deployment

## Current state

Vercel Blob was selected on October 10, 2026. The isolated storage proof was integrated into `master` at `41e4fc9`. Remote content administration was subsequently implemented on `dev/portfolio-admin-online`, validated on Preview, and integrated locally into `master` at `70a39ed` on October 13. No push or production release followed that local integration in this chat.

The owner confirmed saving, publication, restoration, and mobile use. The published title survived Preview redeployment `dpl_Hehqp54CvjQYJJzkEH7PFRd6jHus` without diagnostic probes. These API/file deployments have Git SHA `Unknown`; do not equate them with an integrated Git deployment.

## Preview configuration

Project: `pierre-dillard-portfolio`. Private store: `portfolio-storage-preview`, `store_I4iHU5cmpkJnlTR3`, region `iad1`. The October 10 API check confirmed the store was connected to **Preview only**, after Pierre corrected its scope.

Vercel OIDC provides server/build access to the private store. Do not send credentials to browsers or evidence records. Production must use a separate store; creating it and selecting its region require a separate authorized action.

Remote editing requires the exact `dev/portfolio-admin-online` Preview branch (or the opt-in `dev/portfolio-media` branch with `ADMIN_MEDIA_PREVIEW=true` for the [E1 media proof](media-upload-proof.md)), `ADMIN_AUTH_PREVIEW=true`, `ADMIN_CONTENT_PREVIEW=true`, complete GitHub owner authentication, and `BLOB_STORE_ID`. Local editing continues to use Git content; production administration stays closed unless explicitly configured as described below.

## Content model and conditional writes

`portfolio/content.json` contains separate draft/published states, a revision, and an index of private immutable snapshots under `portfolio/versions/`. Git JSON supplies the initial state before the first remote save; reading does not create a document implicitly. The first save also snapshots that initial state.

Save changes the draft. Publish copies the saved draft into the public state in one conditional write. Restore changes only the draft. Public server readers expose only published content and exclude draft entries. Owner preview rechecks authentication and uses no shared draft cache.

Use the storage ETag returned by metadata `head` for `ifMatch`. Private downloads were observed returning a weak HTTP ETag, which caused false write conflicts. The adapter checks metadata before and after consuming the uncached download and rejects a changed version. Do not strip `W/` to invent a strong validator or bypass conditional writes.

History references are limited to 50 versions. Additional saves require exporting/removing an older version explicitly. Reference removal is conditional, followed by best-effort deletion; failed deletion leaves an orphan without falsely reporting that the successful document update failed.

Snapshots written before a conflict/failure can remain orphaned. The 50-version bound applies to referenced history, not all stored objects. There is no automatic purge. Owner maintenance must follow export and reference checks; monitor actual usage.

## Isolated storage proof — October 10

`npm run build` runs `scripts/verify-storage.mjs` before Next.js. It contacts Blob only when `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=dev/portfolio-storage`, and `STORAGE_PROBE_RUN` is set. Elsewhere it reports skipped.

1. Set `STORAGE_PROBE_RUN=initial` on that Preview branch. The build writes synthetic private JSON to `proof/persistence.json`.
2. Read without cache, attempt two conditional writes with the same revision, and require one winner. A concurrent operation conflict is distinguished from a later stale-ETag precondition failure. Restore the baseline conditionally.
3. Require anonymous access to return 401, 403, or 404.
4. Redeploy with `STORAGE_PROBE_RUN=redeployed` and `STORAGE_PROBE_EXPECT_PREVIOUS_RUN=initial`; require the previous marker before rerunning the proof.

Verified source: `3ee43735b16746b8fdd1d94fba5df6d5a5077e96`.

| Deployment | Run | Observed result |
|---|---|---|
| `dpl_9vzS29VGEyfp3u4DPwmPb7xBcBnM` | initial | READY; one concurrent winner, stale revision refused, private snapshot read/restored, anonymous 403 |
| `dpl_EXJ8ezbjG66itYPggBnbJdk9J9fL` | redeployed | READY; previous initial marker found, same checks passed |

Two earlier diagnostic attempts identified the real conditional-operation conflict; the proof accepts its specific observed form without treating arbitrary errors as concurrency. Proof markers were cleared after validation. A local skipped build is not remote-storage proof. This proof used authenticated build access, not an editor session. At that historical point production was still `791b7c9438584d74e22f59dd529514147428064e`; later integration is recorded above.

## Quotas and recovery

The October 10 pricing review recorded Hobby allowances of 1 GB average monthly storage, 10 GB monthly transfer, 10,000 simple operations, and 2,000 advanced operations, with access suspended on exceeding the plan. These are dated figures, not a current quota promise; check [Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) before planning uploads. Remaining capacity was not established by the synthetic proof.

Export the remote document and individual snapshots before migration. Verify their JSON and media inventories. On failure/quota limits, refuse saving and retain edits; never use Vercel disk as permanent storage or show false success. Existing Git media remains in place until task 05 proves secure uploads and private/public delivery. Blob is the selected service; no additional Supabase database is installed.

For a future migration, verify imported hashes/content, access rules, conflicts, restoration, and reader behavior before switching. Retain the former source until recovery is validated. Supabase remains an alternative if relational needs or Blob limits justify it. A code rollback and content restoration are separate operations.

See the [Blob SDK reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) and [editorial workflow](editorial-workflow.md). Local mocked tests do not prove the remote service. Final production activation and media/typography validation remain tasks 05–07.

## Production activation

Production activation is explicit and restricted to `master`. Configure a separate GitHub OAuth application with homepage `https://pierre-dillard-portfolio.vercel.app` and callback `https://pierre-dillard-portfolio.vercel.app/api/auth/callback/github`. Configure these Vercel variables for **Production only**: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, a new random `AUTH_SECRET`, `ADMIN_GITHUB_ID=110824159`, and `AUTH_URL=https://pierre-dillard-portfolio.vercel.app`. Do not reuse Preview OAuth secrets.

Create a separate private production Blob store and connect it to Production only. Store creation/region selection remains a separately authorized action. Do not reconnect the Preview store. The initial production document is seeded from Git on the first owner save; Preview drafts/history are not migrated automatically. Export and verify any desired published Preview content before an explicitly authorized import.

Only after configuration is complete, set `ADMIN_PRODUCTION_ENABLED=true` for Production and deploy the integrated Git SHA. With the flag disabled, a wrong branch, or no production store, production remote administration stays closed. Incomplete OAuth configuration also refuses authentication. Existing owner-session, origin checks, revision conflicts and private draft controls apply unchanged.

Verify owner sign-in, save/reload, publication, restoration, mobile behavior and persistence after redeployment on the official origin. Built-server tests with synthetic sessions prove access checks, not real GitHub sign-in or production Blob persistence. Disable `ADMIN_PRODUCTION_ENABLED` and redeploy to close administration; this also returns public readers to Git content. Export production content before rollback; code rollback does not restore data.
