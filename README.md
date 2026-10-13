# Pierre Dillard — Portfolio

A French-language professional portfolio presenting frontend engineering, real-time monitoring, multimedia tooling, technical documentation, and applied research. It includes GPAC case studies, a journal, and a content editor.

## Project structure

- **V1:** the original static portfolio at the repository root (`index.html`, `styles.css`, `script.js`, and `assets/`).
- **V2:** the React / Next.js application in [`v2/`](v2/), with public pages, GitHub authentication, and private content storage.

## Run locally

### V2 — React / Next.js

Requires Node.js 24 and npm.

```bash
cd v2
npm ci
npm run dev -- -p 3017
```

Open [the portfolio](http://127.0.0.1:3017/) or [the editor](http://127.0.0.1:3017/admin). Configure local authentication using [`v2/.env.example`](v2/.env.example) and the [GitHub authentication guide](v2/docs/connexion-github-preview.md). Keep secrets out of version control.

### V1 — Static site

Open `index.html` directly, or run the following command from the repository root:

```bash
python3 -m http.server 8000
```

Then open [the static portfolio](http://localhost:8000/).

## Content editing and storage

Local editing uses `v2/content/site.json`, with backups in `v2/content/backups/`. Bundled media lives in `v2/public/media/`; local uploads go into `v2/public/media/uploads/`.

The remote editor is enabled only on the configured Vercel Preview for `dev/portfolio-admin-online`. It uses GitHub OAuth to restrict access to the owner and Vercel Blob for private draft, published content, and version history.

- **Save** stores a private draft.
- **Preview** displays the saved draft to the authenticated owner.
- **Publish** makes the saved draft visible on the Preview portfolio.
- **Restore** restores a previous draft; publication remains a separate action.

Conditional writes protect against concurrent changes. Saving, publishing, restoring, and the mobile workflow have been validated on the Preview. The published title also survived a redeployment. Remote administration remains disabled in production; integration into local `master` does not enable it there.

Remote media uploads and migration are the next planned feature. Existing local media remains available.

## Validation

Run these commands from `v2/`:

```bash
npx tsc --noEmit --incremental false
node scripts/verify-content-storage.mjs
npm run build
```

The storage script checks simulated storage behavior, including weak download ETags, strong storage revisions, concurrent writes, publication, and restoration. It does not replace validation against the real service.

## Documentation

- [Editorial workflow](v2/docs/editorial-workflow.md)
- [Storage and deployment](v2/docs/stockage-et-deploiement.md)
- [GitHub Preview authentication](v2/docs/connexion-github-preview.md)
- [Content evidence](v2/docs/content-evidence.md)
- [Wiki contribution inventory](v2/docs/wiki-contributions-inventory.md)

## Sources and visuals

The CV and portrait were supplied by Pierre. The GPAC Monitor screenshots are real captures supplied on October 7, 2026. Agent Workflow Kit and EPR cards in V1 are editorial compositions rather than product screenshots.

The visual direction draws inspiration from [My Design Portfolio 2019–2021](https://www.behance.net/gallery/134108419/My-Design-Portfolio-2019-2021) by Fengrui Wang: large typography and project-based storytelling. No Behance artwork is reproduced.
