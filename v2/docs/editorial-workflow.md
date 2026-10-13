# V2 editorial workflow

The site and its editor use French interface labels. The action names below describe those controls in English.

## Edit locally

From `v2/`, run `npm ci` once, then `npm run dev -- -p 3017`. Open `http://127.0.0.1:3017/admin`; the public site is at `http://127.0.0.1:3017/`.

To require GitHub authentication, copy `.env.example` to `.env.local`, configure `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and numeric `ADMIN_GITHUB_ID`, then restart. The local OAuth homepage is `http://127.0.0.1:3017`; its callback is `http://127.0.0.1:3017/api/auth/callback/github`. Generate a secret with `openssl rand -base64 32`. `ADMIN_REQUIRE_AUTH=true` closes access if configuration is missing or invalid. Every admin API read/write checks the owner session; writes also require the local origin. Git ignores `.env.local`.

The profile tab edits text, expertise, portrait, and CV. Project/article tabs select, create, and edit entries, sections, links, media, and order. The media tab imports local images, video, and PDF files and displays their paths. Existing assets can be selected directly.

For each of the six homepage headings, enter the complete sentence, select the words to highlight, and apply the selection-color control. Selection can be at the beginning, middle, or end. Removing the highlight preserves the text; deleting the highlighted words also removes their highlight. Legacy split title fields are migrated on load.

New entries begin as drafts. Local entries appear publicly only after their visibility is published and changes are saved. Published projects require at least one media item. Page links show saved content. Development mode reloads saved changes. Move-up/down controls reorder entries; the first published project is featured, and the first published article appears in the journal teaser.

Export JSON downloads the current editor state. Each local save backs up the previous state in `content/backups/`. Active content is `content/site.json`; imports live in `public/media/uploads/`. To restore locally, stop the server, copy the desired backup to `content/site.json`, and restart. These files remain on this computer.

Use accurate captions and alt text for real captures. Identify synthetic illustrations explicitly. Keep metric/contribution evidence in [content-evidence.md](content-evidence.md) and [wiki-contributions-inventory.md](wiki-contributions-inventory.md).

## Edit on Vercel Preview

Remote editing is restricted to Preview on `dev/portfolio-admin-online`, with both Preview flags enabled, server OAuth configuration, and a connected private Blob store. Production keeps administration closed and uses Git content by default. On `master`, `ADMIN_PRODUCTION_ENABLED=true`, a separate private store, and complete production OAuth configuration enable the same owner-only editor and published-content readers. See the production configuration in [the storage guide](stockage-et-deploiement.md).

Use the [stable connection page](https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app/admin/connexion). Sign in as owner, then open the editor.

1. Edit the profile, projects, articles, or their order.
2. Save changes to the **private draft**.
3. Open the saved-draft preview to inspect it.
4. Publish explicitly, confirming the prompt, to copy that draft into the public state of this Preview.
5. Exit draft-preview mode and reload to verify the public version. Entries whose visibility remains draft are excluded.

Saved-draft preview uses the same rendering with a preview cookie. Every read rechecks the owner session; a forged preview cookie is insufficient. Draft entries are included and a banner provides an exit control. The cookie affects tabs sharing this browser profile.

## Versions, conflicts, and recovery

History restoration changes only the draft. Inspect it and publish separately. Export JSON includes currently displayed and unsaved changes. The remote-document export contains draft, published content, revision, and the version index, **not** the snapshot files themselves. Export desired versions separately before removing them.

Only a write using the current storage revision succeeds. If a conflict occurs, export changes, reload, and reapply them. Recovery of an old tab's unsaved state also recovers its old revision and can repeat a conflict. Decline recovery when deliberately starting from the latest saved state.

Storage failure or session expiry must not display success. Reconnect in another tab, then retry. Unsaved edits remain in editor memory and, when available, tab session storage. Closing the tab clears that recovery storage; export regularly.

The referenced history is limited to 50 versions. At the limit, export an old version and explicitly remove it before saving again. Successful document writes are spaced by at least 500 ms; retry after a second if rate-limited. Remote media imports belong to task 05; existing assets remain selectable and local originals are preserved.

## Storage and validation

The private document is `portfolio/content.json`; snapshots are under `portfolio/versions/`. Public pages/metadata are dynamic. Blob content reads bypass cache; admin responses use private/no-store. Conditional writes use metadata ETags from `head`, with checks before/after the content read, rather than weak HTTP download ETags. Reload already-open pages after publication.

If configured storage fails, public rendering fails rather than silently serving an old Git copy or exposing a draft. For recovery outside the editor, export the document and snapshots separately, validate their JSON, and perform a controlled owner restoration. A Vercel code rollback does not restore content.

Pierre confirmed saving, publishing, restoring, and mobile use. The published title survived the October 13, 2026 redeployment after diagnostic removal. These observations do not prove the final production workflow or remote media delivery. V1 remains at the root; the Next.js root is `v2/`.
