# Portfolio V2 — React / Next.js

The static V1 remains at the repository root. V2 contains the portfolio, four case studies, a journal, and a local/Preview content editor. Public content and interface labels are in French.

```bash
cd v2
npm ci
npm run dev -- -p 3017
```

Open `http://127.0.0.1:3017/` for the site and `http://127.0.0.1:3017/admin` for the editor. Configure authentication using `.env.example`; follow the [editorial guide](docs/editorial-workflow.md). Save changes explicitly.

Local content lives in `content/site.json`, bundled media in `public/media/`, and local imports in `public/media/uploads/`. The configured Vercel Preview uses GitHub owner authentication, private Blob drafts, explicit publication, and version restoration. Production administration remains disabled. Remote media uploads and typography controls are pending.

Saving, publishing, restoring, and mobile use were confirmed by Pierre. The published title survived the October 13, 2026 redeployment without diagnostic probes. Code was integrated locally into `master`; that does not prove a production release.

`npm run build` builds V2. `npx tsc --noEmit --incremental false` checks types without writing a cache. `node scripts/verify-content-storage.mjs` checks simulated storage behavior and ETag regression cases; it is not real-cloud proof.

See [content evidence](docs/content-evidence.md), [wiki contributions](docs/wiki-contributions-inventory.md), [authentication](docs/connexion-github-preview.md), and [storage/deployment](docs/stockage-et-deploiement.md).
