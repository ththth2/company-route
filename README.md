# Company Route

Thai route finder for Innovate AI Co., Ltd., Siam Cement Rd. Bangsue Bangkok 10800.
Nuxt frontend on Vercel, independent Express backend on Render. No database.

## Requirements
- Node.js 22, pnpm 10.
- Google Cloud with billing, Maps JavaScript API, and Routes API enabled.
- Two separate restricted Google keys and a JavaScript map ID for advanced markers.
- Verified company entrance latitude and longitude. The street address is deliberately not turned into an unverified company pin.

## Local setup (PowerShell)
```powershell
git config core.hooksPath .githooks
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
pnpm --dir backend install
pnpm --dir frontend install
pnpm --dir backend dev
# Separate terminal:
pnpm --dir frontend dev
```
Fill only the ignored local env files. Frontend: http://localhost:3000; backend: http://localhost:4000.
The UI shows an unavailable state without configuration and never returns demo route results.
Production geolocation requires HTTPS; localhost works for development.

## No Google API keys in Git
- .env and .env.* are ignored recursively, except .env.example templates with empty values.
- Never put keys in source, tests, documentation, Git remotes or deployment YAML.
- The pre-commit hook scans staged content with `node scripts/check-secrets.mjs --staged`.
- CI scans tracked files for Google key patterns and env files. Hooks can be bypassed; enable provider secret scanning/push protection where available.
- Browser keys are visible in the browser: restrict website referrers and Maps JavaScript API.
- Keep the backend key secret, restricted to Routes API and Render outbound IP ranges when supported.
- Rotate/revoke any leaked key immediately, then clean Git history.
- Use Google API quotas and billing alerts. CORS and per-IP rate limits do not authenticate anonymous clients. The initial service assumes one backend instance; use a shared rate limiter when scaling.

## Render backend
1. Push the repository to your Git provider.
2. Create a Render Blueprint using render.yaml (free Node service, root directory backend).
3. Set GOOGLE_MAPS_API_KEY, COMPANY_LAT, COMPANY_LNG and ALLOWED_ORIGINS in Render.
4. ALLOWED_ORIGINS is the exact Vercel production origin without trailing slash. Multiple origins may be comma-separated. Do not allow arbitrary Vercel subdomains.
5. Verify https://YOUR-SERVICE.onrender.com/api/health and /api/company.

Build: `pnpm install --no-frozen-lockfile && pnpm build`. Start: `pnpm start`. Render provides PORT.
TRUST_PROXY_HOPS=1 matches the configured Render deployment; review when adding proxies.
Free services can sleep while idle, so the browser allows a longer initial connection wait.

## Vercel frontend
1. Import the same repo, choose Root Directory frontend and Framework Nuxt.
2. Set these environment variables before deploying:

| Name | Value |
| --- | --- |
| NUXT_PUBLIC_API_BASE | Render HTTPS service origin |
| NUXT_PUBLIC_GOOGLE_MAPS_API_KEY | Restricted browser key |
| NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID | JavaScript map ID |

3. Deploy and put the resulting exact origin in Render ALLOWED_ORIGINS and Google browser-key restrictions.
4. Redeploy after env changes. Configure Preview environments separately.

Use hosting environment settings. No .env file or actual key belongs in Git.

## Verification
```powershell
pnpm --dir backend test
pnpm --dir backend build
pnpm --dir frontend typecheck
pnpm --dir frontend build
node scripts/check-secrets.mjs
```
The backend fixes the destination and requests a traffic-aware DRIVE route. Omitting Google's departureTime uses the current request time. Results include distance, duration, encoded polyline, calculatedAt and estimatedArrivalAt.
The app does not persist or log coordinates and does not cache route responses. Refresh is manual. Display times use Asia/Bangkok.

Before going live, test real keys and the confirmed entrance: location permission grant/denial, map pins and polyline, distance, duration, refresh, and mobile layout. Review public privacy/terms pages for the organization.

## References
- https://developers.google.com/maps/documentation/routes/compute_route_directions
- https://developers.google.com/maps/api-security-best-practices
- https://vercel.com/docs/frameworks/full-stack/nuxt
- https://render.com/docs/deploy-node-express-app

## Current verification status
Source and deployment configuration prepared. Secret scanner verified against a synthetic key, a safe placeholder and an env file. Dependency installation was blocked by the execution environment (network EACCES); frontend typecheck/build and backend tests have NOT run. No real Google key or confirmed company coordinates have been supplied. No remote repository or live deployment is connected.

First run pnpm install in both folders, commit the resulting lockfiles, then change CI and Render installs to --frozen-lockfile for reproducible deployments. The current --no-frozen-lockfile setting permits that initial installation.
