# Private media upload proof (task 05, E1)

Status (October 18, 2026): local implementation, build and targeted checks passed. Real-service and browser/mobile validation remain pending; E1 is not complete.

## Boundary

The Media Library tab has a separate private-upload proof on `dev/portfolio-media`. It does not select new files into content, expose downloads, publish media, migrate originals or delete objects. E2/E3 depend on a successful real E1 proof.

Existing `adminAccessAllowed` checks the GitHub owner and exact origin before preparation, presigned issuance and explicit completion verification. Each ten-minute HMAC ticket is scoped to the store, one server-generated quarantine pathname, declared type and exact size. Blob delegation permits only `put` for that exact path; overwrites, random suffixes and multipart are disabled. Browser bytes go directly to Blob. No read-write credential goes to the browser.

`handleUploadPresigned` verifies provider callbacks with Ed25519 and `BLOB_WEBHOOK_PUBLIC_KEY`, independently of browser sessions. Both the callback and explicit owner completion reread the private object without cache, check declared metadata, actual byte count, file signature and stable storage ETag, and compute SHA-256. The explicit completion response is required before UI success; transfer progress alone is insufficient. Signature checks distinguish AVIF brands from MP4 but are not full media decoding or malware scanning. There is no persistent verified-media index yet.

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
