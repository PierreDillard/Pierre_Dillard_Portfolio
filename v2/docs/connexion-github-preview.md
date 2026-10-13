# GitHub owner authentication — Preview

The remote editor requires a real owner session and a configured private store. Authentication and persistent saving are separate checks.

## OAuth application

Using the PierreDillard account, open [GitHub OAuth application settings](https://github.com/settings/developers), or [create an application](https://github.com/settings/applications/new).

- Application name: `Portfolio Dillard — Preview`.
- Homepage URL: `https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app`.
- Authorization callback URL: `https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app/api/auth/callback/github`.
- Device Flow is unnecessary for this web flow.

Generate a Client Secret. In Vercel, select `pierre-dillard-portfolio` → Settings → Environment Variables. Restrict the following settings to **Preview**, branch `dev/portfolio-admin-online`:

| Variable | Meaning |
|---|---|
| `AUTH_GITHUB_ID` | OAuth application's Client ID, not the account ID |
| `AUTH_GITHUB_SECRET` | OAuth application's server-side Client Secret |
| `ADMIN_GITHUB_ID` | Authorized account's numeric ID: `110824159` |
| `AUTH_SECRET` | Long random server-side authentication secret |
| `AUTH_URL` | Stable HTTPS Preview origin shown above |
| `ADMIN_AUTH_PREVIEW` | `true` to enable Preview authentication |
| `ADMIN_CONTENT_PREVIEW` | `true` to enable remote editing |
| `BLOB_STORE_ID` | Private store connected to Preview |

Do not publish secrets, paste them into chat, or configure Preview credentials in production. Redeploy after changing environment variables.

## Use the stable origin

Start authentication at [the stable connection page](https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app/admin/connexion). Starting on a deployment-specific hostname while GitHub returns to the stable hostname prevents the temporary cookie from following the same origin. This mismatch was observed in October 12 logs. Stale or blocked cookies can also prevent OAuth checks; the generic `InvalidCheck` message alone does not distinguish these causes.

If Vercel requests Preview authentication, sign in with the Vercel owner account before the GitHub test. A successful GitHub owner connection should allow access to `/admin`. Other accounts must be refused. After signing out, `/api/auth/session` must no longer return the owner session.

## Validation and limits

Pierre confirmed real owner access, sign-out, and refusal of another account during task 04. Saving, publication, restoration, and mobile use were subsequently confirmed. The published title survived the October 13 redeployment.

`npm run build` checks compilation/types. `node scripts/verify-auth-preview.mjs` checks twelve built-server configurations, including default production closure, explicit production activation, wrong branch, disabled flags, missing store/OAuth/origin, and configured Preview authentication. `node scripts/verify-admin-content.mjs --production` also checks owner/visitor/session/origin protections in production mode with synthetic sessions. Its OAuth credentials are fictitious; it does not authenticate a real GitHub user. Missing required configuration closes the application routes with 404.

Sources: [GitHub OAuth applications](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [Auth.js GitHub provider](https://authjs.dev/getting-started/providers/github).
