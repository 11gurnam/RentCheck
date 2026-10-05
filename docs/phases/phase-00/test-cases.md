# Phase 0 test cases

Run date: 2026-10-05. Data: synthetic environment URL/public/private placeholder strings in unit tests; public static introduction without Supabase env or records. Automated browser runs use production server at 127.0.0.1:3000, Chrome desktop 1440×1000, tablet 768×1024, phone iPhone 13 Chromium emulation 390×844. `npm run check` and `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` (PowerShell env syntax in README).

| ID / name | Method | Prerequisites / steps and inputs | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| F00-01 Valid public config | Vitest | Call parsePublicEnvironment with https URL, nonblank publishable key and synthetic secret unknown field | Parsed public fields only; secret omitted | Public fields only returned | PASS |
| F00-02 Missing config | Vitest | Call with empty object | Validation error | Throws | PASS |
| F00-03 Invalid URL | Vitest | URL=invalid, key=demo | Validation error | Throws | PASS |
| F00-04 Blank key boundary | Vitest | Valid URL, key=two spaces | Validation error | Throws | PASS |
| F00-05 Public access / runtime | Playwright ×3 | No credentials; visit / and inspect title/h1/prototype/caveat, button count, pageerror | Public intro accessible; no unfinished buttons or JS errors | Correct text, zero buttons/errors | PASS |
| F00-06 Responsive boundary | Playwright ×3 | Visit / at documented viewports; compare scrollWidth to innerWidth | No horizontal overflow | No overflow at all three sizes | PASS |
| F00-07 Keyboard and section navigation | Playwright ×3 | Tab to skip, Enter; activate CTA/principles/home | Focused skip; URL anchors and visible target content | Focus, anchors, content match | PASS |
| F00-08 Accessibility scan | Playwright/axe ×3 | Visit /; scan WCAG2A/AA and WCAG2.1A/AA | No detected violations | Zero detected violations | PASS |
| F00-09 Unknown route | Playwright ×3 | Visit /unknown-property | HTTP404 + helpful text | 404 and default Next error text | PASS |
| F00-10 Desktop visual | Manual screenshot inspection | Inspect evidence/desktop.png; typography, hero, cards, footer, labels | Readable consistent unclipped layout | Inspected full page; readable, no clipping | PASS |
| F00-11 Phone visual | Manual screenshot inspection | Inspect evidence/phone.png; stacked hero, navigation/wrapping/trust/footer | Readable mobile layout, all content visible | Inspected full page; readable, no clipping | PASS |
| F00-12 Tablet visual | Manual screenshot inspection | Inspect evidence/tablet.png at 768 width | Columns/wrapping remain usable | Inspected full page; readable, no clipping | PASS |
| F00-13 Clean lockfile install / quality | Automated commands | npm ci; lint; typecheck (route typegen); unit; build | Fresh dependency installation and all checks pass | Clean install, lint, strict types, 4 unit tests and production build all passed; zero install audit vulnerabilities | PASS |
| F00-14 Remote branch / CI | Git + Actions | Commit tested files, push phase branch, compare local SHA with ls-remote; inspect CI | Matching remote final commit and green CI | Local implementation commit e8b50c6; push denied HTTP403 to okruti-rairon; no remote phase branch; remote CI not run | BLOCKED |
| F00-15 Live account identity/authorization/persistence | Future integration | Requires Phase 1 auth/schema/provider config | Sessions and policy tests | Not implemented or executed in Phase 0 | NOT RUN |
| F00-16 Review/claim/moderation/recommendation/merge rules | Future unit/integration/browser | Requires Phases 4–7 workflow/schema | Full mandatory rule suite per specification | Not implemented or executed in Phase 0 | NOT RUN |

No application persistence exists in Phase 0. Configuration exclusion is a parsing test, not proof of database privacy. Public access is intentional; unauthorized backend mutation tests are deferred until there are backend operations. No mocked/live integration equivalence claimed. No destructive reset needed. Generated reports are ignored; committed visual evidence is synthetic public UI only.
