# LD_UI integration review — 30/10/2026

User authorized reviewing all of LD_UI, fixing regressions, merging directly into main and pushing; deployment remains a manual user action. No new branch/PR/project/deployment or cloud configuration change.

## Source and preservation

- Main/base: eaaae00cbd133d297cb5207f09e1bd860e593f0d.
- LD_UI: ec22d805bbf7bb97616978d337d229b7853ab751, full merge-base diff reviewed: 9 text files and 16 image files (8 images in each public root).
- Merge retains both parents, LD_UI history and all teammate images/team/contact information. No force push or deletion of LD_UI.
- Shared online-source has unpublished Frontend work, including local HEAD4241574 and two dirty files. Integration/testing uses a separate checkout; those files/commits are not overwritten or silently included. Future Frontend work must reconcile with the new remote main before pushing.

## Findings fixed

1. **Required — root env regression:** root dev/start stopped loading root .env.local/.env, breaking existing local server configuration. Restored Node env-file flags; retained the teammate's explicit node prefix for the build command. A dummy-process regression test failed before and passes after the fix; no real key used.
2. **Required — focus regression:** invalid form, sample fill, generation success/error lost focus management. Restored focus and use the browser's native nearest scrolling rather than an unconditional animated jump. Result focus is deferred until the verified private DOM has rendered again; tracing showed an immediate focus attempt was ignored while AuthProvider hid that DOM. Scope/late-response guards remain intact.
3. **Required — misleading claims:** replaced fixed 3-second/90–95%-saving/100%-security and Meta/Xem thêm guarantees with the actual 3/3/5 contract, editorial targets and storage/AI data-flow limits. Marked the unverified testimonial as an example; kept provided names/contact/team/photos. The owner should confirm testimonial provenance before presenting it as a real customer endorsement.
4. **Verification repair:** browser harness now accepts an explicit loopback test URL and waits for the history URL before reload. A failure had reloaded /create before client navigation completed, rather than proving lost history. Assertions about preserved data remain unchanged.

## Backend impact

Compared with main, lib/server, auth handlers/core/SSR client, route handlers, proxy, account/login server pages and lockfiles are byte-identical. Four-field request and validated 3/3/5 response, server-only provider/model/key, AUTO candidates, exact Origin/Host guard, timeout/size caps, in-flight guard and safe Vietnamese errors are preserved. No auth logic, callback, cookie/cache policy or cloud env changed. History storage module/identity fence are unchanged; WorkbenchProvider only changes focus timing/intent.

## Fresh verification

- Clean root workspace install: Node24.22.1, npm11.21.1, npm ci --ignore-scripts using committed package-lock; no lock or dependency change. Existing LD_UI Vercel Preview logs separately show pnpm11.25.0 install/build with Root Directory prototype; this is historical preview evidence, not a deployment of the corrected merge.
- **46/46 unit/handler tests**, typecheck and production build pass. Tests cover fake upstream HTTP/429/timeout/JSON/size and all existing auth/server/cache/cookie/Unicode/history cases, plus root env loading and exact image filename case for Linux hosting.
- **17 browser groups pass**, including 35 direct-route/viewport combinations at 320/390/768/1024/1440, refresh, mobile keyboard menu, focus/anchor, fake 3/3/5, 11 actual clipboard copies, regeneration errors preserving old content, history view/delete/reload and blocked/full/corrupt storage.
- **5 auth browser groups pass** using session doubles: guest/A/B isolation, pending cancellation and late response rejection, foreground verification/expiry failure, multiple tabs and back/forward/draft confirmation.
- Red/green checks reproduced missing root env and focus. Inverting the newly added ready-state condition made the focused browser check fail while the fake result still rendered; the source was restored by exact hash, then the check passed.
- Native npm production audit: 0 vulnerabilities. Source/client scans found no credential patterns or forbidden tracked artifacts; public teammate contact data is intentional, unchanged input rather than a secret. Asset paths match exact filesystem case; a native Linux build of the corrected merge has not been run.
- **0 real AI requests and no real Google login** this review. Old live AI/OAuth results are historical only; no inference budget was renewed.

## Manual deployment handoff

Use main's merged commit in the existing project [caption-quang-cao](https://vercel.com/dragons-projects-e23cb252/caption-quang-cao). Verify the source SHA in the Dashboard before deploying. Keep Root Directory prototype / Next.js / Node24 and existing server env/callback configuration.

Both vercel.json files retain git.deploymentEnabled=false; no GitHub Actions deployment workflow exists. This disables Git-triggered deployments according to [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration). No cloud switch was changed to achieve that. This review pushes source only; the owner deploys manually.

Q1/Q3, AI quality across all tones, outside-owner Google accounts, real expiry/revocation and sustained quota remain outside this merge's acceptance. Do not call the app fully accepted for long-term BTC use on the strength of fake tests.
