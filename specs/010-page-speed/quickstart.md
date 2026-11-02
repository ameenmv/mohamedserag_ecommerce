# Quickstart: verify page speed

## Prerequisites
- Production build: `pnpm build`
- API and web on isolated ports (API 4200, web 3200), as in the repo's e2e notes
- Google Chrome installed (`CHROME_PATH=/usr/bin/google-chrome`), Docker for Caddy

## 1. Serve like production (HTTP/2 + compression)
```bash
sed 's/localhost:3000/localhost:3200/' docker/Caddyfile.lighthouse > /tmp/Caddyfile.lh
docker run -d --rm --name lh-caddy --network host -v /tmp/Caddyfile.lh:/etc/caddy/Caddyfile:ro caddy:2
```

## 2. Measure the four pages (3 runs each, take the median)
```bash
pnpm dlx lighthouse@12.8.2 https://localhost:8443/c/refrigerators --form-factor=mobile \
  --screenEmulation.mobile --screenEmulation.width=375 --screenEmulation.height=812 \
  --screenEmulation.deviceScaleFactor=2 --chrome-flags="--headless=new --ignore-certificate-errors" \
  --output=json --output-path=./lh-cat.json
```
Expected after the fix: performance ≥ 0.9, LCP < 2.5 s, CLS < 0.1, no console errors. Local numbers vary with machine load; CI is the reference.

## 3. Check the first-paint fix directly
In the built CSS, `--font-sans` must not contain `Fallback: Noto Sans`:
```bash
grep -o 'Fallback: Noto Sans' apps/web/.output/public/_nuxt/entry.*.css | wc -l   # expect 0
```

## 4. Nothing else broke
- `pnpm lint && pnpm typecheck && pnpm test`
- Browser suite on the production build, including `csp.e2e.ts`, `accessibility.e2e.ts` and the journeys at `E2E_VIEWPORT=375x812` and `320x640`
- Side-by-side screenshots of the four pages before and after, in Arabic and `/en`, at 375 px and 1280 px: no visible difference

## 5. CI
Open or update the PR: the **Checks** job's Lighthouse step must pass with every assertion at `error` (see [contracts/lighthouse-budgets.md](contracts/lighthouse-budgets.md)).
