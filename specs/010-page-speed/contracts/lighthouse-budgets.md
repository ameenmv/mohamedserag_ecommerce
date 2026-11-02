# Contract: Lighthouse budgets (CI gate)

The CI job **Checks** runs `@lhci/cli autorun --config=lighthouserc.json` against the production build behind `docker/Caddyfile.lighthouse` (`https://localhost:8443`), with the seeded catalogue.

| URL | Assertions (all `error` after this feature) |
|---|---|
| all four | `categories:accessibility` ≥ 1, `cumulative-layout-shift` ≤ 0.1, `errors-in-console` = 0 |
| `https://localhost:8443/` | `categories:performance` ≥ 0.9, `largest-contentful-paint` ≤ 2500, `resource-summary:script:size` ≤ 204800 |
| `https://localhost:8443/c/refrigerators` | `categories:performance` ≥ 0.9, `largest-contentful-paint` ≤ 2500 |
| `https://localhost:8443/p/fresh-cooker-4b-s15` | `categories:performance` ≥ 0.9, `largest-contentful-paint` ≤ 2500 |
| `https://localhost:8443/checkout` | `categories:performance` ≥ 0.9, `largest-contentful-paint` ≤ 2500 |

Settings: `numberOfRuns: 3`, mobile form factor, 375 × 812 @2x, default simulated throttling. Reports are uploaded as the `lighthouse-report` artifact.

**Breaking this contract** (a page misses a budget) fails the PR. The report in the artifact names the URL and the assertion.
