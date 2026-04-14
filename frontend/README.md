# Frontend Mock

This directory is an exploratory mock frontend for Nomos.

It is not the canonical product.

Use `app/` for:

- the production-facing Next.js app
- live orchestration UI
- API routes
- current Nomos branding and product narrative
- provider onboarding and team-first marketplace flows

Use `frontend/` only for:

- design exploration
- alternate visual experiments
- isolated UI ideas that may later be ported into `app/`

Current caveats:

- built on Next.js 14 / React 18, while `app/` uses Next.js 16 / React 19
- assumes a separate backend rewrite target in `next.config.mjs`
- does not represent the current team-first Nomos product model end to end

If a feature graduates from this mock, port it into `app/` rather than developing both trees in parallel.