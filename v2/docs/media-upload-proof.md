# Private media upload proof (task 05, E1)

Status (October 18, 2026): Pierre confirmed one real E1 owner upload with the verified message and SHA-256. Full E1 coverage remains partial. E2 discovery/selection/private delivery is implemented locally; real browser/provider validation is pending.

## Boundary

The Media Library tab supports private upload, paginated discovery and selection on `dev/portfolio-media`. E2 allows verified objects to be selected into saved content, with owner-only previews before publication and visitor access only through currently published visible references. Original-file migration, replacement and automated quota/orphan management remain deferred. E3 adds explicit protected deletion of unused imported objects, as described below. Pierre explicitly authorized this E2 selection slice after confirming the real E1 verified upload; the remaining E1 scenarios are not inferred from that confirmation.

Existing `adminAccessAllowed` checks the GitHub owner and exact origin before preparation, presigned issuance and explicit completion verification. Each ten-minute HMAC ticket is scoped to the store, one server-generated quarantine pathname, declared type and exact size. Blob delegation permits only `put` for that exact path; overwrites, random suffixes and multipart are disabled. Browser bytes go directly to Blob. No read-write credential goes to the browser.

`handleUploadPresigned` verifies provider callbacks with Ed25519 and `BLOB_WEBHOOK_PUBLIC_KEY`, independently of browser sessions. Both the callback and explicit owner completion reread the private object without cache, check declared metadata, actual byte count, file signature and stable storage ETag, and compute SHA-256. The explicit completion response is required before UI success; transfer progress alone is insufficient. Signature checks distinguish AVIF brands from MP4 but are not full media decoding or malware scanning. E2 persists one private verification record per object under `portfolio/media/verified/`, containing its strong storage ETag, actual size/type and SHA-256. New uploads report success only after this record is stored. Legacy E1 files appear as pending verification and can be reverified by the owner without an expired ticket.

## Preview setup (separate external action)

Use the existing private Preview store and a stable media-branch Preview origin. Do not change the Production store or OAuth application. Configure the branch-specific Preview values:

- `ADMIN_MEDIA_PREVIEW=true`, `ADMIN_AUTH_PREVIEW=true`, `ADMIN_CONTENT_PREVIEW=true`.
- Existing complete owner OAuth configuration and `AUTH_URL` matching this exact Preview origin and OAuth callback.
- `BLOB_STORE_ID`, Vercel OIDC access and the store's `BLOB_WEBHOOK_PUBLIC_KEY` for signed callbacks.
- `MEDIA_UPLOAD_MAX_BYTES`: a positive integer chosen after checking the actual plan, remaining capacity and usage alerts. No default limit is assumed. The E1 reread implementation caps this at 33,554,432 bytes (32 MiB), independently of provider quotas.

Without opt-in the media branch remains closed. Production activation is separate and explicit, as described below. Existing content/auth flags remain necessary. No variables or external settings are changed by local implementation.

## Production setup (approved October 18)

Pierre chose to test on the official site after his merge into `master`. Reuse the existing owner OAuth configuration and the separate private `portfolio-storage-production` store; never reconnect the Preview store or change the OAuth callback. Enable `ADMIN_MEDIA_PRODUCTION_ENABLED=true` only for Production. Existing `ADMIN_PRODUCTION_ENABLED=true`, exact production `master`, complete owner authentication, canonical `AUTH_URL`, `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` remain required. Set Production `MEDIA_UPLOAD_MAX_BYTES=8388608` for a conservative 8 MiB test ceiling. The store was observed private, available, Production-only, cdg1, quota-not-exceeded on October 18; this is not proof of future capacity or successful uploads.

On October 18, Pierre explicitly authorized the two Production-only settings above; both were created and their exact values and scope verified. The opt-in and limit take effect only in a deployment containing this activation code. Preparation does not merge or deploy `master`. Disable `ADMIN_MEDIA_PRODUCTION_ENABLED` and redeploy to close imports while keeping content administration available. Existing private quarantine objects are retained; closing imports does not delete data. Real owner upload, provider callback and persistence proof remain task 05 E1. Run the checks below on the official canonical origin when that version is deployed.

## E2 discovery, selection and delivery

`GET /api/admin/media/library` lists quarantine objects in pages of 24 after owner authentication. It exposes stable same-origin `/media/blob/<uuid>.<extension>` references rather than raw private Blob URLs. A file without a current verification record is shown with “Vérifier et rendre disponible”; the owner-only same-origin POST rereads/checks that file and records its verification before selection. No GET performs a write, and no existing file is deleted or moved. Discovery includes files stored during E1.

Successful new imports update the editor's selectable assets immediately and refresh the inventory. The component has refresh/load-more controls and aborts its requests on leaving the tab. Verified files become selectable through existing profile/project/article media dropdowns; additional inventory pages become available after loading them. Saved draft/published references are also included when the editor reloads.

Saving/publishing rejects missing/stale verification records. The delivery route authorizes every request: owner access or an exact reference in the current published profile/visible project/article. References inside hidden projects/articles do not grant public access. Responses are private/no-store even for published media, and unpublishing revokes access on the next request. Native same-origin image requests preserve owner cookies and avoid the public Next image optimizer cache for private drafts. PDF responses download as attachments. HEAD and strict single byte ranges are supported; partial responses must match the upstream Content-Range. Strong storage ETags are checked separately; they are not sent as HTTP If-Match against potentially weak download ETags.

Before integration, run `node scripts/verify-media-library.mjs` for deterministic discovery/reverification, visibility, stale-reference, pagination, HEAD/Range and failure checks. Fake storage is not provider proof. In the real UI, verify old/new imports, selection/save/reload, private preview denial to visitors, explicit publication, unpublication, actual video Range/poster and PDF download. Provider Range, browser UI and redeployment persistence remain unverified until exercised. This selection slice does not complete the full E2 migration acceptance. Pierre reported that discovery/preview/selection works in production; save/reload and all delivery scenarios have not been established by that report.

## Real checks still required

1. Sign in as owner, upload a real PNG/JPEG, and compare returned SHA-256 to the original file. Observe transfer progress followed by successful private reread, not just an issued URL.
2. If configured limits and remaining capacity permit, upload a real allowed file larger than 4.5 MB. Confirm direct browser-to-Blob traffic and provider-side enforcement of exact pathname/type/size, short expiry and overwrite denial.
3. Observe a genuine signed provider callback accepted by the deployed route. Confirm OIDC delegation and public-key configuration work on Vercel; synthetic signatures establish only local verification behavior.
4. Deny visitor/non-owner/foreign-origin requests, invalid format, misleading MIME, empty/oversized files, path substitution, expired/tampered tickets and forged callbacks. Check failures never display success or expose credentials.
5. Cancel during transfer and during reread, navigate away, and retry. Cancellation does not guarantee removal of an already committed object; unverified/quarantine orphans stay private for E3 accounting. No automatic deletion is performed.
6. Fetch the raw private object URL anonymously and require denial. Redeploy and confirm the same object remains readable by an authorized server reread; ten-minute tickets expire, so use controlled authenticated storage access for this persistence check.

Record deployment URL, exact deployed source, date, file sizes/hashes and each observed result in the existing task. Do not publish tokens, signed upload URLs or secrets in evidence.

## Local checks

Run `npx tsc --noEmit --incremental false`, `npm run build`, `node scripts/verify-media-upload.mjs` and `node scripts/verify-media-upload.mjs --production`, `node scripts/verify-content-storage.mjs`, and existing admin guard checks. The media script uses synthetic sessions, signing keys and a fake storage stream. It verifies deterministic restrictions and built-route guards; it does not prove OAuth, provider constraints, uploads or persistence.

References: [Vercel client uploads](https://vercel.com/docs/vercel-blob/client-upload), [Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

## E3 protected deletion (implementation)

Every imported-file tile has a “Supprimer” button with an explicit irreversible-action confirmation. Git-bundled originals are not deletion targets. A file currently selected in this editor's unsaved content disables the button; saved draft, published content (including hidden entries), and every retained version's draft/published references are checked server-side. Direct private Blob references are also recognized. A refusal identifies the current-content or historical reason; history is never removed automatically. Only currently indexed/restorable versions are checked; detached snapshots and offline exports are not treated as restorable history.

`DELETE /api/admin/media/library` requires the owner session, exact browser origin, bounded JSON containing one valid UUID filename and the ETag shown in the inventory. It checks metadata before any reservation. The content repository checks references and reserves the filename in the same conditional content document (`retiredMedia`) used by saves. If another save wins, retirement fails and no file is deleted. If retirement wins, old-revision saves fail and new saves/publishes/restores cannot reference the retired filename. The physical delete is conditional on the object ETag, so a changed object is preserved. Every stage can fail closed without deleting referenced data. Original and snapshot data are preserved on reference/history/CAS errors.

Retirement changes only control metadata and the document revision, not editorial content or history entries. The requesting editor adopts the new revision only if it still has the same previous revision, preserving unsaved changes and real concurrent-edit detection. A failed physical deletion leaves a retired/unselectable file with a retry action; guarded verification and delivery prevent late uploads/callbacks from making that filename usable again. Existing upload URLs can still leave private retired objects during their validity, so retry/orphan maintenance remains relevant.

After the raw object is removed, verification metadata is deleted conditionally as well. If that cleanup fails, the result explicitly reports `cleanupPending`; the UI keeps a retry action and does not claim full cleanup. Refresh can omit an already removed raw object even if its small verification record remains; automated metadata-orphan maintenance is not implemented. A missing verification record for an unverified E1 object is normal and does not prevent deletion. Retrying an already removed, retired file can finish metadata cleanup.

The permanent retirement registry is capped at 1,000 filenames. When full, further deletions are refused with a maintenance message rather than allowing unbounded control-state growth. Do not clear the registry manually without checking upload expiry, active references and recovery guarantees. Existing per-file size display and configured upload limit remain in place; provider usage, quota alerts, export/backup and automatic orphan cleanup still require the remaining E3 work.

Local verification: `node scripts/verify-media-deletion.mjs` covers reference blockers, hidden/history/private-URL references, history/read/write failures, ETag changes, retry/partial cleanup, path/body/session/origin guards, registry bounds and both deterministic save/delete CAS race orders. Existing library/content/upload/admin checks and the build must also pass. These are synthetic checks; no real production object is deleted by this script. Actual Blob conditional-delete behavior, UI confirmation and real concurrent-tab behavior require a separate disposable-file live test after integration, initiated explicitly by the owner.
